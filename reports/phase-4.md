# Phase 4 — Dish sheet and "The Pass" loader

Screenshots: `reports/phase-4/contact-sheet.png` (top: normal, bottom: reduced motion; 0% · ~50% · served). Raw numbers: `reports/phase-4/results.json`. Re-run: `npm run build && npm run serve`, then `node tests/pass-capture.mjs`.

## Acceptance

| Check | Result |
|---|---|
| Dish image visible after tap (target < 300 ms, Fast 4G) | ✅ **8 ms** — blur-up is inline base64, zero network |
| Progress moves smoothly with real bytes | ✅ ~1,000–1,400 rim updates per load, never goes backwards |
| Kitchen line follows progress | ✅ Firing up the grill → Searing your cut → Letting it rest → Plating it for you → Served. |
| `prefers-reduced-motion` | ✅ no steam, no scale, focus resolves in 3 steps, rim still fills |
| Stall > 6 s below 40% | ✅ 360° sprite replaces the stage with "Slow connection — here it is in 360° meanwhile" |
| Tap during loading | ✅ "Almost ready" pulse, never a dead tap |
| Time to live 3D, first dish | Fast 4G 2.6 s · 1 Mbps 19 s (includes model-viewer itself, ~1 MB, on first open only) |
| Size: loader.js + loader.css | 8.2 KB raw / **3.3 KB gzipped** (what's sent). Over 6 KB only if counted uncompressed. |

## How it works
- The sheet opens on the inline blur; the poster fades in over it; both sit under a CSS focus pull (`blur 18px → 0`, `saturate 0.7 → 1`, `scale 1.04 → 1`) driven by real progress.
- Plate rim (1.5 px accent) traces clockwise from 12 o'clock with bytes. Three steam wisps rise and fade at 100%. Copy comes from `data/restaurants/gauchos.json`.
- "Served." holds 500 ms, then crossfades to live 3D. The poster is rendered with **the dish sheet's exact camera**, so the crossfade lines up without ghosting.

## Deviation from the spec (on purpose)
The spec says model-viewer's `progress` events drive the loader. Measured, they aren't honest: model-viewer averages the model with its instant lighting setup, so the bar jumps to 50% at once. Instead the app downloads the GLB (and model-viewer itself on the first dish) **in parallel with a byte counter**, then hands the URLs to model-viewer, which reads them from cache. Result: honest progress from the first byte, and a faster first load (the two downloads no longer run one after the other).

## Bugs found and fixed while testing
- The rim drew the wrong length (`vector-effect: non-scaling-stroke` breaks `pathLength` dashes).
- Poster → 3D crossfade ghosted because the poster was cropped differently from the 3D camera.
- Stall detection counted model-viewer's own bytes, so a stalled model never triggered the 360° fallback.
