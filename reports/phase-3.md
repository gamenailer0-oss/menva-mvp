# Phase 3 — Data model and menu

The menu now comes **only** from `data/dishes.csv` → `npm run build-data` → `data/build/dishes.json`. How to fill in the CSV: `data/README.md`.

## Done
- `scripts/build-data.mjs` merges the CSV, `data/restaurants/gauchos.json` (identity + loader copy) and the pipeline's `meta.json`. It stops with a clear message on bad data: unknown allergens, halal not yes/no, spice outside 0–3, non-numeric price or nutrition, duplicate ids. Tested — nothing is written when the CSV is wrong.
- Allergens restricted to the 11 in CLAUDE.md; `none` means "confirmed none", empty means "not checked yet".
- Removed the Foodpanda menu, links and "retrieved from" notice, the estimated nutrition, the stock-looking dish photos, `js/data.js` and the old `models/` folder.
- Menu: categories in CSV order; 3D dishes show their poster (instant blur first) and a "See it on your table" mark.
- Dish sheet order: price → description → halal → allergens → spice → dietary → ingredients → nutrition (collapsed). Anything empty or `TO_CONFIRM` reads "Please confirm with your server".
- Asset URLs carry a content hash (`model.glb?v=…`) so year-long caching never serves an old model.
- Fixed the Gauchos logo overlapping the cover text.
- Lighthouse mobile `/g/12`: performance 99, accessibility 100, best practices 100, SEO 100.

## Decisions I made (easy to change)
- `spice_level` `0` shows as "Please confirm" until `confirmed_by` is filled in — every row had `0` as a template default, and "Not spicy" is a claim we can't make yet.
- Placeholder descriptions ("Placeholder description — confirm with Abdullah.") are hidden.

## What diners see today
4 dishes, all with 3D. Prices show for the ribeye (PKR 3,495) and sandwich (PKR 1,295); the prawn and taco dishes say "Please confirm with your server". All allergen/halal/spice fields say the same until Abdullah fills the CSV. The rest of the Gauchos menu can be added as `is_3d=no` rows — they'll appear as clean text rows.
