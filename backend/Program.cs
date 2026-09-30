using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using TasteTogether.Api;

var builder = WebApplication.CreateBuilder(args);

var secret = builder.Configuration["Jwt:Secret"];
if (secret is null || secret.Length < 32)
    throw new InvalidOperationException("Jwt:Secret must be set to at least 32 characters (env: Jwt__Secret).");
var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));

builder.Services.AddDbContext<Db>(o => o.UseNpgsql(builder.Configuration.GetConnectionString("Default")));
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o => o.TokenValidationParameters = new()
    {
        ValidateIssuer = false,
        ValidateAudience = false,
        IssuerSigningKey = signingKey,
    });
builder.Services.AddAuthorization();
// Behind nginx every request comes from the proxy, so partition by the client IP it forwards.
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.AddPolicy("login", ctx => RateLimitPartition.GetFixedWindowLimiter(
        ctx.Request.Headers["X-Real-IP"].FirstOrDefault() ?? ctx.Connection.RemoteIpAddress?.ToString() ?? "",
        _ => new() { PermitLimit = 10, Window = TimeSpan.FromMinutes(1) }));
});

var app = builder.Build();
app.UseRateLimiter();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<Db>();
    // No-op on a database that already has tables (e.g. one created by the old Prisma backend).
    await db.Database.EnsureCreatedAsync();
    // Prisma-era databases stored a raw admin token; admins now log in with a password.
    // Those old events get an empty hash, which never verifies.
    await db.Database.ExecuteSqlRawAsync("""
        ALTER TABLE "Event" DROP COLUMN IF EXISTS "adminToken";
        ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "adminPasswordHash" TEXT NOT NULL DEFAULT '';
        ALTER TABLE "TastingItem" ADD COLUMN IF NOT EXISTS "position" INTEGER NOT NULL DEFAULT 0;
        """);
}

var hasher = new PasswordHasher<Event>();

string IssueAdminToken(string code) => new JsonWebTokenHandler().CreateToken(new SecurityTokenDescriptor
{
    Claims = new Dictionary<string, object> { ["event"] = code },
    Expires = DateTime.UtcNow.AddHours(24),
    SigningCredentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256),
});

static bool IsAdmin(ClaimsPrincipal user, string code) => user.FindFirstValue("event") == code;

static IResult Error(int status, string message) => Results.Json(new { error = message }, statusCode: status);

static object EventDto(Event e) => new { e.Id, e.Name, e.Code, e.CreatedAt };

static Task<Participant?> FindParticipant(Db db, HttpRequest req, string code)
{
    var token = req.Headers["X-Session-Token"].ToString();
    return token == ""
        ? Task.FromResult<Participant?>(null)
        : db.Participants.FirstOrDefaultAsync(p => p.SessionToken == token && p.Event!.Code == code);
}

app.MapGet("/health", () => new { status = "ok" });

var events = app.MapGroup("/api/events");

// Create a tasting event. The host picks a password and gets an admin JWT back.
events.MapPost("/", async (CreateEventBody body, Db db) =>
{
    var name = body.Name?.Trim();
    if (string.IsNullOrEmpty(name)) return Error(400, "Event name is required");
    if (body.Password is null || body.Password.Length < 6) return Error(400, "Password must be at least 6 characters");

    string code;
    var attempts = 0;
    do code = RandomNumberGenerator.GetString("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);
    while (await db.Events.AnyAsync(e => e.Code == code) && ++attempts < 10);

    var ev = new Event { Name = name, Code = code };
    ev.AdminPasswordHash = hasher.HashPassword(ev, body.Password);
    db.Events.Add(ev);
    await db.SaveChangesAsync();

    return Results.Json(new { @event = EventDto(ev), token = IssueAdminToken(code) }, statusCode: 201);
});

events.MapPost("/{code}/admin/login", async (string code, LoginBody body, Db db) =>
{
    var ev = await db.Events.FirstOrDefaultAsync(e => e.Code == code);
    if (ev is null) return Error(404, "Event not found");
    if (body.Password is null || hasher.VerifyHashedPassword(ev, ev.AdminPasswordHash, body.Password) == PasswordVerificationResult.Failed)
        return Error(401, "Wrong password");
    return Results.Ok(new { token = IssueAdminToken(code) });
}).RequireRateLimiting("login");

events.MapGet("/{code}", async (string code, Db db) =>
    await db.Events.FirstOrDefaultAsync(e => e.Code == code) is { } ev ? Results.Ok(EventDto(ev)) : Error(404, "Event not found"));

// Live polling endpoint. Admin view is decided by the (optional) bearer token.
events.MapGet("/{code}/status", async (string code, string? sessionToken, ClaimsPrincipal user, Db db) =>
{
    var ev = await db.Events.AsNoTracking().AsSplitQuery()
        .Include(e => e.Participants.OrderBy(p => p.JoinedAt))
        .Include(e => e.TastingItems.OrderBy(i => i.Position).ThenBy(i => i.CreatedAt)).ThenInclude(i => i.Ratings).ThenInclude(r => r.Participant)
        .Include(e => e.TastingItems).ThenInclude(i => i.Comments.OrderBy(c => c.CreatedAt)).ThenInclude(c => c.Participant)
        .FirstOrDefaultAsync(e => e.Code == code);
    if (ev is null) return Error(404, "Event not found");

    var isAdmin = IsAdmin(user, code);
    var me = sessionToken is null ? null : ev.Participants.FirstOrDefault(p => p.SessionToken == sessionToken);
    var active = ev.TastingItems.FirstOrDefault(i => i.IsActive);
    var myRating = me is null ? null : active?.Ratings.FirstOrDefault(r => r.ParticipantId == me.Id);

    return Results.Ok(new
    {
        @event = new { ev.Id, ev.Name, ev.Code, ev.CreatedAt, ev.ResultsRevealed },
        participants = ev.Participants.Select(p => new { p.Id, p.Username, p.JoinedAt }),
        participantCount = ev.Participants.Count,
        activeItem = active is null ? null : new { active.Id, active.Name, active.Price },
        ratingProgress = new { rated = active?.Ratings.Count ?? 0, total = ev.Participants.Count },
        items = ev.TastingItems.Select(i => new
        {
            i.Id,
            i.Name,
            i.Price,
            i.Position,
            i.IsActive,
            i.CreatedAt,
            ratingsCount = i.Ratings.Count,
            avgScore = i.Ratings.Count == 0 ? (double?)null
                : Math.Round(i.Ratings.Average(r => r.Score), 1, MidpointRounding.AwayFromZero),
            comments = i.Comments.Select(c => new { c.Id, c.Text, c.CreatedAt, c.Participant!.Username }),
            ratings = isAdmin ? i.Ratings.Select(r => new { r.Participant!.Username, r.Score }) : null,
        }),
        // null when no session token was sent; false when it was but isn't known (e.g. removed by the host).
        sessionRecognized = sessionToken is null ? (bool?)null : me is not null,
        hasRatedActiveItem = myRating is not null,
        myRatingForActiveItem = myRating?.Score,
    });
});

events.MapPost("/{code}/join", async (string code, JoinBody body, Db db) =>
{
    var username = body.Username?.Trim();
    if (string.IsNullOrEmpty(username)) return Error(400, "Username is required");
    var ev = await db.Events.FirstOrDefaultAsync(e => e.Code == code);
    if (ev is null) return Error(404, "Event not found");

    var p = new Participant { EventId = ev.Id, Username = username };
    db.Participants.Add(p);
    try { await db.SaveChangesAsync(); }
    catch (DbUpdateException) { return Error(409, "Username already taken in this event"); }

    return Results.Json(new { participant = new { p.Id, p.Username, p.JoinedAt }, p.SessionToken }, statusCode: 201);
});

// ── Admin (JWT scoped to the event code) ──────────────────────────────────────
var admin = events.MapGroup("/{code}")
    .RequireAuthorization()
    .AddEndpointFilter(async (ctx, next) =>
        IsAdmin(ctx.HttpContext.User, (string)ctx.HttpContext.Request.RouteValues["code"]!)
            ? await next(ctx)
            : Error(403, "Not an admin of this event"));

admin.MapPost("/items", async (string code, ItemBody body, Db db) =>
{
    var name = body.Name?.Trim();
    if (string.IsNullOrEmpty(name)) return Error(400, "Item name is required");
    if (body.Price is not >= 0) return Error(400, "Price must be a non-negative number");
    var ev = await db.Events.FirstOrDefaultAsync(e => e.Code == code);
    if (ev is null) return Error(404, "Event not found");

    var last = await db.TastingItems.Where(i => i.EventId == ev.Id).MaxAsync(i => (int?)i.Position) ?? -1;
    var item = new TastingItem { EventId = ev.Id, Name = name, Price = body.Price.Value, Position = last + 1 };
    db.TastingItems.Add(item);
    await db.SaveChangesAsync();
    return Results.Json(new { item.Id, item.EventId, item.Name, item.Price, item.Position, item.IsActive, item.CreatedAt }, statusCode: 201);
});

// Set the tasting order: every item of the event, exactly once, first to last.
admin.MapPut("/items/order", async (string code, OrderBody body, Db db) =>
{
    var items = await db.TastingItems.Where(i => i.Event!.Code == code).ToListAsync();
    var ids = body.ItemIds ?? [];
    if (ids.Length != items.Count || ids.Distinct().Count() != ids.Length || ids.Any(id => items.All(i => i.Id != id)))
        return Error(400, "itemIds must list every item of the event exactly once");
    foreach (var item in items) item.Position = Array.IndexOf(ids, item.Id);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

admin.MapPatch("/active-item", async (string code, ActiveItemBody body, Db db) =>
{
    var ev = await db.Events.FirstOrDefaultAsync(e => e.Code == code);
    if (ev is null) return Error(404, "Event not found");
    var item = body.ItemId is null ? null : await db.TastingItems.FirstOrDefaultAsync(i => i.Id == body.ItemId && i.EventId == ev.Id);
    if (body.ItemId is not null && item is null) return Error(404, "Item not found");

    await db.TastingItems.Where(i => i.EventId == ev.Id).ExecuteUpdateAsync(s => s.SetProperty(i => i.IsActive, false));
    if (item is null) return Results.Ok(new { message = "Active item cleared" });

    item.IsActive = true;
    ev.ResultsRevealed = false; // starting a tasting resumes the event — hide revealed results
    await db.SaveChangesAsync();
    return Results.Ok(new { item.Id, item.EventId, item.Name, item.Price, item.IsActive, item.CreatedAt });
});

// Their ratings and comments go with them (ON DELETE CASCADE). They can rejoin under any name.
admin.MapDelete("/participants/{participantId}", async (string code, string participantId, Db db) =>
    await db.Participants.Where(p => p.Id == participantId && p.Event!.Code == code).ExecuteDeleteAsync() == 0
        ? Error(404, "Participant not found")
        : Results.NoContent());

// Revealing the results ends the tasting: the active item is cleared.
admin.MapPatch("/results", async (string code, ResultsBody body, Db db) =>
{
    if (body.Revealed is not { } revealed) return Error(400, "revealed must be a boolean");
    var ev = await db.Events.FirstOrDefaultAsync(e => e.Code == code);
    if (ev is null) return Error(404, "Event not found");

    if (revealed)
        await db.TastingItems.Where(i => i.EventId == ev.Id).ExecuteUpdateAsync(s => s.SetProperty(i => i.IsActive, false));
    ev.ResultsRevealed = revealed;
    await db.SaveChangesAsync();
    return Results.Ok(new { resultsRevealed = revealed });
});

// ── Participant (X-Session-Token, unchanged) ──────────────────────────────────
events.MapPost("/{code}/items/{itemId}/rate", async (string code, string itemId, RateBody body, HttpRequest req, Db db) =>
{
    var me = await FindParticipant(db, req, code);
    if (me is null) return Error(401, "Valid session token required");
    // 0.5–10 in half-star steps.
    if (body.Score is not { } score || score < 0.5 || score > 10 || score * 2 != Math.Floor(score * 2))
        return Error(400, "Score must be a multiple of 0.5 between 0.5 and 10");
    if (!await db.TastingItems.AnyAsync(i => i.Id == itemId && i.EventId == me.EventId)) return Error(404, "Item not found");

    // ponytail: read-then-write upsert; a double-tap race hits the unique index and 500s — ON CONFLICT if that shows up.
    var rating = await db.Ratings.FirstOrDefaultAsync(r => r.ParticipantId == me.Id && r.TastingItemId == itemId);
    if (rating is null) db.Ratings.Add(rating = new Rating { ParticipantId = me.Id, TastingItemId = itemId });
    rating.Score = score;
    await db.SaveChangesAsync();
    return Results.Ok(new { rating.Id, rating.ParticipantId, rating.TastingItemId, rating.Score, rating.CreatedAt });
});

events.MapPost("/{code}/items/{itemId}/comments", async (string code, string itemId, CommentBody body, HttpRequest req, Db db) =>
{
    var me = await FindParticipant(db, req, code);
    if (me is null) return Error(401, "Valid session token required");
    var text = body.Text?.Trim();
    if (string.IsNullOrEmpty(text)) return Error(400, "Comment text is required");
    if (!await db.TastingItems.AnyAsync(i => i.Id == itemId && i.EventId == me.EventId)) return Error(404, "Item not found");

    var comment = new Comment { TastingItemId = itemId, ParticipantId = me.Id, Text = text };
    db.Comments.Add(comment);
    await db.SaveChangesAsync();
    return Results.Json(new { comment.Id, comment.Text, comment.CreatedAt, me.Username }, statusCode: 201);
});

app.Run();

record CreateEventBody(string? Name, string? Password);
record LoginBody(string? Password);
record JoinBody(string? Username);
record ItemBody(string? Name, double? Price);
record ActiveItemBody(string? ItemId);
record OrderBody(string[]? ItemIds);
record ResultsBody(bool? Revealed);
record RateBody(double? Score);
record CommentBody(string? Text);
