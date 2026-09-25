# Baraza Coffee — menu sourcing notes

Researched 2026-09-25 for the sales-pitch update to `data/dishes.csv` (restaurant `baraza`).
Baraza Coffee — Gulberg III & Johar Town, Lahore. barazacoffee.com · @barazacoffee.

Primary source used for prices: **foodpanda.pk restaurant page**, accessed via the in-app
browser tool (get_page_text) on 2026-09-25, since direct WebFetch to foodpanda.pk returns 403.
URL: https://www.foodpanda.pk/restaurant/ku4p/baraza-coffee-ku4p

IMPORTANT CAVEAT: foodpanda item descriptions are platform-generated filler text (each one
ends "For reference only.") — NOT verbatim restaurant copy. Only the item **names** and
**PKR prices** were used from this source; descriptions/ingredients were NOT copied into the CSV.

## A note on a false lead

A search result surfaced a PDF titled "Baraza menu for Website" — this is a **different,
unrelated restaurant** ("BARAZA grill, café & bar", Dar es Salaam, Tanzania; prices in TZS,
items like "Zanzibar Burger", "Ugali"). It was NOT used for any data below.

## Items added/updated (all from foodpanda.pk, seen 2026-09-25)

| Item (as listed) | Price (PKR) | Category on foodpanda | Mapped CSV category |
|---|---|---|---|
| Flat White (Hot) | 649 | Classic Brews Hot and Iced | Specialty Coffee |
| Hot Cappuccino | 599 | Classic Brews Hot and Iced | Specialty Coffee |
| Hot Latte | 599 | Classic Brews Hot and Iced | Specialty Coffee |
| Hot V60 | 1,299 | Pour Over Coffee Hot and Iced | Specialty Coffee |
| Iced Cold Brew | 1,399 | Pour Over Coffee Hot and Iced | Chillers (existing `bz-cold-brew` row) |
| Iced Latte | 649 | Classic Brews Hot and Iced | Chillers |
| Iced Americano | 549 | Classic Brews Hot and Iced | Chillers |
| Classic Iced Matcha | 849 | Matchas Bar | Chillers |
| Baraza Signature Omelet | 1,499 | Morning Rituals | Brunch |
| Shakshuka | 1,499 | Morning Rituals | Brunch |
| Lotus Ricotta Pancake | 1,199 | Morning Rituals | Brunch |
| Chargrilled Chicken Burger | 1,299 | Burger | Kitchen |
| Classic Club Sandwich | 1,499 | Sandwiches and Panini | Kitchen |
| Crispy Parmesan Chicken | 1,699 | Main Course | Kitchen |
| New York Cheese Cake | 549 | The Sweet Side | Sweet Side |
| Burnt Cheesecake | 799 | The Sweet Side | Sweet Side |
| Nutella Croissant | 750 | Croissant | Sweet Side |

## Existing rows checked against foodpanda — no exact match found, left as TO_CONFIRM

- `bz-ethiopian-pour-over` "Ethiopian Pour Over" — foodpanda's Pour Over category lists
  brew methods (V60, Chemex, Aeropress, Kalita Wave, Clever Dripper, Siphon), not bean
  origin, so no item is literally named "Ethiopian Pour Over". Hot pour-over prices on
  foodpanda range Rs. 1,199–1,399 for reference, but none was recorded to the CSV since
  the name doesn't match a specific listed item.
- `bz-nitro-float` "Nitro Float" — not found on foodpanda menu.
- `bz-english-breakfast` "English Breakfast" — confirmed as a REAL item (see below) but no
  price found in any public source.
- `bz-avocado-toast` "Smashed Avocado Toast" — not found by this name on foodpanda
  (closest category is "Morning Rituals", which doesn't list an avocado toast item).

## Chicken pizza (dish id `bz-chicken-pizza`) — NOT CONFIRMED

No public source found lists a pizza item on Baraza Coffee's menu:
- foodpanda.pk (comprehensive: Starters, Burger, Sandwiches/Panini, Main Course, Pasta,
  Salad, all coffee/matcha/shake/mocktail categories) has **no Pizza category or item**.
- Facebook (facebook.com/BarazaCoffee, facebook.com/BarazaCoffeeJoharTown), Instagram
  (@barazacoffee), and Google Maps listing did not surface a pizza item or price in the
  publicly accessible content (Facebook/Instagram largely require login to browse posts).
- Web search for "Baraza Coffee" + "pizza" / "chicken pizza" returned no matching result.

The CSV row `bz-chicken-pizza` was added with name "Chicken Pizza" as a **placeholder** —
this is NOT a name seen on any Baraza source, category Kitchen, `price_pkr=TO_CONFIRM`.
**Abdullah must confirm the exact printed name and price with Baraza before the pitch**,
ideally by asking Baraza directly or checking their physical Kitchen menu / a dine-in visit,
since it doesn't appear on their delivery-platform listing.

## Other corroborating source

- Facebook post (facebook.com/BarazaCoffee, "Foodies by Ashir and Baraza Coffee", posted
  ~2 days before 2026-09-25) — video titled "Trying English Breakfast from Viral Coffee
  Spot Baraza Coffee". Confirms English Breakfast is a real, current menu item, but the
  post text visible without login gave no price.

## Sources checked with no usable data

- barazacoffee.com — homepage only; no menu page/PDF found via WebFetch.
- menupoint.pk — no Baraza Coffee listing found.
- Google Maps listing (Baraza Coffee, Gulberg) — menu tab requires sign-in to view in the
  limited browser session; only address/contact info was accessible.
- cheetay.pk / eatoye — no accessible listing found via search.
