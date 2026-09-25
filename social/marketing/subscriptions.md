# Diner plans: MENVA Plus and MENVA Black

Decided with Abdullah on 25 Sep:

| Plan | Price | What it gives |
|---|---|---|
| **Free** | PKR 0 | 3D and AR at partner restaurant tables through the table QR. Free at the table, always (the restaurant's pilot covers it). |
| **MENVA Plus** | PKR 99/month | 3D and AR anywhere: from home, in the car, before you pick a place. |
| **MENVA Black** | PKR 599/month | The black badge, tiers earned **by visits** (Regular → Known → Top Table → Legend), and perks at partner restaurants **as they join**. |

**Ranking rules:** tiers come from visits to partner tables, never rupees. The leaderboard is opt-in, shows first names or handles only and never shows amounts. That keeps the "status" feeling without the safety risk or the flaunting backlash.

**Brand:** MENVA is its own brand. Gauchos is never named, and posts say "a partner restaurant". The carved logo appearing in 3D demos or filming is acceptable.

## What's ready
- `content/subscriptions-launch.json`: 8 launch posts, previewed in `previews/subscriptions-launch-sheet-1.jpg`:
  - "MENVA has levels now" carousel
  - Plus "sized up from your bed"
  - "Not everyone gets the black badge" + the tier ladder
  - Ali bhai gets the badge (a *Khana kahan?* bonus)
  - FAQ, including "Is the table 3D still free? Yes."
  - "See it anywhere, or be seen?"
  - Founding-partner pitch for restaurants
  - Plus pizza cover
- The rule checker now allows PKR 99 and PKR 599 as well as PKR 25,000. Dish prices are still refused.

## Why they aren't scheduled yet
The app on `main` has no subscribe or checkout page yet, so an automatic post saying "PKR 99, link in bio" would lead nowhere. When checkout is live:
1. Swap the 8 posts into the calendar (week of launch: carousel on day 1, FAQ on day 2, Plus and Black on the next posting days), or turn the file into `series-subscriptions.json` with real days.
2. Add the checkout link to the bio.
3. Pin the "levels" carousel.

## Still needed before paid plans are advertised
- A checkout (JazzCash / Easypaisa / card), terms and a refund or cancel policy page.
- Written perk agreements with each restaurant before naming a perk. Until then the copy stays "perks as partner restaurants join".
- A visit count the ranking can trust (for example a check-in when the table QR is scanned with the account signed in).

## Restaurant angle (founding partners)
Pilot framing is **founding partner**. The pitch: MENVA Black members climb tiers by visiting partner tables, and founding partners choose their own perk for them and are listed first. See `outreach-spiced.md`.
