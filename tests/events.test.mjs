// Unit tests for the analytics back end: validation, security, aggregation. Run: npm run test:unit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clean, summarise, sameKey, MAX_BODY_BYTES } from '../netlify/lib/events.mjs';
import { handle as ingest } from '../netlify/functions/e.mjs';
import { handle as stats } from '../netlify/functions/stats.mjs';

const memoryStore = () => {
  const m = new Map();
  return {
    m,
    async setJSON(k, v) { m.set(k, JSON.stringify(v)); },
    async get(k) { return m.has(k) ? JSON.parse(m.get(k)) : null; },
    async list({ prefix = '' } = {}) { return { blobs: [...m.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })) }; },
  };
};
const SID = 'a1b2c3d4e5f60718';
const post = (body, headers = {}) => new Request('https://menva.test/api/e', {
  method: 'POST',
  headers: { 'content-type': 'application/json', origin: 'https://menva.test', ...headers },
  body: typeof body === 'string' ? body : JSON.stringify(body),
});
const batch = (events, extra = {}) => ({ s: SID, r: 'gauchos', t: '12', e: events, ...extra });

test('clean keeps known events and fields only', () => {
  const out = clean(batch([
    { e: 'model_loaded', d: 'steak-main', ms: 2400.4, bytes: 1_000_000, ip: '1.2.3.4', ua: 'x' },
    { e: 'hack', d: 'x' },
    { e: 'tier_assigned', d: 'steak-main', tier: 7 },
    { e: 'dish_open', d: '<script>' },
  ]));
  assert.deepEqual(out.events, [
    { e: 'model_loaded', d: 'steak-main', ms: 2400, bytes: 1_000_000 },
    { e: 'tier_assigned', d: 'steak-main' },
    { e: 'dish_open' },
  ]);
  assert.equal(out.table, '12');
});

test('clean rejects malformed batches', () => {
  assert.equal(clean(null).error, 'body');
  assert.equal(clean(batch([{ e: 'scan' }], { s: 'short' })).error, 'session');
  assert.equal(clean(batch([{ e: 'scan' }], { r: 'Bad Name' })).error, 'restaurant');
  assert.equal(clean(batch([])).error, 'events');
  assert.equal(clean(batch(Array(51).fill({ e: 'scan' }))).error, 'events');
  assert.equal(clean(batch([{ e: 'scan' }], { t: '0' })).table, null);
});

test('ingest stores one blob per batch, nothing personal', async () => {
  const store = memoryStore();
  const res = await ingest(post(batch([{ e: 'scan' }, { e: 'dish_open', d: 'steak-main' }])), store);
  assert.equal(res.status, 204);
  assert.equal(store.m.size, 1);
  const [key, value] = [...store.m][0];
  assert.match(key, /^\d{4}-\d{2}-\d{2}\/[a-z0-9]+-[a-f0-9]{8}$/);
  assert.deepEqual(Object.keys(JSON.parse(value)).sort(), ['day', 'events', 'restaurant', 'session', 'table']);
});

test('ingest refuses bad requests', async () => {
  const store = memoryStore();
  assert.equal((await ingest(new Request('https://menva.test/api/e'), store)).status, 405);
  assert.equal((await ingest(post(batch([{ e: 'scan' }]), { origin: 'https://evil.example' }), store)).status, 403);
  assert.equal((await ingest(post('not json'), store)).status, 400);
  assert.equal((await ingest(post('x'.repeat(MAX_BODY_BYTES + 1)), store)).status, 413);
  assert.equal((await ingest(post(batch([{ e: 'unknown' }])), store)).status, 204); // nothing to keep
  assert.equal(store.m.size, 0);
});

test('ingest rate-limits a flooding session', async () => {
  const store = memoryStore();
  const flood = { ...batch([{ e: 'scan' }]), s: 'ffffffffffffffff' };
  const codes = [];
  for (let i = 0; i < 35; i++) codes.push((await ingest(post(flood), store)).status);
  assert.ok(codes.includes(429));
  assert.ok(store.m.size <= 30);
});

test('stats needs the right key', async () => {
  const store = memoryStore();
  const get = (q, env = { STATS_KEY: 'a-long-enough-secret-key' }) => stats(new Request(`https://menva.test/api/stats?${q}`), store, env);
  assert.equal((await get('key=nope')).status, 401);
  assert.equal((await get('')).status, 401);
  assert.equal((await get('key=x', {})).status, 503); // not configured
  const ok = await get('key=a-long-enough-secret-key&days=7');
  assert.equal(ok.status, 200);
  const body = await ok.json();
  assert.equal(body.range_days, 7);
  assert.ok(Array.isArray(body.days) && Array.isArray(body.dishes));
  assert.equal(sameKey('abc', 'abc'), true);
  assert.equal(sameKey('abc', 'abd'), false);
});

test('summarise: medians, rates, final tier per opening, per day and per dish', () => {
  const b = (session, events) => ({ day: '2026-09-23', restaurant: 'gauchos', table: '12', session, events });
  const out = summarise([
    b('s1', [{ e: 'scan' }, { e: 'dish_open', d: 'steak-main' }, { e: 'tier_assigned', d: 'steak-main', tier: 4, reason: 'slow' }]),
    b('s1', [{ e: 'model_loaded', d: 'steak-main', ms: 3000 }, { e: 'tier_assigned', d: 'steak-main', tier: 2 }, { e: 'ar_launch', d: 'steak-main' }, { e: 'ar_object_placed', d: 'steak-main', ms: 3500 }]),
    b('s2', [{ e: 'scan' }, { e: 'dish_open', d: 'steak-main' }, { e: 'model_failed', d: 'steak-main', reason: 'model' }, { e: 'tier_assigned', d: 'steak-main', tier: 4, reason: 'failed' }]),
    b('s2', [{ e: 'dish_open', d: 'steak-sandwich' }, { e: 'model_loaded', d: 'steak-sandwich', ms: 1000 }, { e: 'tier_assigned', d: 'steak-sandwich', tier: 3 }, { e: 'tray_add', d: 'steak-sandwich' }, { e: 'waiter_view' }]),
  ]);
  const [day] = out.days;
  assert.equal(day.sessions, 2);
  assert.equal(day.scans, 2);
  assert.equal(day.dish_opens, 3);
  assert.equal(day.median_load_ms, 2000);
  assert.equal(day.failure_rate_pct, 33.3);
  assert.deepEqual(day.tiers, { 2: 1, 3: 1, 4: 1 }); // s1 steak ended on 2, not 4
  assert.equal(day.ar_launch_rate_pct, 33.3);
  assert.equal(day.median_tap_to_placed_ms, 3500);
  assert.equal(day.tray_adds, 1);
  assert.equal(day.waiter_views, 1);
  const steak = out.dishes.find((d) => d.dish === 'steak-main');
  assert.equal(steak.opens, 2);
  assert.equal(steak.failure_rate_pct, 50);
});

test('summarise: restaurant filter scopes to one restaurant, others untouched', () => {
  const b = (session, restaurant, events) => ({ day: '2026-09-23', restaurant, table: null, session, events });
  const batches = [
    b('s1', 'gauchos', [{ e: 'scan' }, { e: 'dish_open', d: 'steak-main' }]),
    b('s2', 'baraza', [{ e: 'scan' }, { e: 'dish_open', d: 'bz-flat-white' }]),
  ];
  const all = summarise(batches);
  assert.equal(all.days[0].scans, 2);
  assert.equal(all.dishes.length, 2);

  const gauchosOnly = summarise(batches, 'gauchos');
  assert.equal(gauchosOnly.days[0].scans, 1);
  assert.deepEqual(gauchosOnly.dishes.map((d) => d.dish), ['steak-main']);

  const barazaOnly = summarise(batches, 'baraza');
  assert.equal(barazaOnly.days[0].scans, 1);
  assert.deepEqual(barazaOnly.dishes.map((d) => d.dish), ['bz-flat-white']);
});

test('stats handler: ?r= filters and lists restaurants seen; bad r → empty', async () => {
  const store = memoryStore();
  await ingest(post(batch([{ e: 'scan' }, { e: 'dish_open', d: 'steak-main' }])), store); // gauchos
  await ingest(post({ ...batch([{ e: 'scan' }]), r: 'baraza', s: 'b0000000000000a1' }), store); // distinct session id — the flood test above exhausts 'ffff…'
  const get = (q) => stats(new Request(`https://menva.test/api/stats?${q}`), store, { STATS_KEY: 'a-long-enough-secret-key' });

  const all = await (await get('key=a-long-enough-secret-key')).json();
  assert.equal(all.batches, 2);
  assert.deepEqual(all.restaurants.map((r) => r.id).sort(), ['baraza', 'gauchos']);

  const gauchosOnly = await (await get('key=a-long-enough-secret-key&r=gauchos')).json();
  assert.equal(gauchosOnly.batches, 1);
  assert.equal(gauchosOnly.days[0].scans, 1);

  const bad = await (await get(`key=a-long-enough-secret-key&r=${encodeURIComponent('not a valid id!')}`)).json();
  assert.equal(bad.batches, 0);
  assert.deepEqual(bad.days, []);
});

test('stats CSV export', async () => {
  const store = memoryStore();
  await ingest(post(batch([{ e: 'scan' }, { e: 'dish_open', d: 'steak-main' }])), store);
  const res = await stats(new Request('https://menva.test/api/stats?key=a-long-enough-secret-key&format=csv'), store, { STATS_KEY: 'a-long-enough-secret-key' });
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/csv/);
  const text = await res.text();
  assert.match(text, /^day,sessions,scans,dish_opens/);
  assert.match(text, /\n\d{4}-\d{2}-\d{2},1,1,1,/);
  assert.match(text, /\nsteak-main,1,/);
});
