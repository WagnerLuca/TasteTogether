using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace TasteTogether.Api;

public class Event
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = "";
    public string Code { get; set; } = "";
    public string AdminPasswordHash { get; set; } = "";
    public bool ResultsRevealed { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public List<Participant> Participants { get; set; } = [];
    public List<TastingItem> TastingItems { get; set; } = [];
}

public class Participant
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string EventId { get; set; } = "";
    public Event? Event { get; set; }
    public string Username { get; set; } = "";
    public string SessionToken { get; set; } = Guid.NewGuid().ToString();
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    public List<Rating> Ratings { get; set; } = [];
    public List<Comment> Comments { get; set; } = [];
}

public class TastingItem
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string EventId { get; set; } = "";
    public Event? Event { get; set; }
    public string Name { get; set; } = "";
    public double Price { get; set; }
    /// <summary>Tasting order set by the host; ties (items from before ordering existed) fall back to createdAt.</summary>
    public int Position { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public List<Rating> Ratings { get; set; } = [];
    public List<Comment> Comments { get; set; } = [];
}

public class Rating
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string ParticipantId { get; set; } = "";
    public Participant? Participant { get; set; }
    public string TastingItemId { get; set; } = "";
    public TastingItem? TastingItem { get; set; }
    public double Score { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Comment
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string TastingItemId { get; set; } = "";
    public TastingItem? TastingItem { get; set; }
    public string ParticipantId { get; set; } = "";
    public Participant? Participant { get; set; }
    public string Text { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Db(DbContextOptions<Db> options) : DbContext(options)
{
    public DbSet<Event> Events => Set<Event>();
    public DbSet<Participant> Participants => Set<Participant>();
    public DbSet<TastingItem> TastingItems => Set<TastingItem>();
    public DbSet<Rating> Ratings => Set<Rating>();
    public DbSet<Comment> Comments => Set<Comment>();

    // Prisma created the columns as `timestamp(3)` (no time zone) holding UTC.
    protected override void ConfigureConventions(ModelConfigurationBuilder b) =>
        b.Properties<DateTime>().HaveConversion<UtcConverter>().HaveColumnType("timestamp(3)");

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Event>().HasIndex(e => e.Code).IsUnique();
        b.Entity<Participant>().HasIndex(p => p.SessionToken).IsUnique();
        b.Entity<Participant>().HasIndex(p => new { p.EventId, p.Username }).IsUnique();
        b.Entity<Rating>().HasIndex(r => new { r.ParticipantId, r.TastingItemId }).IsUnique();

        // Keep the schema the Prisma backend created: table = class name, columns camelCase.
        // That way an existing database is picked up as-is.
        foreach (var entity in b.Model.GetEntityTypes())
        {
            entity.SetTableName(entity.ClrType.Name);
            foreach (var p in entity.GetProperties())
                p.SetColumnName(char.ToLowerInvariant(p.Name[0]) + p.Name[1..]);
        }
    }

    class UtcConverter() : ValueConverter<DateTime, DateTime>(
        v => DateTime.SpecifyKind(v, DateTimeKind.Unspecified),
        v => DateTime.SpecifyKind(v, DateTimeKind.Utc));
}
