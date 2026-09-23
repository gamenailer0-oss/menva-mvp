# bella Kitchen Appliances — Style Reference
> Sunlit kitchen counter at golden hour — warm cream surfaces with a single pop of coral.

Source: Refero Styles — https://styles.refero.design/style/e327d332-270d-4779-a55c-cd82b8624d2a (saved 2026-09-24 as the base reference for the MENVA consumer redesign; see ../MENVA.DESIGN.md for how we adapt it).

**Theme:** light

bella is a warm, domestic kitchen-counter aesthetic built on a cream-and-coral palette that feels sunlit rather than clinical. The entire interface rests on a warm off-white canvas (#ebeadf) with slightly warmer beige cards (#d5cec0) and white surfaces floating above — layers are defined by hue temperature, not stark contrast. A single saturated coral accent (#f04923) provides all the energy: bestseller tags, promotional cards, price highlights, and active states. Typography uses a geometric sans (Supreme LL TT) with uniformly tight -0.05em tracking at every size, giving headings a compact, modern posture. The design avoids shadows in favor of color-temperature layering and 12px rounded corners; buttons and badges are full pills (999px). The overall feel is approachable, appetite-driven, and product-forward — photography does the heavy atmospheric lifting while the UI stays minimal and warm.

## Tokens — Colors

| Name | Value | Role |
|------|-------|------|
| Warm Canvas | `#ebeadf` | Page background — the foundational warm off-white |
| Pristine Surface | `#ffffff` | Elevated cards, navigation bar, pill button fills |
| Sand Beige | `#d5cec0` | Secondary card surfaces and warm panels for grouping |
| Ink Black | `#000000` | Primary text, icon strokes, hairline borders, wordmark |
| Coral Pulse | `#f04923` | Badges, promotional cards, price callouts, active accents — the single warm energy |

## Tokens — Typography
- Supreme LL TT (substitute: Inter, DM Sans, General Sans), weights 400 / 700, uniformly tight -0.05em tracking.
- Scale: caption 13 · body 16 · subheading 18 · heading-sm 22 · heading 24 · display 40 (line-height 1.1).

## Tokens — Spacing & Shapes
- Base unit 4px, comfortable density. Scale 4 8 12 16 20 24 32 40 64 72 96 116.
- Radius: cards 12px; buttons, badges, tags 999px (pills).
- Layout: max width 1200px, section gap 80px, card padding 24px, element gap 12px.

## Components (summary)
- **Top nav:** white rounded bar floating on the warm canvas, wordmark left, links, search right.
- **Product card:** white, 12px radius, 24px padding, cut-out product image, name 16/700, price 14/400, optional coral pill badge.
- **Featured product card:** full coral background, white text, product image, white pill CTA.
- **Hero banner:** split — large photographic area with a floating product (surreal, whimsical: a toaster lifted by balloons) + a coral featured card.
- **Pill button:** 999px, 12×24 padding, white fill + 1px black border, or ghost.

## Do
- Warm cream canvas for all non-card areas; coral only as a functional accent.
- Pills for every button, badge and tag; 12px radius for every card and image container.
- Depth by surface temperature: canvas → sand → white. Never by drop shadow.

## Don't
- No stark white page background, no drop shadows, no second accent colour, no blue UI colour, no sharp corners, no long centered body text.

## Imagery
Product cut-outs on white/cream are the hero; the object is the visual identity. Warm, natural colour. No illustrations beyond functional UI.

## Elevation philosophy
Flat and warm — objects resting on a sunlit counter rather than floating in digital space. When a surface should feel on top, make it whiter; when it should recede, make it more beige.
