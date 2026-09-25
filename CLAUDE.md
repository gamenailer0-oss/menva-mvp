# MENVA — MVP Build Plan for Claude Code

You are building the pilot-ready MVP of **MENVA**, a QR-to-AR dish experience for fine-dining restaurants in Lahore, Pakistan. First client: **Gauchos** (steakhouse, Gulberg III). This file is the source of truth. Read it fully before touching code.

Work **phase by phase**. At the end of every phase: commit, print a short report (what changed, what passed, what failed, open questions), and **stop and wait for approval** before starting the next phase.

---

## 1. Mission

A diner scans a QR on their table and, within seconds, sees a real Gauchos dish on their phone — then places it life-size on their own table in AR. The experience must feel premium, fast and calm, work on a mid-range Android on shaky restaurant wifi, and never look broken.

### Non-negotiables

1. **Photo first, always.** A real dish image renders before any 3D. If everything else fails, the diner still sees a beautiful dish.
2. **No third-party runtime dependencies.** No unpkg, no Google Fonts, no gstatic Draco decoder, no analytics SDKs. Everything is served from our own origin.
3. **Swift AR placement.** Model is fully loaded before AR is offered; AR opens straight onto the table with the dish sitting flat, grounded and true to scale.
4. **Never invent food data.** Allergens, halal status and ingredients come only from `data/dishes.csv`. If a field is empty or `TO_CONFIRM`, show "Please confirm with your server" — never a guess.
5. **Static site on Netlify** + one Netlify Function for analytics. No framework, no bundler for the app. Node scripts are allowed for the asset pipeline and tooling.
6. **The waiter stays in charge.** No online ordering or payment. The diner builds a list and shows it to the waiter.

---

## 2. Current state (read before changing anything)

The existing repo is a vanilla JS hash-routed SPA (`index.html`, `js/app.js`, `js/data.js`, `css/*.css`, `models/*`). Keep the design tokens in `css/tokens.css` and the Gauchos theme. Known problems, confirmed by inspection:

| # | Problem | Fix phase |
|---|---|---|
| 1 | `model-viewer` loaded by dynamic import from unpkg, unpinned. Likely cause of "AR didn't run on Chrome" | 1 |
| 2 | `netlify.toml` has no Content-Type for `.glb` / `.usdz`. iOS Quick Look rejects wrong MIME types | 1 |
| 3 | Existing USDZ files are DEFLATE-compressed; USDZ spec requires stored (uncompressed), 64-byte-aligned entries | 2 |
| 4 | Base-colour textures are 512×512; normal map PNG (357 KB) is 6× the colour map; flat `roughnessFactor: 0.9`. Food reads as clay | 2 |
| 5 | No mesh compression; uint32 indices on 15k-vertex meshes; ~1.2 MB GLBs | 2 |
| 6 | Ribeye bounding box is 42.5 × 29.5 cm — likely oversized. No scale calibration | 2 |
| 7 | Landing page eagerly loads a 1.2 MB GLB for a hero demo | 1 |
| 8 | Google Fonts render-blocking | 1 |
| 9 | No table identity in URLs | 1 |
| 10 | No allergens / halal / spice / dietary data | 3 |
| 11 | Fallback only covers "AR unavailable", nothing if the 3D fails | 6 |
| 12 | Loading state is plain text, no progress | 4 |
| 13 | Menu data scraped from Foodpanda and linked publicly | 3 |
| 14 | Zero analytics | 8 |
| 15 | AR availability checked with a racy `setTimeout` | 5 |

---

## 3. Architecture decisions (do not relitigate without asking)

- **Viewer:** `@google/model-viewer`, exact pinned version from npm, copied to `/vendor/` by a script. Set `ModelViewerElement.dracoDecoderLocation` to our self-hosted `/vendor/draco/`.
- **AR modes:** `ar-modes="webxr scene-viewer quick-look"`. WebXR first on Android (stays in-browser, no re-download, our own UI). Scene Viewer as Android fallback. Quick Look on iOS.
- **Mesh compression:** Draco (supported by three.js, model-viewer and Scene Viewer). Not meshopt.
- **Textures:** JPEG. Albedo 2048 max, normal 1024 max (optional), AO baked into albedo where possible. No KTX2 in this MVP (extra transcoder, extra risk).
- **USDZ:** pre-built by our pipeline and validated (stored + 64-byte aligned). If a pre-built USDZ fails validation, omit `ios-src` for that dish and let model-viewer generate it on the fly.
- **Routing:** switch from hash routing to path routing with the History API. `/* → /index.html 200` redirect already exists.
- **Analytics:** `navigator.sendBeacon` → Netlify Function `/api/e` → Netlify Blobs. Private `/stats` page with a key.
- **Fonts:** self-host DM Sans and Instrument Serif as subset woff2 with system fallbacks.

---

## 4. Target repo layout

```
/
├── CLAUDE.md                  ← this file
├── index.html
├── netlify.toml
├── package.json               ← tooling only (pipeline, QR, tests)
├── css/  tokens.css base.css style.css loader.css
├── js/
│   ├── app.js                 ← router + views
│   ├── capabilities.js        ← device tiering
│   ├── viewer.js              ← model-viewer setup, AR, preload
│   ├── loader.js              ← "The Pass" loading experience
│   ├── tray.js                ← "Show the waiter" list
│   └── analytics.js           ← beacon
├── data/
│   ├── dishes.csv             ← filled by Abdullah (source of truth)
│   ├── restaurants/gauchos.json
│   └── build/dishes.json      ← generated, do not hand-edit
├── incoming-models/           ← raw uploads, NEVER modified
│   ├── <dish-id>.glb
│   └── <dish-id>.jpg          ← real photo of the plated dish (optional but strongly preferred)
├── assets/dishes/<dish-id>/   ← generated per dish
│   ├── model.glb  model.usdz  poster.webp  poster-blur.webp  spin.webp  meta.json
├── vendor/                    ← model-viewer, draco decoder, fonts
├── scripts/
│   ├── audit.mjs  pipeline.mjs  render.mjs  usdz-validate.mjs
│   ├── build-data.mjs  make-qr.mjs  vendor.mjs
├── netlify/functions/e.mjs    ← analytics ingest
├── stats/index.html           ← private dashboard
├── print/qr/                  ← generated table QR SVGs
└── tests/                     ← Playwright smoke tests
```

---

## 5. Phases

### Phase 0 — Audit (read-only)

1. Inventory the existing repo and `incoming-models/`. Do not modify any file in `incoming-models/`.
2. Write `scripts/audit.mjs` (use `@gltf-transform/core` + `@gltf-transform/functions`). For every GLB report: file size, triangle count, vertex count, index type, texture count and resolution per slot, material factors (flag `roughnessFactor ≥ 0.85` with no roughness texture as **"flat / clay risk"**), bounding box in cm, pivot position (flag if min Y ≠ 0 or not centred on X/Z), and extensions used.
3. Cross-check against `data/dishes.csv`: flag GLBs with no CSV row, CSV rows marked `is_3d=yes` with no GLB, and bounding boxes that differ from `plate_length_cm` by more than 15%.
4. Output `audit-report.md` with a table and a **traffic-light score per model**: green (ship), amber (ship after pipeline), red (do not put on the menu — explain why).

**Acceptance:** report exists; no files changed. **Stop and report.**

### Phase 1 — Infrastructure fixes

1. `scripts/vendor.mjs`: install exact-pinned `@google/model-viewer`, copy the minified module and the Draco decoder files into `/vendor/`. Load model-viewer with a plain `<script type="module" src="/vendor/model-viewer.min.js">` only when the first dish sheet opens (lazy), never from a CDN.
2. Self-host fonts (Latin subset woff2, `font-display: swap`). Remove every Google Fonts reference.
3. `netlify.toml`: add headers
   - `/*.glb` → `Content-Type: model/gltf-binary`
   - `/*.usdz` → `Content-Type: model/vnd.usdz+zip`
   - `/assets/*`, `/vendor/*` → `Cache-Control: public, max-age=31536000, immutable`
   - `/index.html`, `/data/build/*` → `Cache-Control: public, max-age=0, must-revalidate`
4. Remove the MENVA discovery directory and the landing-page hero GLB. The root `/` becomes a minimal MENVA brand page with no 3D.
5. Path routing: `/g` (Gauchos, no table) and `/g/:table` (e.g. `/g/12`). Store the table number in `sessionStorage`. Generic form `/:restaurantSlug/:table` for future restaurants. Keep old hash URLs redirecting for backwards compatibility.
6. Add a service worker that caches `/vendor/*`, CSS, JS and any dish assets after first fetch (cache-first for immutable assets, network-first for `dishes.json`).

**Acceptance:** Lighthouse mobile on `/g/12` ≥ 90 performance; zero requests to any third-party origin (verify in the network log); `.usdz` served with the correct MIME on the deploy preview. **Stop and report.**

### Phase 2 — Asset pipeline

`npm run pipeline` processes every model in `incoming-models/` into `assets/dishes/<id>/`. Idempotent; never touches originals.

1. **Normalise:** move pivot to bottom-centre (min Y = 0, centred on X/Z). Scale so the largest horizontal extent equals `plate_length_cm` from the CSV. Log the scale factor; warn if it is outside 0.85–1.15.
2. **Clean:** weld, dedupe, prune unused data, convert indices to uint16 where vertex count allows, simplify to ≤ 40k triangles if above that.
3. **Textures:** resize albedo to max 2048 (keep native if smaller — never upscale, and flag in the report that a low-res albedo is the main quality limit), normal to max 1024, re-encode JPEG (quality 82–85). Bake AO into albedo when an AO map exists and drop the AO slot.
4. **Material sanity:** if roughness is flat ≥ 0.85 with no roughness map, set `roughnessFactor` to 0.6 and flag it for manual review. Do not attempt to paint maps automatically.
5. **Compress:** Draco on geometry.
6. **Render (`scripts/render.mjs`, Puppeteer + local model-viewer page):**
   - `poster.webp` — 1200 px wide, 3/4 top-down angle, neutral environment, ≤ 80 KB. Use the real photo from `incoming-models/<id>.jpg` as the poster instead if present (crop 4:3, ≤ 80 KB).
   - `poster-blur.webp` — 32 px wide version of the poster (for the instant blur-up, inline as base64 in `dishes.json`).
   - `spin.webp` — 36-frame 360° sprite sheet, 480 px frames, ≤ 300 KB total. This is fallback tier 4.
7. **USDZ:** in the same headless page, export with three.js `USDZExporter` from the processed GLB. Then run `scripts/usdz-validate.mjs`: every zip entry must use method 0 (stored) and each file's data offset must be 64-byte aligned. On failure, write `"usdz": null` in `meta.json`.
8. **Budgets — hard fail the build if exceeded:** GLB ≤ 1.2 MB (target ≤ 800 KB), USDZ ≤ 1.8 MB, poster ≤ 80 KB, sprite ≤ 300 KB.
9. Write `meta.json` per dish: dimensions in cm, triangle count, file sizes, audit score, warnings.

**Acceptance:** every green/amber model passes budgets; USDZ validator passes or falls back cleanly; a before/after size table is printed. **Stop and report**, including any model that still looks clay-like and needs a re-shoot.

### Phase 3 — Data model and menu

1. `scripts/build-data.mjs` converts `data/dishes.csv` + `data/restaurants/gauchos.json` + `assets/dishes/*/meta.json` into `data/build/dishes.json`.
2. Schema per dish: `id, name, category, price_pkr, description, ingredients[], allergens[], halal ("yes" | "no" | "unconfirmed"), spice_level (0–3), dietary[], nutrition {calories, protein_g, fat_g, carbs_g, serving_g} | null, has3d, assets {glb, usdz, poster, blur, spin}, dimensions_cm, confirmed_by`.
3. Allowed allergens: gluten, dairy, egg, tree nuts, peanuts, soy, sesame, fish, shellfish, mustard, sulphites. Reject unknown values with a clear build error.
4. Remove all Foodpanda-sourced data, links and "retrieved from" notices. Menu comes only from the CSV.
5. Menu view: categories in CSV order; dishes with 3D show the poster thumbnail and a small "See it on your table" mark; others render as clean text rows with price.
6. Dish sheet detail order: price → description → **halal mark → allergens → spice → dietary** → ingredients → nutrition (collapsed by default). Empty or `TO_CONFIRM` values render "Please confirm with your server".

**Acceptance:** build fails loudly on bad CSV data; no fabricated values anywhere in the UI. **Stop and report.**

### Phase 4 — The dish sheet and "The Pass" loader

Replace the spinner/text loader with the loading experience in **Section 6**. Implement in `js/loader.js` + `css/loader.css` using inline SVG and CSS only (no Lottie, no GIF, ≤ 6 KB total).

1. The dish sheet opens instantly with the blur-up poster (base64, zero network).
2. The full poster fades in as soon as it arrives.
3. The GLB loads behind it; model-viewer `progress` events drive the loader.
4. On `load`: a short "served" beat (≤ 600 ms), then crossfade poster → live 3D.
5. The AR button appears only after `load` (see Phase 5).

**Acceptance:** at "Fast 4G" throttling, dish image visible < 300 ms after tap; loader progress moves smoothly with real bytes; `prefers-reduced-motion` gets the static version. **Stop and report with a screen recording or screenshots at 0%, 50%, 100%.**

### Phase 5 — Swift AR placement

Implement everything in **Section 7**. Instrument timings (`ar_launch`, `session-started`, `object-placed`).

**Acceptance:** on an ARCore Android via WebXR, median tap-to-placed ≤ 4 s on a textured table; on iPhone, Quick Look opens with the dish at real size and resting on the surface; the dish never floats, never sinks, and cannot be pinch-scaled in AR. **Stop and report.**

### Phase 6 — Capability detection and fallback ladder

`js/capabilities.js` assigns each device a tier **after** model-viewer is loaded and the model has loaded (never on a timer):

| Tier | Experience | Condition |
|---|---|---|
| 1 | Quick Look AR | iOS Safari/Chrome, `canActivateAR` true, valid USDZ or on-the-fly |
| 2 | WebXR / Scene Viewer AR | Android, `canActivateAR` true |
| 3 | In-page 3D only | WebGL works, AR not available |
| 4 | 360° sprite spinner (swipe to turn) | WebGL unavailable, model load failed, load exceeds 12 s, or low-memory device (`navigator.deviceMemory ≤ 2`) |
| 5 | Poster photo | Everything else, and always the first paint |

Rules:
- In-app browsers (Instagram, Facebook, TikTok, Snapchat user agents): keep tiers 3–5 working and show one calm line: "For the table view, open this page in Chrome or Safari," with a copy-link button.
- Model load error or > 12 s: switch silently to tier 4 with the message "Here it is in 360° while the full view loads" and keep loading in the background; upgrade if it finishes.
- Debug override `?tier=1..5` and `?slow=1` (artificial throttle) for demos and testing.

**Acceptance:** Playwright tests force each tier and confirm the right UI; no tier ever shows an empty or broken viewer. **Stop and report.**

### Phase 7 — "Show the waiter" list

1. "Add to my table" on each dish sheet; quantity stepper; optional note ("medium rare", "no onions").
2. Stored in `localStorage` keyed by restaurant + table; clears after 4 hours.
3. A floating pill shows the item count. Tapping it opens **Show the waiter**: a full-screen, high-contrast, large-type summary with table number, items, quantities and notes. Screen brightness hint: "Turn your screen toward your server."
4. No submission to any server, no POS integration.

**Acceptance:** works offline once loaded; readable at arm's length in dim light. **Stop and report.**

### Phase 8 — Analytics

1. `js/analytics.js`: `track(event, props)` via `navigator.sendBeacon('/api/e', …)`. Random session id in `sessionStorage`. **No personal data**, no IP storage.
2. Events: `scan` (page load with table), `menu_view`, `dish_open`, `model_progress_stalled`, `model_loaded {ms, bytes}`, `model_failed {reason}`, `tier_assigned {tier}`, `ar_launch`, `ar_session_started {ms}`, `ar_object_placed {ms}`, `ar_exit {duration_ms}`, `tray_add`, `waiter_view`.
3. `netlify/functions/e.mjs`: validate, append to Netlify Blobs by day.
4. `/stats?key=…` (key from a Netlify env var): per day and per dish — scans, dish opens, median load ms, failure rate, tier distribution, AR launch rate, median tap-to-placed, tray adds, waiter views. Plain HTML table plus CSV export. This is the pilot results page.

**Acceptance:** events visible on `/stats` from a real phone within a minute. **Stop and report.**

### Phase 9 — QR codes, QA and deploy

1. `scripts/make-qr.mjs`: generate print-ready SVG QR codes for tables 1–N pointing to `https://<custom-domain>/g/<n>`, error correction **H**, generous quiet zone, dark on light. Never encode a `*.netlify.app` URL — printed codes must survive a hosting change. Stop and ask for the domain if not configured.
2. Device QA matrix (report pass/fail for each): recent iPhone (Safari), older iPhone (e.g. iPhone 8–11), recent ARCore Android (Chrome), mid-range Android ~PKR 40–60k class, old Android without ARCore, Instagram in-app browser, desktop (should show a QR prompting to open on phone).
3. Throttled test at 3 Mbps / 150 ms RTT: first paint < 1.5 s, dish photo < 300 ms after tap, median model ready < 4 s.
4. Deploy to Netlify production; verify headers with `curl -I` for one `.glb` and one `.usdz`.

**Acceptance:** all budgets met; QA matrix complete. **Final report.**

---

## 6. "The Pass" — loader specification

The loader should feel like the kitchen preparing *this* dish, not a web page loading. Calm, warm, a little playful, never cartoonish. The diner's real dish is visible from the first frame.

**Layers (bottom to top):**

1. **Focus pull.** The dish poster fills the stage, starting at `blur(18px) saturate(0.7) scale(1.04)`. As progress rises, blur eases to 0, saturation to 1, scale to 1. The dish literally comes into focus as it downloads. This is the main effect — spend the boldness here.
2. **Plate rim progress.** A thin ring (1.5 px, restaurant accent colour) traces clockwise around an implied plate edge centred on the dish, from 0 to 360° with real byte progress (`stroke-dashoffset`). No percentage number by default.
3. **Steam.** Three thin SVG wisps rise slowly from the dish (stroke-dash + translateY, 2.4–3.2 s staggered loops, 35% opacity). They fade out at 100%.
4. **Kitchen line.** One short line of copy under the stage, changing at progress thresholds with a soft crossfade. Copy comes from the restaurant config so each restaurant gets its own voice.

**Gauchos copy (`data/restaurants/gauchos.json` → `loaderLines`):**

| Progress | Line |
|---|---|
| 0–25% | Firing up the grill |
| 25–60% | Searing your cut |
| 60–90% | Letting it rest |
| 90–99% | Plating it for you |
| Loaded | Served. (hold 500 ms, then crossfade to 3D) |

Generic fallback lines for other restaurants: "Warming the plates" → "Plating your dish" → "Adding the final touch" → "Served."

**Behaviour rules:**
- Progress must be monotonic and honest. If progress stalls for 4 s, keep the steam moving but do not fake progress.
- Stalled > 6 s below 40%: show under the line, small: "Slow connection — here it is in 360° meanwhile" with the sprite (tier 4) replacing the stage until the model arrives.
- `prefers-reduced-motion`: no steam, no scale; blur still resolves in 3 steps; rim still fills.
- Tap the stage during loading → a gentle "Almost ready" pulse; never a dead tap.
- Cheffy mascot: controlled by `showCheffy` in restaurant config. **Default false for Gauchos** (fine-dining register). When true, a small Cheffy appears beside the kitchen line only at the "Served." beat.

**AR placement prompt** (`slot="ar-prompt"`): a simple line illustration of a phone sweeping in a slow arc over a plate outline, with "Move your phone slowly over the table." After 5 s without a surface: "Try over the tablecloth or a napkin — patterned surfaces work best."

---

## 7. Swift AR placement — specification

Goal: from tapping "See it on your table" to a grounded, life-size dish in under ~4 seconds, with no floating, drifting or resizing.

1. **Load before offering AR.** The AR button is hidden until model-viewer fires `load` and `canActivateAR === true`. Then it appears with a short confirmation: "Ready — see it on your table." Never let a diner enter AR with a half-loaded model.
2. **Grounded pivot.** Every model's origin is bottom-centre (pipeline Phase 2). The dish sits exactly on the detected surface the instant it appears.
3. **True scale, locked.** `ar-scale="fixed"`. Pinch-to-resize stays available in the in-page 3D view only, never in AR — the point of AR is honest portion size.
4. **Table placement.** `ar-placement="floor"` (horizontal surfaces, including tables).
5. **Contact shadow.** `shadow-intensity="1"` and `shadow-softness="0.6"` so the dish reads as resting on the table immediately.
6. **Real-world lighting.** Add `xr-environment` for light estimation in WebXR.
7. **iOS pre-warm.** After the GLB `load` event on iOS, prefetch the dish's USDZ at low priority (`fetch(url, { priority: 'low' })`) so Quick Look is likely to open from cache rather than start a second download.
8. **Small files = fast sessions.** Budgets from Phase 2 are part of placement speed; do not exceed them.
9. **Feedback on placement.** On `ar-status` → `object-placed`: short haptic (`navigator.vibrate?.(12)`) on supported Android devices, and log `ar_object_placed` with elapsed ms.
10. **Exit cleanly.** Returning from AR lands on the same dish sheet, same scroll position, with "Add to my table" in view.
11. **Absolute HTTPS URLs** for all model sources (Scene Viewer fetches the GLB itself).
12. **Failure path.** On `ar-status` → `failed`: one calm line ("AR couldn't start on this phone — you can still turn the dish here") and keep the 3D view. Log the failure.

---

## 8. Design guardrails

- Keep existing tokens and the Gauchos theme. One memorable moment per screen (the focus-pull loader is it for the dish sheet); keep everything else quiet.
- Sentence case throughout. Buttons say exactly what happens: "See it on your table", "Add to my table", "Show the waiter".
- Error copy explains what happened and what to do — no apologies, no vague "Something went wrong".
- Mobile-first at 360 px width; tap targets ≥ 44 px; visible focus; WCAG AA contrast in dim-light conditions.

## 9. Out of scope — do not build

Online ordering, payments, POS integration, user accounts, reviews, a searchable multi-restaurant directory (a small row of partner restaurants on the home page is fine), KTX2 textures, native apps, AI-generated food imagery of any kind.

## 10. Working rules

- Never modify files in `incoming-models/`.
- Never fabricate menu, nutrition, allergen or halal data. Ask.
- If a requirement here conflicts with what you find in the code, stop and ask rather than guessing.
- Pin every dependency to an exact version.
- One commit per phase, with the phase number in the message.
- End every phase with the report and wait for approval.
