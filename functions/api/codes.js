// POST /api/codes — MENVA creates, extends and revokes plan codes (Cloudflare Pages Functions).
// Authorization: Bearer <CODES_ADMIN_KEY> (a secret: Settings → Variables and secrets). See
// scripts/make-code.mjs and netlify/lib/codes.mjs for the actions.
import { handleAdmin } from '../../netlify/lib/codes.mjs';
import { kvStore } from '../_lib/kv-store.js';

export const onRequest = ({ request, env }) => {
  const store = kvStore(env.MENVA_CODES, 'MENVA_CODES');
  return handleAdmin(request, store, { CODES_ADMIN_KEY: env.CODES_ADMIN_KEY }).catch((err) => {
    if (err.message?.includes('not set up')) {
      return new Response(JSON.stringify({ error: 'Code storage is not set up (bind KV namespace MENVA_CODES)' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    }
    throw err;
  });
};
