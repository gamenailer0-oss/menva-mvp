// POST /api/unlock — checks a MENVA Plus / Black code (Cloudflare Pages Functions, KV MENVA_CODES)
import { handleUnlock } from '../../netlify/lib/codes.mjs';
import { kvStore } from '../_lib/kv-store.js';

export const onRequest = ({ request, env }) => {
  const store = kvStore(env.MENVA_CODES, 'MENVA_CODES');
  return handleUnlock(request, store).catch((err) => {
    if (err.message?.includes('not set up')) {
      return new Response(JSON.stringify({ error: 'Code storage is not set up (bind KV namespace MENVA_CODES)' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    }
    throw err;
  });
};
