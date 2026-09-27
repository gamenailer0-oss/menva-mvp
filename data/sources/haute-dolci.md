# Haute Dolci — Raya (Lahore) — brand & menu sourcing notes

Researched 2026-09-27 for the pitch-stage build of `data/restaurants/haute-dolci.json` and the
`haute-dolci` rows in `data/dishes.csv`. Sources used (via `mcp__Claude_Browser__*` and
`WebFetch`/`WebSearch`): hautedolci.co.uk (+ `/stores/pakistan/`, `/faqs/`), hautedolci.pk,
menumoment.com, foodpanda.pk. Instagram/Facebook were not reachable as scrollable feeds in this
session (embedded post cards only); the two campaign quotes below came from that embed on
hautedolci.co.uk's own homepage, so they are still first-party.

## Identity

- Global site title / tagline: **"Haute Dolci - It's a must!"** — hautedolci.co.uk (page `<title>`,
  2026-09-27). Used as the banner tagline (as "It's a must.", sentence-punctuated to match MENVA's
  house style; the words are theirs, verbatim).
- Campaign line, seen twice on hautedolci.co.uk's embedded Instagram feed (2026-09-27):
  **"Indulge, Capture, Share, Repeat."** — used as the Signatures category note.
- Crunch Cake caption includes **"It's a must."** repeated as a product-level sign-off (same
  phrase as the site tagline) — hautedolci.co.uk homepage, 2026-09-27.
- Etymology copy (their own menu PDF, page 3): "HAUTE [oht] — French — high class, fancy...",
  "DOLCI [dol-chi] — Italian — sweet, dessert, cake." (`hautedolci.pk/wp-content/uploads/2025/01/HD-Menu-25.pdf`,
  fetched 2026-09-27). Not used verbatim on the MVP page, kept here for reference.

## Halal — exact quote

- **"Yes, we are 100% Halal certified."** — hautedolci.co.uk/faqs/, under "Our Menu" → "Is Haute
  Dolci halal certified?" (fetched via WebFetch, 2026-09-27).
- Corroborating quote from their own printed menu PDF (page 5, allergen-sensitivity panel):
  **"All our products are Halal certified."** — `hautedolci.pk/wp-content/uploads/2025/01/HD-Menu-25.pdf`.
- The Pakistan store listing (hautedolci.co.uk/stores/pakistan/, 2026-09-27) also lists **"Halal"**
  as one of its store amenities/facilities (alongside Vegan, Gluten Free, Prayer Room, etc.).
- Because this is a company-wide certification statement about "our products"/"our menu" (not a
  per-dish claim), `halal` is set to `yes` for every Haute Dolci row in `data/dishes.csv`.

## Address, hours, interior

- Address (their own store page, hautedolci.co.uk/stores/pakistan/, 2026-09-27):
  "38 Raya Fairways, Defence Raya Golf Resort Sector M DHA Phase 6, Lahore, Punjab 54792, Pakistan".
  Same address, differently formatted, on menumoment.com (2026-07-29 post date).
- Hours — two sources differ slightly:
  - hautedolci.co.uk/stores/pakistan/ (2026-09-27): Mon–Thu 09:00–00:00, Fri–Sun 09:00–01:00
    ("Dining in ends 30 mins before closing").
  - menumoment.com (2026-07-29): "Monday - Sunday: 08:00 AM – 01:00 AM".
  `hours` field uses the more detailed/current co.uk store page: "Daily, 9am–midnight (1am Fri–Sun)".
- Interior, their own words (hautedolci.co.uk/stores/pakistan/, 2026-09-27): "an interior in lavish
  pink and black tones, accompanied by comfortable plush soft furnishings... seating capacity of 92
  guests." Confirmed visually via screenshot of that page: black header with the "HAUTE | DOLCI"
  wordmark, blush-pink and copper-rust channel-tufted velvet banquettes under a cherry-blossom
  ceiling installation, grey velvet chairs, marble-topped tables.
- "Haute Dolci's first international venture" (Pakistan store copy, same source) — used in
  `description`.

## Logo

- Primary wordmark, black-on-transparent, downloaded directly from their own Pakistan site (never
  redrawn): `https://hautedolci.pk/wp-content/themes/hautedolci/images/logos/haute-dolci-black.png`
  (700×43 PNG) → saved as `assets/restaurant/haute-dolci-logo-black.png`. A second, white-on-transparent
  variant exists at the sibling path `.../logos/haute-dolci.png` (1040×63) for dark surfaces; rather
  than shipping a second file we invert the black PNG with CSS (`filter: invert(1)`) in dark mode,
  since it is a flat monochrome mark — see `.band-logo-wide` in `css/style.css`.
- No separate circular/icon mark was found on either public site (favicon endpoints 404'd on both
  domains in this session) — their printed menu PDF has a plain serif "HD" ligature on its closing
  page, but that appears to be a print-only flourish, not a published brand asset, so it was not
  used. The banner therefore shows the real wordmark as a wide lockup (`.band-logo-wide`) rather
  than forcing it into a circular crop, which would clip the lettering.
- Note on logo quality: the source PNG is small (700×43 / ~40px cap-height) and was clearly exported
  for a website header, not for print — it upscales acceptably to the ~27px display height used in
  the banner and OG card, but is not vector. If Abdullah can get an SVG or a higher-resolution export
  from Haute Dolci directly, it should replace this file at the same path.

## Colours & fonts (sampled 2026-09-27)

- Header/nav background: `rgb(0,0,0)` (pure black) — computed style, hautedolci.co.uk.
- "Book now" button background: `rgb(242,231,224)` (`#F2E7E0`, soft blush cream) — computed style,
  hautedolci.co.uk.
- Body/heading font family, computed on `h1`/`h2`/buttons on both hautedolci.co.uk and
  hautedolci.pk: **`FuturaPT-Light`** (a licensed commercial font, not available via @fontsource).
  Closest OFL match used instead: **Jost** (`@fontsource/jost`, SIL OFL 1.1) — a geometric sans in
  the same Futura/Kabel family, available in the light (300) and medium (500) weights we vendor.
  Wired in as `--font-display` for the `haute-dolci` theme only (`css/tokens.css`), so dish names,
  the banner tagline and section headings all pick it up.
- Interior palette (from the Pakistan store screenshot, sampled by eye against the rendered page):
  blush/rose banquette fabric, warm copper-rust lower channel tufting, cherry-blossom pink overhead,
  black header band, cream marble tabletops, grey velvet chairs. `css/tokens.css`
  `[data-theme="haute-dolci"]` derives a blush paper (`#FAF3F2`), a deep raspberry accent
  (`#9C2F52`, 6.5:1 on the paper) and a dusty-rose brand band (`#E7C3C8`) from this — see the
  contrast table below.
- MENVA's own DM Sans stays as `--font-body` (their own body font, NunitoSans-Regular, is a similar
  humanist sans, so no swap was needed there).

### Contrast (computed, WCAG relative-luminance formula)

| Pair | Ratio |
|---|---|
| Light ink `#1C1416` on paper `#FAF3F2` | 16.5:1 |
| Light muted `#6B5B57` on paper | 5.9:1 |
| Light accent `#9C2F52` on paper (price/label text) | 6.5:1 |
| White on accent (button fill) | 9.9:1 |
| Ink on brand-band (blush `#E7C3C8`) | 11.2:1 |
| Dark-mode ink `#F5E9E7` on dark paper `#1A1113` | 15.6:1 |
| Dark-mode muted `#C9AFAE` on dark paper | 9.0:1 |
| Dark-mode accent `#E58AA8` on dark paper | 7.5:1 |

All pairs clear the 4.5:1 minimum with margin.

## Menu — Signatures (featured first)

| Dish | Price (PKR) | Source | Notes |
|---|---|---|---|
| San Sebastián Cheesecake | 1,999 | menumoment.com (2026-07-29) **and** foodpanda.pk "Haute Dolci - Raya" listing (2026-09-27) — both agree | "Creamy Basque cheesecake baked to perfection with a caramelised top, served with smooth Belgian milk chocolate" (foodpanda copy; menumoment gives "Signature burnt Basque cheesecake, silky centre") |
| Matilda Cake | 1,750 | menumoment.com **and** foodpanda.pk "Cakes" category — both agree | "Layers of moist chocolate sponge cake generously covered in velvety chocolate frosting, topped with chocolate shavings and a drizzle of fudge sauce" (foodpanda copy). NOTE: foodpanda also lists a *second*, pricier "Matilda Cake" (Rs. 1,850, pistachio ganache + katifi) under its "Signature Collection" — that is a different item; the featured signature uses the 1,750 version that both sources agree on. |
| Cookie Dough | **TO_CONFIRM** | not found | Not listed on either the current foodpanda.pk "Haute Dolci - Raya" menu or menumoment.com's Raya menu post. Haute Dolci's UK master menu PDF (`hautedolci.pk/wp-content/uploads/2025/01/HD-Menu-25.pdf`) has a whole "COOKIE DOUGH" category (e.g. "Slumber Party Special", "I Knead You") but that PDF is explicitly the UK/global menu ("Prices and products vary depending on store") and none of its items or GBP prices were carried over. Kept as a featured Signature per instructions, with `price_pkr` and `description` left `TO_CONFIRM` — **Abdullah should confirm the exact Raya name and price before this goes live.** |

## Menu — other categories (all from foodpanda.pk "Haute Dolci - Raya", live listing fetched
2026-09-27, cross-checked against menumoment.com 2026-07-29 where the same item appears)

Most items matched exactly between the two sources. Where they disagreed, the more recently
fetched foodpanda.pk price was used (it is a live ordering page, whereas menumoment is a static
blog post from ~2 months earlier) and the discrepancy is logged here rather than silently dropped:

- **Flat White**: foodpanda 1,350 vs menumoment 1,250 → used 1,350.
- **Cookie Blast Milkshake**: foodpanda 1,350 vs menumoment 1,250 → used 1,350.
- **Americano**: menumoment gives one line "Americano (Hot/Cold) 800/900"; foodpanda lists them
  as two separate products, both 900 ("Hot Americano", "Cold Americano") → used foodpanda's two
  separate rows/prices.

Categories included (see `data/dishes.csv`, restaurant `haute-dolci`): Cakes, Signature Collection,
All Day Breakfast, French Toast, Pancakes, Waffles, French Crêpes, Classic Collection (desserts),
Coffee & Hot Beverages, Milkshakes, Mocktails. Pizza and burger items exist on the live foodpanda
listing too (HD Signature Pizza, Chilli Cheese Burger, etc.) but were left out of this pitch build
to keep the menu focused on the dessert/brunch/coffee identity the brand markets itself on
("Desserts" cuisine tag) — Abdullah can ask for the full parity pass later.

Every row: `ingredients`, `allergens` = `TO_CONFIRM` (never guessed); `halal` = `yes` (see quote
above); `spice_level`, `dietary`, nutrition columns = blank/unconfirmed; `confirmed_by` left blank
(no named confirmation from Abdullah yet — these are public-listing prices only, not restaurant-
confirmed). `is_3d` = `yes` only for the three Signatures (no pipeline output exists yet for any of
them — `build-data.mjs` correctly warns and serves them as plain text rows, `has3d: false`, until
real scans land).

## Sources checked with no usable data

- Instagram (@hautedolcipk / @hautedolci) and Facebook (hautedolcipk) could not be browsed as a
  scrollable public feed in this session (login-gated or embed-only); the two campaign quotes above
  came from the Instagram embed already present on hautedolci.co.uk's own homepage.
- `hautedolci.pk/wp-content/uploads/2025/01/HD-Menu-25.pdf` and the older
  `hautedolci.pk/wp-content/themes/hautedolci/pdfs/haute-dolci-menu-2022.pdf` are the **UK/global**
  menu (GBP prices, UK-only items like "Iceburg" burgers, Cheetos collab items) — read in full for
  brand voice/description text only; no GBP price or UK-only item was carried into the PKR menu.
