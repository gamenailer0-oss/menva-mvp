// GET /api/stats?key=…&days=14[&format=csv] — pilot results for the private /stats page.
// The key is the STATS_KEY environment variable (set it in Netlify: Site configuration →
// Environment variables; use 32+ random characters). Compared in constant time.
import { getStore } from '@netlify/blobs';
import { summarise, sameKey } from '../lib/events.mjs';

export const config = { path: '/api/stats' };

const STORE = 'menva-events';
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

  // One blob per batch; read the requested days in parallel.
  const keys = [];
  for (const d of lastDays(days)) {
    const { blobs } = await store.list({ prefix: `${d}/` });
    keys.push(...blobs.map((b) => b.key));
  }
  const batches = (await Promise.all(keys.map((k) => store.get(k, { type: 'json' })))).filter(Boolean);
  const result = { generated: new Date().toISOString(), range_days: days, batches: batches.length, ...summarise(batches) };

  if (url.searchParams.get('format') === 'csv') {
    const csv = [CSV_COLUMNS.join(','), ...rows(result.days, CSV_COLUMNS), '', DISH_COLUMNS.join(','), ...rows(result.dishes, DISH_COLUMNS)].join('\n');
    return new Response(csv + '\n', {
      headers: { ...noStore, 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="menva-stats-${lastDays(1)[0]}.csv"` },
    });
  }
  return json(200, result);
}

export default (req) => handle(req, getStore(STORE), { STATS_KEY: Netlify.env.get('STATS_KEY') });
