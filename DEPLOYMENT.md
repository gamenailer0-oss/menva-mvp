# MENVA — Deployment Guide

## Quick Netlify Deploy

1. **Upload the `menva/` folder** to Netlify (drag & drop or connect repo)
2. **Deploy** — Netlify will serve it as a static site automatically
3. **Open the link** — it just works

## Build Settings
- **No build command needed** — this is a static site
- **Publish directory:** `.` (root of the menva folder)
- **No environment variables required**

## What's Inside

```
menva/
├── index.html          # Entry point
├── css/
│   ├── tokens.css      # Brand colors, dark mode, per-restaurant themes
│   ├── base.css        # Reset, typography
│   └── style.css       # All component styles
├── js/
│   ├── appearance.js   # Dark mode bootstrap (runs before paint)
│   ├── data.js         # Restaurant/dish data + nutrition + Gauchos menu
│   └── app.js          # Router, views, dish modal, 3D viewer
├── models/
│   ├── gauchos-steak-sandwich.glb   # 1.1MB — 3D model (web)
│   ├── gauchos-steak-sandwich.usdz  # 1.1MB — AR model (iOS)
│   ├── gauchos-steak-main.glb       # 1.2MB — 3D model (web)
│   └── gauchos-steak-main.usdz      # 1.5MB — AR model (iOS)
├── assets/
│   └── cheffy/
│       ├── wave.webp       # Cheffy waving (hero)
│       └── thinking.webp   # Cheffy thinking (dish modal)
├── netlify.toml         # Netlify config
└── .gitignore
```

## Features
- 3D dish viewer with model-viewer (lazy loaded)
- AR support: iOS Quick Look (USDZ), Android Scene Viewer (GLB)
- Dark mode with system preference detection
- Per-restaurant theming (Gauchos = warm terracotta)
- Native dialog modal with focus trap
- Nutrition info per dish (calories, protein, fat, carbs, cut, weight)
- Full Gauchos menu (60+ items from Foodpanda) with search & filter
- Cheffy mascot cameos (subtle, noble, artistic)
- Mobile-first responsive design
- touch-action: pan-y on all 3D viewers (no mobile scroll hijacking)

## Adding More Restaurants
Add entries to `MENVA_DATA.restaurants` in `js/data.js`. Each restaurant can have:
- Custom theme colors (via CSS tokens)
- Dishes with optional 3D models (GLB + USDZ)
- Nutrition data per dish
- Full menu data for the published menu section

## Adding More 3D Models
1. Place `.glb` (web) and `.usdz` (AR) files in `models/`
2. Reference them in dish data: `glb: "models/your-dish.glb"`, `usdz: "models/your-dish.usdz"`
3. Keep GLB under 1.5MB for fast loading (512px textures recommended)
