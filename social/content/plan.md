# MENVA on Instagram: the first 100 days

**What this is:** the strategy behind `calendar.json` (72 posts, 5 a week plus launch day). The server posts them by itself; this page explains why each post is there.

## 1. Goal

1. **Diners (most posts):** make "see it before you order it" a habit Lahore's Gen Z asks for. Every relatable post ends with a reason to send it to a friend, save it or comment.
2. **Restaurants (about 1 post in 5):** turn that attention into pilot conversations. There is one call to action everywhere: **DM "PILOT"** (Lahore pilot, PKR 25,000).

What counts as success in 100 days (read from Instagram Insights, not promised): DM shares ("sends") per post, saves on the checklists, comments on the A-or-B posts, and the number of "PILOT" DMs.

## 2. What the research says

| Finding | What we do with it |
|---|---|
| For Gen Z, Instagram is the first step in choosing where to eat, a "camera eats first" culture ([Tastewise](https://tastewise.io/blog/gen-z-food-trends); [Restaurant India](https://www.restaurantindia.in/article/how-instagram-is-shaping-food-trends-in-india.15972)). | Every dish post uses a real scan, shown large. The product *is* the visual. |
| Lahore 2026: aesthetic, experience-led cafés; sharing plates / tapas for groups; reservations and zero-wait expectations ([ReserveKaru, 2026](https://www.reservekaru.com/blog/7-massive-dining-trends-taking-over-lahore-in-2026-and-where-to-try-them)). | Group-ordering guides, "sab share karenge", "is this enough for two?", portion posts. |
| Ranking signals Instagram has confirmed: watch time, likes per reach and **sends per reach**. DM shares weigh more than likes ([Later](https://later.com/blog/how-instagram-algorithm-works/); [Buffer](https://buffer.com/resources/instagram-algorithms/)). | Most captions end with "send this to…" or "tag…". "Types of people at dinner" is a series built for tagging. |
| Carousels get the highest engagement per follower; Reels get the most reach ([Later](https://later.com/blog/how-instagram-algorithm-works/)). Caption keywords now drive Instagram search. | 19 carousels for explainers and FAQs. Captions say "Lahore", "restaurant", "menu", "3D" in plain words. Reels are a later step (see OPEN-QUESTIONS.md). |
| In Pakistan, engagement peaks at **6–10 pm PKT**, strongest Thursday to Sunday, and dips around Maghrib and Isha ([Sherazi Marketing](https://sherazimarketingsolutions.com/what-are-the-best-posting-times-in-pakistan-for-instagram-facebook-tiktok-and-youtube/); [Digital Umbrellas](https://digitalumbrellas.com/best-times-to-post-on-social-media-in-pakistan-2026-guide-2/)). | Posts go out at **20:30 PKT**, after Isha all season (Isha in Lahore is about 18:40–19:15 from October to January). Posting days are **Tue, Thu, Fri, Sat, Sun**; Mondays and Wednesdays are rest days. The one exception is the launch post #1 on Monday 5 Oct. From day 17 to day 94, Wednesdays carry the *Khana kahan?* series (section 9). |
| Pakistani brands on Instagram mix English with Urdu and Roman Urdu to sound local ([Liberal Journal of Language & Literature Review](https://llrjournal.com/index.php/11/article/view/782)). | English leads so the post reads for everyone, then one Roman Urdu line that sounds like a friend talking ("Order se pehle dekh lo"). |
| Diners research menus before going out, and 18–24 year olds look for food photos more than any other age group ([Restaurant Dive](https://www.restaurantdive.com/news/77-of-diners-visit-restaurant-websites-before-going-survey-finds/562008/), US data). | This is the core argument of the restaurant posts. We never quote these numbers in posts (they are not Lahore numbers). |

## 3. Content pillars

| Pillar | Posts | What it is | Example |
|---|---|---|---|
| Relatable (dining culture) | 30 | Moments every Lahori table knows: menu anxiety, the over-orderer, the safe order, A-or-B votes, seasonal hooks | #2 "The waiter is back. Again." |
| See it first (product) | 16 | What MENVA does, shown with real scans: true size, turn it around, show the waiter, no app | #1 launch carousel |
| For restaurants | 13 | For owners and managers: plating gets the credit, staff time, myths, how the pilot works, what they get to see | #6 "Your menu is your quietest salesperson" |
| Menu truth (useful) | 9 | Saveable checklists and guides: group orders, trying a new place, portion questions, the sight test | #5 group-order rules |
| Behind the scan | 4 | How a dish becomes a scan, "no AI food, ever", note from the team, day 100 | #23 how we scan |

Audience split: 55 diners, 13 restaurants, 4 both. Formats: 53 single images, 19 carousels.

### Recurring series (so people come back)
- **This or that** (#4, #19, #48): two real dishes, comment A or B.
- **Types of people at dinner** (#29, #32, #38, #44, #50, #67): made for tagging.
- **Owners ask** / myths (#26, #46): the objections, answered.

### Dates in the 100 days (with the default start of Mon 5 Oct 2026)
World Food Day 16 Oct (#9) · Halloween 31 Oct (#20) · smog season from early Nov (#22) · wedding season (#37) · White Friday 27 Nov (#39) · December (#42) · winter break (#52) · 25 Dec Quaid-e-Azam Day / Christmas (#59) · New Year's Eve (#63) · 1 Jan (#64) · day 100, 12 Jan 2027 (#72).
If START_DATE moves by more than about two weeks, check these posts (see `calendar.csv`, "note" column).

## 4. Voice

- Calm, warm, a little playful, never cartoonish (same as the product). Sentence case. **No emoji** (brand rule).
- Short lines. One idea per post. Headline on the image, the detail in the caption.
- English first, then one natural Roman Urdu line. Not translated word for word: said the way a Lahori would say it.
- Every caption ends with one action: send, save, tag, comment A/B, or DM "PILOT".
- 3–5 hashtags, always `#menva`, then `#lahorefood` / `#lahorefoodies` (diners) or `#lahorerestaurants` / `#restaurantmarketing` (restaurants).

## 5. Rules every post follows (checked automatically by `check-calendar.mjs`)

1. **Only real dish renders** from `assets/dishes/*/poster.webp`. No stock photos, no AI food.
2. **Gauchos is never named**, and its logo never shows. It is carved into two of the boards, so the templates only allow crops that leave it out. Naming Gauchos needs Abdullah's OK first.
3. **No invented food data.** No dish prices (the only price anywhere is the PKR 25,000 pilot), no ingredients beyond what is visible, no sizes in cm (plate sizes are not confirmed).
4. Two dishes are not confirmed yet (the "garlic prawn skewers" and "chicken fajita wrap" folders show different-looking food), so posts call them "the green plate" and "the trio", never by name.
5. **Claims only about what MENVA actually does:** QR opens the menu in the browser (no app), Safari and Chrome, real 3D scans, true size in AR (no pinch-to-resize), photo first on slow wifi, "show the waiter" list, no online ordering, pilot analytics. No sales-uplift numbers, no client names, no testimonials.

## 6. How it runs

`calendar.json` → n8n picks the post of the day at 20:30 PKT → Gotenberg draws the slides from `social/templates/post.html` → the JPEGs are published to Instagram. Nothing needs approving. See `social/SETUP.md`.

**To change a post:** edit `social/content/calendar.json` (text only; keep the structure), run `node social/scripts/check-calendar.mjs`, preview with `node social/scripts/render.mjs <post number>`, commit, then run `./update.sh` on the server.

## 7. After day 100

Read Insights for the top 10 posts by sends and saves, make more of those formats, and add Reels made from the 360° spin renders once they are approved for social use (OPEN-QUESTIONS.md).

## 8. Trend bank (`trend-bank.json`)

22 more ready posts built on the marketing research (`social/marketing/research/`). The core insight is that Pakistani food hype runs on *doubt resolved in public* ("is it really that big / worth it / real?"), and a true-size scan answers exactly that doubt. The bank includes the **Dish drop** weekly-reveal series (a Crumble-style reveal, done as honest scarcity since only four scans exist), the **Sight test** (taste-test culture, flipped to before you order), "is it worth the hype", queue culture, "is this even real", expectation-vs-reality done honestly, trend-jacks (Dubai chocolate, three milk cake, smash burgers, match nights) as text-only posts, Lahori-life formats (desi parents, family dawat, student budget) and the brand line **"Pehle dekho, phir order."**
Two are already in the calendar (#25 sight test, #34 worth the hype). To use another, copy it over a calendar post, keep that post's `n`, `day`, `date` and `weekday`, then run `node social/scripts/check-calendar.mjs`. Previews: `social/previews/trend-bank-sheet-*.jpg`.

## 9. Khana kahan? (`series-khana-kahan.json`, posts itself on Wednesdays)

A weekly sitcom told as group-chat screenshots. The same six made-up friends appear every week: Hamza never decides, Anum is the portion police, Zain says "pic bhejo", Sara orders last and copies you, Ali bhai "knows the owner", and you. There are 12 episodes. Most have a chat slide, then a real dish scan as the punchline. Episode 11 is the payoff: Hamza decides in a minute because he saw the dish first. Episode 12 is a crossover for restaurant owners (the floor team's chat). A recurring cast gives people a reason to come back, and "tag your Hamza" is an easy share. It's a **series file**: the server posts it automatically on Wednesdays (a rest day for the main calendar). Episode 1 goes out on day 17 (Wed 21 Oct 2026 with the default start) and episode 12 on day 94. Its days count from START_DATE across the whole 300 days. `check-calendar.mjs` refuses a series post that lands on a calendar day. To add another series, create `series-<name>.json` in the same format. Preview: `social/previews/chat-saga-sheet-1.jpg`. The voice rules are in `social/marketing/voice-spice.md`.
