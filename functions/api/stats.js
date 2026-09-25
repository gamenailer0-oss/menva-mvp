// GET /api/stats?key=…&days=14[&format=csv] — pilot results (Cloudflare Pages Functions)
// Import the platform-agnostic handler and KV adapter
import { handle } from '../../netlify/lib/stats.mjs';
import { kvStore } from '../_lib/kv-store.js';

export const onRequest = ({ request, env }) => {
  const store = kvStore(env.MENVA_EVENTS);
  return handle(request, store, { STATS_KEY: env.STATS_KEY }).catch((err) => {
    if (err.message?.includes('not set up')) {
      return new Response(JSON.stringify({ error: 'Analytics storage is not set up (bind KV namespace MENVA_EVENTS)' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }
    throw err;
  });
};
