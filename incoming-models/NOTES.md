# incoming-models — what's here

Three raw scans, dropped in as-is (nothing edited). Real photos of the plated dishes are NOT included — ask Abdullah for those if he has them.

| Folder | Working name | Geometry source |
|---|---|---|
| garlic-prawn-skewers | Smoked Garlic Prawn Skewers | mesh only inside the .usdz (no OBJ survived upload) |
| chicken-fajita-wrap | Grilled Chicken Fajita Wrap | .obj + .mtl present, plus .usdz |
| tomahawk-steak | Chef's Tomahawk Steak | mesh only inside the .usdz (no OBJ survived upload) |

Names are placeholders picked by Claude — rename freely once Abdullah confirms real dish names/prices.

**Pipeline note for Phase 2:** for garlic-prawn-skewers and tomahawk-steak, extract the mesh from the `.usdc` inside the `.usdz` (Blender's USD importer or `usdcat`/`usd_from_gltf` handles this) since no OBJ was captured for those two. chicken-fajita-wrap already has OBJ+MTL to convert directly.

All three `.usdz` files are already zip-**stored** (not deflated) — good, that's the format Quick Look needs. Still run them through `usdz-validate.mjs` to confirm 64-byte alignment before trusting them as-is.

Textures are 4K+ (much better than the old 512px Gauchos set) — downsample per the Phase 2 budget, don't ship full-res.
