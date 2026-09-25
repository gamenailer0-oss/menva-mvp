# Partner restaurant kit

What happens from the day a restaurant says yes to the pilot review, and what marketing it gets. Use it as the onboarding checklist, and show the "What you get" list in the demo.

**Rule:** nothing names or shows a partner publicly until they've said yes in writing (WhatsApp is fine, but keep it). Quotes are only their real words, approved by them.

## What we need from the restaurant (week −1)

| Item | Why | Where it goes |
|---|---|---|
| Written OK to be named and shown by MENVA | Every public mention depends on it | Keep the message |
| The dishes to scan, with the real name, price, description, allergens, halal status, spice level, and who confirmed it | The menu shows only confirmed data. Anything missing shows "Please confirm with your server" | `data/dishes.csv` (`confirmed_by` column) |
| Plate sizes (length × width in cm) | True size in AR depends on it | `data/dishes.csv` |
| Number of tables | One QR per table | `npm run qr -- --tables N` |
| Wifi check at a busy hour | The menu is built for slow wifi, but check it | Demo on their floor |
| 10 minutes with the floor staff | They explain it to guests | The staff card |
| A contact for photos and filming, and whether filming is OK | Reels, "first reactions" | reels.md, campaigns.md #5 |

## What the restaurant gets

**At the table:** a QR code per table, a table tent per table, a sticker on the menu cover, a window sticker by the door (`social/print/print.mjs --restaurant "Name" --domain …`), and a waiter briefing card per staff member (`staff-card.pdf`).

**Online, once they say yes:**
- An announcement carousel and an owner-note post (templates in `social/content/partner-launch.json`; replace every `{{…}}`, add their scanned dishes, then swap them into the calendar).
- Stories on launch week: the auto Story from the announcement, plus 2 manual Stories (the 9:16 layouts in `content/ads-9x16.json` style).
- A Dish drop week for their best-looking scan (trend-bank "Dish drop" posts as the pattern).
- Their dishes in "This or that" posts (with their OK).
- One Reel when filming is allowed (reels.md "first reactions" style; consent for every face).
- Optional: a micro-influencer table visit (research/influencers.md). The restaurant decides whether to comp the meal.

**At the end:** the pilot results report from their own numbers (`node social/print/pilot-report.mjs stats.csv --restaurant "Name"`), in a 20-minute review meeting.

## Timeline

| When | MENVA | Restaurant |
|---|---|---|
| Week −1 | Collect dish data, scan the dishes, run the pipeline, check the scans with the chef | Confirm the dish data; say yes in writing |
| Day −2 | Print tents, stickers, staff cards, QR codes | Choose a quiet hour for the staff briefing |
| Day 0 | Place everything, brief the staff (10 min), test 3 tables on the restaurant wifi | Staff mention it when handing over the menu |
| Day 1 | Announcement carousel + Story | Repost it; put the QR on their own Instagram Story |
| Week 1 | Watch /stats daily; fix anything guests trip on | Tell us what guests ask |
| Weeks 2–3 | Dish drop post, This or that, a Reel if filming is OK | Optional: influencer visit |
| Week 4 | Pilot report + review meeting | Decide: continue, expand, or stop |

## The review meeting (20 minutes)

1. Show the report: scans, dish opens, dishes placed in AR, lists shown to waiters (sales-kit.md §9).
2. Ask the team what guests said. Write it down in their words.
3. If they'd like to continue: propose the next step you've decided on (post-pilot pricing options are in sales-kit.md §10, still to be decided).
4. Ask for a quote for the owner-note post, and a referral to one other restaurant owner.

## Needs Abdullah
- Decide what the pilot includes and costs after the pilot (sales-kit.md §6, §10). The kit doesn't promise either.
- Who does the scanning, and how long it takes per dish. The timeline above assumes one week.
- Approve every public mention of a partner, and every quote.
