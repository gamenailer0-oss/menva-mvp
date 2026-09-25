// Analytics stats handler (Netlify and Cloudflare).
// Platform-agnostic request handler; called by netlify/functions/stats.mjs and functions/api/stats.js.
import { summarise, sameKey, restaurantCounts } from './events.mjs';

const RESTAURANT_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const noStore = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };
const json = (status, data) => new Response(JSON.stringify(data), { status, headers: { ...noStore, 'Content-Type': 'application/json; charset=utf-8' } });

function lastDays(n) {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' });
  return Array.from({ length: n }, (_, i) => fmt.format(new Date(Date.now() - i * 86_400_000)));
}

const CSV_COLUMNS = ['day', 'sessions', 'scans', 'dish_opens', 'median_load_ms', 'failure_rate_pct', 'tier_1', 'tier_2', 'tier_3', 'tier_4', 'tier_5', 'ar_launches', 'ar_launch_rate_pct', 'median_tap_to_placed_ms', 'tray_adds', 'waiter_views'];
const DISH_COLUMNS = ['dish', 'opens', 'median_load_ms', 'failure_rate_pct', 'tier_1', 'tier_2', 'tier_3', 'tier_4', 'tier_5', 'ar_launches', 'ar_launch_rate_pct', 'median_tap_to_placed_ms', 'tray_adds'];
const cell = (v) => (v == null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
const rows = (items, cols) => items.map((o) => cols.map((c) => cell(c.startsWith('tier_') ? o.tiers[c.slice(5)] || 0 : o[c])).join(','));

export async function handle(req, store, env) {
  if (req.method !== 'GET') return json(405, { error: 'GET only' });
  const secret = env.STATS_KEY;
  if (!secret || secret.length < 16) return json(503, { error: 'Stats are not set up: add a STATS_KEY environment variable (16+ characters).' });

  const url = new URL(req.url);
  if (!sameKey(url.searchParams.get('key') || '', secret)) return json(401, { error: 'Wrong key' });
  const days = Math.min(Math.max(Number(url.searchParams.get('days')) || 14, 1), 90);

  // ?r=gauchos scopes everything to one restaurant, so a private pitch demo's visits (Baraza)
  // never mix into the pilot's numbers. An `r` that isn't a valid restaurant id shape matches
  // nothing — real ids are always this shape (validated at ingest, events.mjs clean()) — so this
  // is "unknown restaurant" → empty result, not a 400.
  const rParam = url.searchParams.get('r');
  const restaurant = rParam == null ? null : (RESTAURANT_ID.test(rParam) ? rParam : '');

  // One blob per batch; read the requested days in parallel.
  const keys = [];
  for (const d of lastDays(days)) {
    const { blobs } = await store.list({ prefix: `${d}/` });
    keys.push(...blobs.map((b) => b.key));
  }
  const allBatches = (await Promise.all(keys.map((k) => store.get(k, { type: 'json' })))).filter(Boolean);
  const batches = restaurant == null ? allBatches : allBatches.filter((b) => b.restaurant === restaurant);
  const result = {
    generated: new Date().toISOString(),
    range_days: days,
    batches: batches.length,
    ...summarise(batches),
    restaurants: restaurantCounts(allBatches), // ids seen + session counts, for the /stats picker
  };

  if (url.searchParams.get('format') === 'csv') {
    const csv = [CSV_COLUMNS.join(','), ...rows(result.days, CSV_COLUMNS), '', DISH_COLUMNS.join(','), ...rows(result.dishes, DISH_COLUMNS)].join('\n');
    return new Response(csv + '\n', {
      headers: { ...noStore, 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="menva-stats-${lastDays(1)[0]}.csv"` },
    });
  }
  return json(200, result);
}
