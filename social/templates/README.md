# Post template ("A · Chili")

`post.html` draws one 1080×1350 slide from JSON, passed either as `?d=<base64url JSON>` (what the server sends) or as `#<URL-encoded JSON>` (handy for editing by hand in a browser; serve the repo root, e.g. `npx serve .`).

## Fields (all optional unless noted)

| Field | Meaning |
|---|---|
| `layout` (required) | `hero`, `statement`, `phone`, `step`, `split`, `duo`, `note`, `closeup`, `list`, `cta` |
| `bg` | `paper` (default), `sand`, `white`, `chili`, `ink` |
| `over` | overline, top left (small caps) |
| `n` | slide counter, top right, e.g. `2/5` |
| `h` (required) | headline. `*word*` = italic chili accent, `**word**` = bold, `\n` = line break |
| `size` | headline size: `xl`, `l`, `m`, `s` (each layout has its own default) |
| `b` | body text |
| `ru` | Roman Urdu line (shown under the body, muted) |
| `dish` | `steak-main`, `steak-sandwich`, `garlic-prawn-skewers`, `chicken-fajita-wrap` |
| `crop` | named crop of that dish (see `CROPS` in `post.js`). The default is the dish's widest logo-free crop |
| `dishes`, `crops`, `labels` | `duo` only: two of each |
| `items` | `list` only: the rows |
| `num` | `step` only: the big number, e.g. `01` |
| `menuLine`, `menuDesc`, `leftLabel`, `rightLabel` | `split` only |
| `pill` | `phone` only: the button text on the screen (default "See it on your table") |
| `by` | `note` only: the signature |
| `actions` | `cta` only: pill buttons, e.g. `["DM \"PILOT\"", "Link in bio"]` |
| `cta` | any layout: a pill in the footer instead of the handle |
| `handle` | the footer handle (the server fills it from `IG_HANDLE`) |
| `brandOk` | allows crops that show the restaurant's logo. Only with Abdullah's OK |

## Crops and branding

The dish images are the real renders in `assets/dishes/<id>/poster.webp` (1200×900, transparent). Each crop is a box in poster pixels. `steak-main` and `chicken-fajita-wrap` have "Gauchos" carved into the board, so their default crops stop short of it. The `full` crop of those two is marked `brand: true` and is refused unless `brandOk` is set. Crops are never enlarged more than 2×, so they stay sharp.

When fonts and images have loaded, the page sets `window.__ready = true`. Gotenberg waits for that. Any problem (an unknown dish, crop or layout, or a missing image) sets `window.__error` and throws, and Gotenberg then refuses the render.
