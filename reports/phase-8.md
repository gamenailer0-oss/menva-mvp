# Phase 8 — Analytics (built ahead of Phase 7 while the redesign runs)

## What's built
- `js/analytics.js`: `track(event, props)` batches events and sends them with `navigator.sendBeacon('/api/e')` every 4 s and when the diner leaves or switches to AR. Random session id per tab (sessionStorage). No cookies, no IP, no user agent, nothing personal.
- Events wired: `scan` (arrived from a table QR), `menu_view`, `dish_open`, `model_progress_stalled`, `model_loaded {ms, bytes}`, `model_failed {reason}`, `tier_assigned {tier}`, `ar_launch`, `ar_session_started {ms}`, `ar_object_placed {ms}`, `ar_exit {duration_ms}`, `ar_failed`. (`tray_add` and `waiter_view` arrive with Phase 7.)
- `netlify/functions/e.mjs` (POST `/api/e`): same-site only, 16 KB cap, strict allowlist of events and fields (everything else dropped), bounded numbers, best-effort flood limit, one blob per batch in Netlify Blobs (no overwrite races), days in Lahore time.
- `netlify/functions/stats.mjs` (GET `/api/stats`): needs `STATS_KEY` (constant-time compare), 1–90 days, JSON or CSV.
- `/stats?key=…`: private page — per day and per dish: sessions, scans, dish opens, median load time, load-failure rate, tier distribution (final tier per opening), AR launch rate, median tap → placed, adds to table, waiter views. CSV download. Key is removed from the address bar after load.

## Tested
- 8 unit tests (`npm run test:unit`): validation, cross-site/oversized/junk requests refused, flood limit, wrong key refused, every number on the stats page, CSV.
- End to end locally (`npm run serve` runs the same functions with an in-memory store): diner visit → beacon → store → /stats shows it.
- 17 diner journeys still pass with analytics live.
- Bug caught and fixed: the stats header showed "Last [object Object] days".

## ⚠ Needs you before it works live
Drag-and-drop uploads **don't deploy Netlify Functions**, so `/api/e` and `/stats` won't work on demomenva.netlify.app until the site is deployed from Git (GitHub → Netlify, recommended) or the Netlify CLI. Then set `STATS_KEY` (32+ random characters) in Netlify → Site configuration → Environment variables. Until then the app works exactly the same; the beacons just go nowhere.
