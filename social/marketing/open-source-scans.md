# More dishes for variety: open-source food scans

Abdullah asked (25 Sep) for more variety: the chicken pizza (done) plus free, high-quality, open-source scans.

## The rule that decides how they can be used
Every post says MENVA shows **the real dish from the restaurant's kitchen**. An open-source scan is a real scan, but not a partner restaurant's dish. So:
- **Allowed:** "how it works" and "any dish can be scanned" content, clearly captioned, e.g. "A sample scan, not on any Lahore menu yet". Also the demo site's sample menu, labelled "sample".
- **Not allowed:** presenting it as a Lahore restaurant's dish, giving it a price, or using it in "real plate from the kitchen" posts.
- **Never:** AI-generated models (the Meshy "food" library is AI-generated, so it's out), or cartoon or low-poly kits (the Kenney/Eclair food kit), which would undercut "real scans, not renders".

## Where to look (real photogrammetry only)
| Source | What's there | Licence to check |
|---|---|---|
| [Sketchfab: food-photogrammetry tag](https://sketchfab.com/tags/food-photogrammetry), [food-scan tag](https://sketchfab.com/tags/food-scan), [scans of food collection](https://sketchfab.com/riccardogiorato/collections/scans-of-food-dbffecc2e0a142d8aa6e959a25556689) | Many real food scans, several downloadable | Filter to **CC0** or **CC BY** (credit the author in the caption and alt text). Skip "NoDerivatives" and "NonCommercial" |
| [Sketchfab: Hyderabadi chicken biryani](https://sketchfab.com/3d-models/biryani-9ff4941a041d4e08933edf3dcefe2280) | A very local dish | The description says photogrammetry **plus AI tools**, so it's excluded unless the author confirms it has no AI texturing |
| [Polycam: food](https://poly.cam/3d-models/food) | Phone LiDAR and photogrammetry scans (pizza, burgers, desserts) | Licence varies per model. Many aren't licensed for reuse, so use only ones marked CC0 or CC BY |
| [CG Channel: free scans from Creative Crops](https://www.cgchannel.com/2018/12/download-free-3d-scans-of-food-from-creative-crops/) | Pro-quality food scans | Read the pack's own licence before any commercial use |

## Why nothing was downloaded yet
This container's network blocks Sketchfab, Polycam, Poly Haven and CG Channel (see OPEN-QUESTIONS.md). To add one:
1. Download the GLB on a normal connection, and save the licence page as a PDF next to it.
2. Put it in `incoming-models/sample-<name>.glb` and run `npm run pipeline`. This makes the poster, spin and USDZ exactly like the real dishes.
3. Add its logo-free crops to `social/templates/post.js` with a `sample: true` note, and caption every use "Sample scan".

**Better than all of these:** scan two or three more real Lahore dishes. Every real scan is worth more in marketing than any sample.
