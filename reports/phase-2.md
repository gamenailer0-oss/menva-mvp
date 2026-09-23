# Phase 2 — Asset pipeline

`npm run pipeline` turns `incoming-models/` into `assets/dishes/<id>/` (model.glb, model.usdz, poster.webp, poster-blur.webp, spin.webp, meta.json). ~15 s per dish; unchanged dishes are skipped. Originals never touched (hash-verified).

## Before / after — all within budget

| Dish | Before | GLB (≤1.2 MB) | USDZ (≤1.8 MB) | Poster (≤80 KB) | Sprite (≤300 KB) | Size (cm W×H×D) |
|---|---:|---:|---:|---:|---:|---|
| steak-main (ribeye, from the "tomahawk" scan) | 10.94 MB | 1006 KB | 1.60 MB | 75 KB | 291 KB | 29.5 × 9.4 × 42.5 |
| steak-sandwich | 1.14 MB | 237 KB | 1.49 MB | 58 KB | 288 KB | 18.4 × 6.5 × 27.6 |
| garlic-prawn-skewers | 10.52 MB | 942 KB | 1.61 MB | 68 KB | 291 KB | 27.6 × 9.2 × 17.9 |
| chicken-fajita-wrap | 9.92 MB | 852 KB | 1.69 MB | 67 KB | 285 KB | 29.1 × 8.9 × 42.1 |

All four USDZs pass `scripts/usdz-validate.mjs` (stored + 64-byte aligned).

## What the pipeline does
- Normalise pivot to bottom-centre; scale to `plate_length_cm` when confirmed (all TO_CONFIRM → scans keep their own metric scale, logged).
- Weld/dedupe/prune, uint16 indices, Draco. All scans are ~25k triangles (under the 40k limit).
- Albedo 2048 JPEG q84 with AO baked in (60% strength); normal 1024 JPEG. Budget ladder steps quality down only if needed (not needed for GLBs).
- Flat roughness 0.9 → 0.6 on all four (flagged for review). Renders look like real food, not clay.
- Posters: 1200×900 transparent WebP, dish fills the frame. Sprites: 36 frames of 480×360 in a 6×6 grid.
- USDZ exported from the processed GLB, re-packed with JPEG textures and compact geometry. To fit 1.8 MB, iPhone AR uses 1024 px textures (3 dishes also drop the normal map).

## Needs a human
1. **Dish names don't match the scans.** "Chicken fajita wrap" is **three open tacos** on a Gauchos board (Gauchos sells "Tacos"). "Garlic prawn skewers" is **prawns on toasted bread** with rocket and lemon — no skewers. Abdullah should confirm the real names.
2. **Plate size unconfirmed** for every dish → AR shows the scan's own size. Scans are metric so this is probably right, but `plate_length_cm` should be measured.
3. **Scan defects:** sandwich and prawn plates are partly missing (crescent-shaped edge). Food is intact; a re-scan would look cleaner.
4. **Steak sandwich** has 512 px colour — visibly softer than the other three. Re-scan recommended.
5. No real dish photos yet — posters are renders (they look good).
