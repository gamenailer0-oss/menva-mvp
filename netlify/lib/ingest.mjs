// Analytics event ingest handler (Netlify and Cloudflare).
// Platform-agnostic request handler; called by netlify/functions/e.mjs and functions/api/e.js.
import { clean, MAX_BODY_BYTES } from './events.mjs';

const lahoreDay = (date = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(date);
const reply = (status, headers = {}) => new Response(null, { status, headers: { 'Cache-Control': 'no-store', ...headers } });

// Best-effort flood guard per function instance: a real diner sends a handful of batches a minute.
const recent = new Map();
function tooMany(session) {
  const now = Date.now();
  const times = (recent.get(session) || []).filter((t) => now - t < 60_000);
  times.push(now);
  recent.set(session, times);
  if (recent.size > 5000) recent.clear();
  return times.length > 30;
}

export async function handle(req, store) {
  if (req.method !== 'POST') return reply(405, { Allow: 'POST' });

  // Only our own pages may send events (browsers always attach Origin to sendBeacon/fetch POSTs).
  const origin = req.headers.get('origin');
  if (origin && new URL(origin).host !== new URL(req.url).host) return reply(403);

  if (Number(req.headers.get('content-length') || 0) > MAX_BODY_BYTES) return reply(413);
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) return reply(413);

  let body;
  try { body = JSON.parse(text); } catch { return reply(400); }
  const batch = clean(body);
  if (batch.error) return reply(400);
  if (!batch.events.length) return reply(204);
  if (tooMany(batch.session)) return reply(429);

  const day = lahoreDay();
  const key = `${day}/${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
  await store.setJSON(key, { day, restaurant: batch.restaurant, table: batch.table, session: batch.session, events: batch.events });
  return reply(204);
}
