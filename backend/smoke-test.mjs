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

console.log('OK — all checks passed');
