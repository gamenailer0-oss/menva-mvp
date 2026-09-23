# MENVA — Deployment Guide

## Deploy on Netlify

**Option A — connect the Git repo (recommended).** Netlify reads `netlify.toml`, runs `npm run build`, and publishes the `dist/` folder. No settings to type in.

**Option B — drag and drop.** On your computer:

```
npm install
npm run build
```

Then drag the **`dist/`** folder (not the whole project) onto the Netlify dashboard.

Only `dist/` is ever published, so project files such as `CLAUDE.md`, `scripts/` and the raw scans stay private.

## Links

| URL | What it shows |
|---|---|
| `/` | MENVA brand page (no 3D) |
| `/g` | Gauchos menu |
| `/g/12` | Gauchos menu for table 12 — this is what table QR codes point to |
| `/gauchos/12` | Same as `/g/12` (long form) |

Old links like `/#/restaurant/gauchos` still work and redirect to `/g`.

## Check a deploy

The model files must be served with the right type, or iPhone AR (Quick Look) will not open:

```
curl -I https://<your-site>/models/gauchos-steak-main.glb    # content-type: model/gltf-binary
curl -I https://<your-site>/models/gauchos-steak-main.usdz   # content-type: model/vnd.usdz+zip
```

## Working locally

```
npm install
npm run vendor   # only after changing a pinned version in package.json
npm run build
npm run serve    # http://localhost:8080 — same headers and routing as netlify.toml
```

## What's where

```
index.html, sw.js, robots.txt   app shell, service worker
css/  js/                       styles and app code (no framework, no bundler)
assets/  models/                images and 3D models
vendor/                         self-hosted model-viewer, decoders, fonts (from `npm run vendor`)
scripts/                        tooling: audit, vendor, build, serve
data/                           dishes.csv (source of truth) and model-sources.json
incoming-models/                raw scans — kept on disk, never published, never edited
```

No third-party requests at runtime: model-viewer, its decoders and the fonts are all served from `/vendor`.

## Analytics (Phase 8)
The pilot results page needs two things the drag-and-drop upload can't do:
1. **Deploy from Git or the Netlify CLI** — Netlify Functions (`netlify/functions/`) only deploy that way.
2. **Set `STATS_KEY`** in Netlify → Site configuration → Environment variables (32+ random characters).

Then open `https://<your-site>/stats?key=<STATS_KEY>`. Locally, `npm run serve` runs the same functions in memory; the local key is `local-dev-stats-key`.
