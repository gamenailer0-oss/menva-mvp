// POST /api/e — analytics ingest (Cloudflare Pages Functions)
// Import the platform-agnostic handler and KV adapter
import { handle } from '../../netlify/lib/ingest.mjs';
import { kvStore } from '../_lib/kv-store.js';

export const onRequest = ({ request, env }) => {
  const store = kvStore(env.MENVA_EVENTS);
  return handle(request, store).catch((err) => {
    if (err.message?.includes('not set up')) {
      return new Response(JSON.stringify({ error: 'Analytics storage is not set up (bind KV namespace MENVA_EVENTS)' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }
    throw err;
  });
};
