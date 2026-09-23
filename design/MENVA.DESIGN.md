# MENVA — Design system (consumer redesign)

> Sunlit counter, one ember of colour, and the dish is the hero. Based on bella (references/bella.DESIGN.md), adapted for a fine-dining AR menu.

## Principles
1. **The dish is the hero, AR is the promise.** Every screen should make "see it on your table" feel real and tempting.
2. **One accent per context.** MENVA pages use Ember; a restaurant's own pages use the restaurant's accent (Gauchos oxblood). Never both on one screen.
3. **Depth by warmth, not shadow.** Cream canvas → sand panel → white surface. Shadows only on physical objects: the phone mockup, the dish's contact shadow, the bottom sheet.
4. **Motion explains, never decorates.** Each animation shows cause and effect (a dish lands, a card lifts under a finger, a section arrives as you reach it). Short, eased, no bounce, no loops except the hero demo.
5. **Consumer-simple.** Big tap targets (≥ 44 px), pill buttons, one primary action per screen, sentence case.

## Colour tokens (light)
| Token | Value | Use |
|---|---|---|
| `--paper` | `#EFEBE2` | Page canvas (warm cream) |
| `--surface` | `#FFFFFF` | Cards, sheet, header pill |
| `--surface-2` | `#E3DCCF` | Sand panels, image wells, chips at rest |
| `--line` | `#DCD3C4` | Hairlines |
| `--ink` | `#1A1714` | Text, icons |
| `--muted` | `#5C5349` | Secondary text (≥ 4.5:1 on paper) |
| `--accent` | `#B5371F` Ember (MENVA; 5.0:1 on paper, 5.95:1 under white text) · `#7C2A1C` oxblood (`[data-theme="gauchos"]`) | Primary buttons, prices, active states — never large fills |
| `--accent-ink` | `#FFFFFF` | Text on accent |
| `--stage` | `#E9E3D7` | Behind dish renders (a tablecloth, not a void) |
| `--gold` | `#9C7C45` | Only the Gauchos cover card frame |

Dark mode stays available via the toggle (warm near-black; accent lightened for contrast). Light is the default.

## Type
- Display: **Instrument Serif** 400 (italic for the one emphasised word) — headlines, dish names, section titles.
- UI/body: **DM Sans** 400/500/600, letter-spacing −0.01em; body 16 px on phones.
- Overlines: 11–12 px, uppercase, +0.12em, `--muted`.
- Prices: tabular numerals, `--accent`.

## Shape & space
- Radius: cards / image wells 16 px; buttons, badges, chips, table chip 999 px (pills); sheet top corners 24 px.
- Spacing on a 4 px grid; mobile gutters 20 px; section gap 64 px (desktop 96 px).
- Max width 1120 px.

## Components
- **Pill button (primary):** accent fill, white text, 52 px min height, 0 20 px padding, 600 weight. Press: scale .97 over 120 ms.
- **Pill button (secondary):** transparent, 1 px ink border, ink text.
- **Header:** wordmark "menva." left (always a link home), theme toggle right. 64 px tall, hairline below.
- **Dish card:** white card, 16 px radius, poster in a `--stage` well, name in serif, price in accent, 1–2 line description. "See it on your table" pill on the photo (white, ink text, AR icon).
- **Chips (category bar):** sand pills; active = ink fill + white text, with the fill sliding between chips.

## Motion
Tokens: `--ease-out: cubic-bezier(.2,.8,.2,1)`, `--ease-in-out: cubic-bezier(.65,0,.35,1)`; durations `--dur-fast: 140ms`, `--dur: 280ms`, `--dur-slow: 560ms`.

| Moment | Motion |
|---|---|
| **Home hero (the AR story)** | Phone mockup loops ~9 s: camera view of a table → plane-detection dots fade in → reticle settles → the real dish drops in, lands with a contact-shadow bloom → "True size · 42 cm" measure line draws → hold → reset. |
| Section / card arrival | Fade + 16 px rise, 560 ms, staggered 60 ms per item, once per element (IntersectionObserver). |
| Card press | scale .98 on press (touch and mouse); on devices with a fine pointer, a ≤ 4° tilt toward the cursor. |
| "See it on your table" pill | A soft light sweep across the pill every ~6 s while on screen — the only repeating accent. |
| Category chip | Active pill fill slides to the new chip (transform, 280 ms). |
| Dish sheet | Existing rise + The Pass loader (unchanged). |

Rules:
- Animate only `transform` and `opacity` (and `filter` in The Pass). No layout properties.
- Nothing hides content before JS runs: reveal styles apply only under `html.js-motion`.
- `prefers-reduced-motion: reduce` → no loops, no tilt, no reveal movement; the hero shows its final frame.
- No animation libraries, no Lottie, no GIF/video. CSS + a few lines of JS.

## Don't
No emoji, no glassmorphism, no neon, no gradients as decoration, no bouncy/elastic easing, no generic marketing copy, no second accent colour on a screen.
