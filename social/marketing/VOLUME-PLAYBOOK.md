# Volume playbook: win the feed like a meme page

Crumble's grid is a meme page that happens to sell cookies. They have slowed down. We post more, and every post is something people send to a friend.

## What Crumble's grid does (from their profile, 1 Oct 2026)
| Pattern | Example on their grid | Our version |
|---|---|---|
| Mostly short Reels with one line of text | "aik cup chai ... kay saath", "Aik cookie sy kya hi hoga?" | Madam ki Class Reels, plus bonus episodes |
| Nostalgia formats | Old phone SMS: "dabbe mein dabba, dabbe mein kitaab..." | Nokia SMS shayari: "ek kachori, do samosa, menu photo ka kya bharosa" |
| Chat screenshots with red-pen marks | A DM thread with words circled in red | Khana Group chats (Ayesha, Sara, Hamza, Zain) with red-pen notes |
| A named weekly day | "wake up babe, it's Amplifier Thursday" | "wake up babe, it's Jhoota Thursday": Jumbo's lie of the week |
| Comment-to-win guessing | "Guess the next drop, 3 winners get a free box" | The hunt (Rooms 1 to 9), then "guess Jumbo's next lie" |
| Collabs with other local brands | "ft Pakistan Sweet Home" | Partner restaurants (after launch, with their written OK) |
| Real footage: customers, kids, staff | Kids eating, staff unboxing | Needs you on a phone at a partner restaurant (see below) |
| Absurd dad jokes | "How does a cowboy take off his jeans" | Jumbo one-liners |

## Our characters
- **Jumbo**: the menu-photo burger. Huge on the menu, tiny on the plate, always has an excuse ("camera angle tha bhai"). Moods: smug, caught, crying, flex.
- **Khana Group**: Ayesha (turns into Madam when someone lies about food), Sara (believes every photo), Hamza ("main share kar lunga", over-orders), Zain (never decides, "diet" with fried chicken).
- **Madam**: Ayesha with the glasses on. Class se bahar, murga, saza.

## Daily slots (Pakistan time)
| Time | Slot |
|---|---|
| 1:00 pm | Meme (Jumbo, Nokia, Notes, tier list, bingo, POV) |
| 5:00 pm | Khana Group chat carousel |
| 8:30 pm | Calendar post (launch content) or Madam ki Class Room |
| 10:30 pm | Madam ki Class bonus Reel (late-night scroll) |
| Any time | Trend post from the trend watcher (you can tap Stop) |

Every post also goes to Stories automatically.

## Making more
1. Add slides to `social/memes/specs.mjs` (templates: jumbo, nokia, chat, notes, tier, bingo, text).
2. `CHROMIUM_PATH=/opt/pw-browsers/chromium node social/memes/make.mjs <name>` renders them to `social/memes/out/`.
3. Add the post to `social/content/series-memes.json` (layout `meme`, img `social/memes/out/<file>.png`), then `node social/scripts/check-calendar.mjs social/content/series-memes.json`.

## Writing rules
- Relatable first, product second. At most one in three posts mentions MENVA's QR or "dekh ke order".
- Roman Urdu with English, lowercase energy, no emoji, no em dashes, no prices, no brands, no real people.
- Every caption asks for one action: tag, send, or comment.
- Before 5 Oct: tease only, never explain the product, never write the hunt answer.
- Calm on religious and national days.

## What only you can do
- **Real footage**: 10 to 20 second clips at a partner restaurant (a table reacting to the 3D dish, a waiter, hands scanning the QR). This is the gap between us and Crumble.
- **Trending audio**: the API can't attach Instagram sounds. When you want one on a Reel, add it in the app.
- **First-hour replies**: reply to comments in the first hour. The API can't do this for us yet.
- **Story polls and stickers**: the API posts Stories as plain images only.

## Watch out
- In July 2025 Crumble lost its page to three copyright reports. Everything we post is original, and every post lives in this repository as a backup.
