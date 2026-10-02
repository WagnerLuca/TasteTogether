// End-to-end check of the API against a running backend: every endpoint, plus the
// auth boundaries (admin JWT scoped to one event, participant session token).
//   node smoke-test.mjs [base-url]      default http://localhost:3001
// Throws on the first failed check. Creates two throwaway events.
import assert from 'node:assert/strict';

const B = `${process.argv[2] ?? 'http://localhost:3001'}/api/events`;

async function req(method, path, body, headers = {}) {
  const res = await fetch(B + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body && JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
}
async function expect(status, what, ...args) {
  const r = await req(...args);
  assert.equal(r.status, status, `${what}: ${JSON.stringify(r.data)}`);
  return r.data;
}

await expect(400, 'short password rejected', 'POST', '/', { name: 'Wein', password: '123' });
const created = await expect(201, 'create event', 'POST', '/', { name: 'Wein', password: 'geheim1' });
const code = created.event.code;
const admin = { Authorization: `Bearer ${created.token}` };
const other = (await expect(201, 'create 2nd', 'POST', '/', { name: 'Other', password: 'geheim2' })).event.code;

await expect(200, 'metadata', 'GET', `/${code}`);
await expect(404, 'unknown event', 'GET', '/ZZZZZZ');
await expect(401, 'wrong password', 'POST', `/${code}/admin/login`, { password: 'falsch' });
const login = await expect(200, 'login', 'POST', `/${code}/admin/login`, { password: 'geheim1' });
assert.ok(login.token);

await expect(401, 'add item without token', 'POST', `/${code}/items`, { name: 'x', price: 1 });
await expect(401, 'forged token', 'POST', `/${code}/items`, { name: 'x', price: 1 }, { Authorization: 'Bearer abc.def.ghi' });
await expect(403, 'token for another event', 'POST', `/${other}/items`, { name: 'x', price: 1 }, admin);
await expect(400, 'negative price', 'POST', `/${code}/items`, { name: 'Riesling', price: -1 }, admin);
const item = (await expect(201, 'add item', 'POST', `/${code}/items`, { name: 'Riesling', price: 12.5 }, admin)).id;

const { sessionToken } = await expect(201, 'join', 'POST', `/${code}/join`, { username: 'Anna' });
const anna = { 'X-Session-Token': sessionToken };
await expect(409, 'duplicate name', 'POST', `/${code}/join`, { username: 'Anna' });
await expect(201, 'join 2nd', 'POST', `/${code}/join`, { username: 'Ben' });

await expect(404, 'activate unknown item', 'PATCH', `/${code}/active-item`, { itemId: 'nope' }, admin);
await expect(200, 'activate', 'PATCH', `/${code}/active-item`, { itemId: item }, admin);

await expect(401, 'rate without session', 'POST', `/${code}/items/${item}/rate`, { score: 7.5 });
await expect(400, 'non-half score', 'POST', `/${code}/items/${item}/rate`, { score: 7.3 }, anna);
await expect(400, 'score > 10', 'POST', `/${code}/items/${item}/rate`, { score: 10.5 }, anna);
await expect(200, 'rate', 'POST', `/${code}/items/${item}/rate`, { score: 6 }, anna);
await expect(200, 're-rate (upsert)', 'POST', `/${code}/items/${item}/rate`, { score: 7.5 }, anna);
await expect(401, 'session for another event', 'POST', `/${other}/items/${item}/rate`, { score: 5 }, anna);
const comment = await expect(201, 'comment', 'POST', `/${code}/items/${item}/comments`, { text: ' Fruchtig ' }, anna);
assert.equal(comment.username, 'Anna');

let s = await expect(200, 'status as participant', 'GET', `/${code}/status?sessionToken=${sessionToken}`);
assert.equal(s.hasRatedActiveItem, true);
assert.equal(s.sessionRecognized, true);
assert.equal(s.myRatingForActiveItem, 7.5);
assert.deepEqual(s.ratingProgress, { rated: 1, total: 2 });
assert.equal(s.items[0].avgScore, 7.5);
assert.equal(s.items[0].ratingsCount, 1);
assert.equal(s.items[0].ratings, null, 'participants must not see individual ratings');
assert.equal(s.items[0].comments[0].text, 'Fruchtig');
assert.ok(s.event.createdAt.endsWith('Z'), 'timestamps are UTC');

s = await expect(200, 'status as admin', 'GET', `/${code}/status`, undefined, admin);
assert.deepEqual(s.items[0].ratings, [{ username: 'Anna', score: 7.5 }]);

assert.equal(s.sessionRecognized, null, 'no session sent');

// Removing a participant: host only, drops their rating, invalidates their session.
const ben = (await req('GET', `/${code}/status`, undefined, admin)).data.participants.find((p) => p.username === 'Ben');
const annaId = s.participants.find((p) => p.username === 'Anna').id;
await expect(401, 'remove without token', 'DELETE', `/${code}/participants/${ben.id}`);
await expect(403, 'remove with foreign token', 'DELETE', `/${other}/participants/${ben.id}`, undefined, admin);
await expect(404, 'remove unknown', 'DELETE', `/${code}/participants/nope`, undefined, admin);
await expect(204, 'remove Anna', 'DELETE', `/${code}/participants/${annaId}`, undefined, admin);
s = await expect(200, 'status after removal', 'GET', `/${code}/status?sessionToken=${sessionToken}`);
assert.equal(s.sessionRecognized, false, 'removed participant is told');
assert.deepEqual(s.participants.map((p) => p.username), ['Ben']);
assert.equal(s.items[0].ratingsCount, 0, 'their rating is gone');
assert.equal(s.items[0].comments.length, 0, 'their comments are gone');
await expect(401, 'removed participant cannot rate', 'POST', `/${code}/items/${item}/rate`, { score: 5 }, anna);
await expect(201, 'rejoin under the same name', 'POST', `/${code}/join`, { username: 'Anna' });

// Tasting order: new items append; the host can reorder the whole list.
const second = (await expect(201, 'add 2nd item', 'POST', `/${code}/items`, { name: 'Silvaner', price: 9 }, admin)).id;
assert.equal((await req('GET', `/${code}/status`)).data.items.map((i) => i.id).join(), [item, second].join());
await expect(400, 'order missing an item', 'PUT', `/${code}/items/order`, { itemIds: [second] }, admin);
await expect(400, 'order with duplicate', 'PUT', `/${code}/items/order`, { itemIds: [second, second] }, admin);
await expect(401, 'order without token', 'PUT', `/${code}/items/order`, { itemIds: [second, item] });
await expect(204, 'reorder', 'PUT', `/${code}/items/order`, { itemIds: [second, item] }, admin);
s = (await req('GET', `/${code}/status`)).data;
assert.deepEqual(s.items.map((i) => [i.id, i.position]), [[second, 0], [item, 1]]);

await expect(200, 'reveal', 'PATCH', `/${code}/results`, { revealed: true }, admin);
s = await expect(200, 'status after reveal', 'GET', `/${code}/status`);
assert.equal(s.event.resultsRevealed, true);
assert.equal(s.activeItem, null, 'revealing ends the tasting');
await expect(200, 'reactivate', 'PATCH', `/${code}/active-item`, { itemId: item }, admin);
s = await expect(200, 'status after reactivate', 'GET', `/${code}/status`);
assert.equal(s.event.resultsRevealed, false, 'activating hides results again');

// ── WL Konto (optional): KONTO_URL=http://localhost:5181 MAILPIT_URL=http://localhost:8026 ──
// Signs a real Konto user up, runs the code flow with PKCE, and checks ownership end to end.
if (process.env.KONTO_URL) {
  const { createHash, createHmac, randomBytes } = await import('node:crypto');
  const KONTO = process.env.KONTO_URL;
  const MAILPIT = process.env.MAILPIT_URL ?? 'http://localhost:8026';

  async function kontoUser(name) {
    const email = `tt-${randomBytes(4).toString('hex')}@konto.local`;
    const jar = new Map();
    const call = async (path, init = {}) => {
      const res = await fetch(KONTO + path, {
        ...init,
        redirect: 'manual',
        headers: { 'X-Konto': '1', 'Content-Type': 'application/json', Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; '), ...init.headers },
      });
      for (const c of res.headers.getSetCookie()) { const [kv] = c.split(';'); const i = kv.indexOf('='); jar.set(kv.slice(0, i), kv.slice(i + 1)); }
      return res;
    };
    await call('/api/flows/signup/start', { method: 'POST', body: '{}' });
    await call('/api/flows/signup', { method: 'POST', body: JSON.stringify({ email, displayName: name, password: 'Gelbe Giraffen tanzen leise q7Rz' }) });
    let code;
    for (let i = 0; i < 20 && !code; i++) {
      const found = await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`)).json();
      code = found.messages?.map((m) => m.Subject.match(/\d{6}/)?.[0]).find(Boolean);
      if (!code) await new Promise((r) => setTimeout(r, 200));
    }
    assert.ok((await (await call('/api/flows/signup', { method: 'POST', body: JSON.stringify({ code }) })).json()).done, 'konto signup');

    const verifier = randomBytes(32).toString('base64url');
    const redirectUri = 'http://localhost:5173/auth/callback';
    const auth = await call('/connect/authorize?' + new URLSearchParams({
      client_id: 'tastetogether', redirect_uri: redirectUri, response_type: 'code', state: 's',
      scope: 'openid profile email offline_access api:tastetogether',
      code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256',
    }));
    const authCode = new URL(auth.headers.get('location')).searchParams.get('code');
    const tokens = await (await fetch(KONTO + '/connect/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', client_id: 'tastetogether', code: authCode, redirect_uri: redirectUri, code_verifier: verifier }),
    })).json();
    const sub = JSON.parse(Buffer.from(tokens.access_token.split('.')[1], 'base64url')).sub;
    return { headers: { Authorization: `Bearer ${tokens.access_token}` }, sub };
  }

  const owner = await kontoUser('Owner');
  const stranger = await kontoUser('Stranger');

  // Signed in, no password needed; the event belongs to the account.
  const own = await expect(201, 'konto: create without password', 'POST', '/', { name: 'Konto-Verkostung' }, owner.headers);
  await expect(400, 'konto: anonymous still needs a password', 'POST', '/', { name: 'x' });
  const mine = await expect(200, 'konto: my events', 'GET', '/mine', undefined, owner.headers);
  assert.deepEqual(mine.map((e) => e.code), [own.event.code]);
  await expect(401, 'konto: /mine needs Konto', 'GET', '/mine');

  // The owner is host without any event token; another account is not.
  await expect(201, 'konto: owner adds item', 'POST', `/${own.event.code}/items`, { name: 'Weißburgunder', price: 11 }, owner.headers);
  await expect(403, 'konto: stranger is no host', 'POST', `/${own.event.code}/items`, { name: 'x', price: 1 }, stranger.headers);
  assert.equal((await req('GET', `/${own.event.code}/status`, undefined, owner.headers)).data.isAdmin, true);
  assert.equal((await req('GET', `/${own.event.code}/status`, undefined, stranger.headers)).data.isAdmin, false);
  // A forged token signed by someone else is just anonymous — never a host.
  await expect(401, 'konto: forged token', 'POST', `/${own.event.code}/items`, { name: 'x', price: 1 },
    { Authorization: 'Bearer ' + [Buffer.from('{"alg":"HS256"}').toString('base64url'), Buffer.from(JSON.stringify({ iss: KONTO + '/', sub: owner.sub, aud: 'api:tastetogether' })).toString('base64url'), 'x'].join('.') });

  // Konto says the account was deleted: the event loses its owner.
  const body = JSON.stringify({ type: 'user.deleted', data: { sub: owner.sub } });
  const ts = String(Math.floor(Date.now() / 1000));
  const sign = (secret) => 'sha256=' + createHmac('sha256', secret).update(`${ts}.${body}`).digest('hex');
  const hook = (signature) => fetch(B.replace('/api/events', '/api/konto/webhook'), { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Konto-Timestamp': ts, 'X-Konto-Signature': signature }, body });
  assert.equal((await hook(sign('wrong secret'))).status, 401, 'konto: unsigned webhook refused');
  assert.equal((await hook(sign('dev-webhook-secret-tastetogether'))).status, 200, 'konto: signed webhook accepted');
  assert.deepEqual(await expect(200, 'konto: owner gone', 'GET', '/mine', undefined, owner.headers), []);
  console.log('OK — WL Konto checks passed');
}

console.log('OK — all checks passed');
