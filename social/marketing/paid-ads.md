# MENVA — paid media plan (Meta + Google)

Follows `BRIEF.md`. Public-facing ad copy is marked **PUBLIC**; everything else is internal working notes for Abdullah. No stat here is invented — every number has a source URL and is labelled an **estimate** where it is one (almost everything in section 1 is, because Meta does not publish an official Pakistan rate card; these are figures reported by Pakistani marketing agencies and vendors, not Meta itself). Nothing in this file spends money, opens an account, contacts a restaurant, or publishes an ad — see **Needs Abdullah** at the end.

A note on research access: this file was researched with web search from this session. A number of Pakistani marketing-agency blogs that came up in search results (siffar.com, pixellattice.com, solutionbyz.com, ominiflow.com, brandbuilders.com.pk, orahjewels.com, boundlesstech.net, propakistani.pk, ey.com, geo.tv, developers.facebook.com) could not be opened directly — the network here blocks them. Where a figure below comes only from a search-result snippet of one of those sites (not a page this session actually read), that is noted next to the number. Treat those as **secondary, unverified** estimates until Abdullah or a media buyer spot-checks one or two against a live Ads Manager account.

---

## 1. The Meta ads landscape in Pakistan, 2025–2026

### CPM / CPC / CPL — estimate ranges

No Lahore-specific published benchmark was found; all ranges below are Pakistan-wide, sourced from Pakistani ad agencies' own published guides (not from Meta). Meta does not publish official CPM/CPC/CPL figures by country, so **every number in this table is a secondary estimate**, not a guaranteed rate.

| Metric | Range (PKR) | Notes | Source |
|---|---|---|---|
| CPC, Facebook, general | PKR 140–422 | Traffic-objective average closer to PKR 140–250 | [Shopify PK, "What Facebook Ads Cost in November 2025"](https://www.shopify.com/pk/blog/facebook-ads-cost) |
| CPC, Instagram, general | PKR 8–350, typical PKR 10–50 | Wide range — depends heavily on industry and placement | [Siffar, "Advertising Costs on Instagram from Pakistan"](https://siffar.com/instagram-ads-cost-in-pakistan/) (search-result snippet only, page itself blocked) |
| CPM, general | US$5–12 (≈ PKR 1,400–3,400 at ~PKR 280/USD) | Global-ish range quoted by a Pakistani agency, not Pakistan-specific | [Siffar / Shopify PK search summary](https://www.shopify.com/pk/blog/facebook-ads-cost) |
| CPM, Instagram | PKR 150–500 | | [Siffar, Instagram ads cost](https://siffar.com/instagram-ads-cost-in-pakistan/) (snippet only) |
| CPC, restaurant/food, low-competition example | PKR 6–10 (buffet promo, Karachi) | One agency's example, not a benchmark | [SolutionByz / Shopify PK search summary](https://solutionbyz.com/blogs/blog/meta-ads-benchmarks-2026-business-owners-guide) (snippet only) |
| Cost per table booking, Gulberg restaurant | PKR 200–500 | From one agency's own case-study claim — no methodology given, treat as anecdotal | [Nobility Media, "Meta Ads Lahore"](https://nobilitymedia.net/meta-ads-lahore/) |
| Click-to-WhatsApp cost per conversation, emerging markets | US$0.50–3 (≈ PKR 140–840) | Not Pakistan-specific; "emerging markets" bucket | [getkanal.com, "Click-to-WhatsApp Ads Benchmarks 2026"](https://getkanal.com/blog/click-to-whatsapp-ads-benchmarks-2026) (search summary) |
| Click-to-message CPL vs landing-page CPL | US$1–5 vs US$5–25 | General claim, not Pakistan-specific, no source methodology shown | search summary citing [wati.io](https://www.wati.io/en/blog/click-to-whatsapp-ads-cost/) |
| Google Ads CPC, Pakistan, general | PKR 20–80 | | [Growbiztech, "How Much Do Google Ads Cost in Pakistan"](https://growbiztech.com/how-much-do-google-ads-cost-in-pakistan-small-business-budget-guide-2026/) (search summary) |

**How to read this table:** treat every figure as a wide planning range, not a quote. The only way to get a Lahore- and category-accurate number is to run MENVA's own first PKR 5,000–10,000 and read the real Ads Manager report — see the budget tiers in section 3.

### Payment methods and the "your card got declined" problem

- Meta bills Pakistani ad accounts in USD by default, but most Pakistani debit/credit cards are PKR-denominated, and the State Bank of Pakistan's forex rules plus bank-side blocks on international transactions mean local cards are frequently declined outright on Meta. [Figo, "How to Pay for Meta Ads in Pakistan"](https://spendfigo.com/guides/meta-ads/pakistan) (page blocked here; summary from search results)
- Meta's own supported local methods for Pakistan are debit/credit card or JazzCash mobile wallet — but even these commonly get declined for the currency/BIN reasons above. Same source.
- Several Pakistan-focused services (Figo, EverTry, GetPlu) sell "virtual USD card" top-ups (funded via PKR bank transfer, JazzCash/Easypaisa, or USDT) specifically to work around Meta declining local cards. These are third-party fintechs, not Meta products — Abdullah would need to independently vet any of them before funding one; this file does not recommend a specific vendor. [Figo](https://spendfigo.com/guides/meta-ads/pakistan), [EverTry](https://evertry.co/blog/how-to-pay-for-facebook-ads-in-pakistan/), [GetPlu](https://getplu.com/pk/pay/how-to-pay-for-facebook-ads-in-pk) (all summarised from search results; pages blocked here)
- **Practical read:** budget an extra 1–2 days before the first campaign can go live just to get a payment method that actually charges successfully. Don't assume the first card works.

### The tax on digital ads in Pakistan

This is the part most beginner guides skip, and it changes the real cost of every rupee spent.

- **Federal 5% "Digital Presence Proceeds" tax:** was legislated but, from 1 July 2025, the FBR issued an exemption (SRO 1366 of 2025) so this does not currently apply to foreign digital suppliers like Meta. The legal framework still exists and could be reinstated later. [1stopVAT, "Pakistan withdraws 5% digital tax"](https://1stopvat.com/pakistan-withdraws-5-percent-digital-tax-tech-firms/)
- **Provincial sales tax on advertising services — this is the one that actually bites today.** Punjab (where Lahore sits) charges Punjab Revenue Authority (PRA) sales tax on advertising services at the standard 16% rate. Multiple Pakistani sources describe banks withholding this **16% on the full payment amount** (not on a commission or margin) whenever a card is charged for a Meta ad, showing on the bank statement as a line like "STWH Adver Ser Punjab 16%". [Conseric, "Punjab Sales Tax on Services 2026-27"](https://conseric.pk/punjab-sales-tax-on-services/); [Boundless Tech, "Meta Ads Tax Distribution in Pakistan"](https://www.boundlesstech.net/blogs/meta-ads-tax-distribution-in-pakistan/) (page blocked here, summarised from search results)
- If a business is PRA-registered and filing monthly provincial sales tax returns, this withheld amount can reportedly be claimed back as an input tax credit — but that requires registration and bookkeeping most one-person pilots don't have yet. Same sources.
- Sindh runs a comparable but separate scheme (SRB), reportedly around 13–15%+ on advertising services from non-resident providers like Meta/Google, plus reports of banks additionally charging a further percentage on card-based ad spend — cited as inconsistent and contested by advertisers. [EY, "Pakistan: Sindh issues rules for collecting sales tax on IT and advertisement services"](https://www.ey.com/en_gl/technical/tax-alerts/pakistan---sindh-issues-rules-for-collecting-sales-tax-on-it-and) (page blocked here, summarised from search results); [ProPakistani, "Google, Facebook, Others Raise Concern Over Faulty Definition of Pakistani Tax Law"](https://propakistani.pk/2024/02/22/google-facebook-others-raise-concern-over-faulty-definition-of-pakistani-tax-law/) (page blocked here, summarised from search results)
- **Practical read, labelled clearly as an estimate:** budget the real cash cost of Meta ads run from Lahore at roughly **budget × 1.16**, not budget × 1.00, until Abdullah confirms the actual line item on his own bank statement after the first charge. This is the single biggest thing a "PKR 30,000 a month" plan gets wrong if it's ignored.

### Ad account setup gotchas

- **Business verification needs a real SECP-registered business.** Meta's Pakistan-specific requirement is SECP registration documents; name, address and phone must match exactly across the SECP document, the Meta Business Portfolio, and the Page — a mismatch (even an abbreviation or missing apartment/floor number) is the most common rejection reason in 2026. [Anylinga, "Meta Business Verification Rejected? 7 Fixes"](https://anylinga.com/blog/en/meta-business-verification-rejected-7-fixes.html) (summarised from search results)
- Review can take 3–7 business days (up to 10 in quarterly policy-change windows). Don't resubmit same-day after a rejection — fix the flagged item, wait 24 hours, then resubmit; after two rejections, file an appeal instead of a third submission. Same source.
- **If MENVA isn't SECP-registered yet**, this is a blocker for full Ads Manager verification (needed to unlock Custom Audiences, higher spend limits and Advantage+ targeting at scale) — the smaller "Boost" flow (section 7) may work without full verification for a while, but don't build the plan assuming that lasts.
- **Click-to-WhatsApp needs a WhatsApp Business account linked in the same Business Portfolio** as the ad account, plus a pre-filled conversation opener — not just a personal WhatsApp number. [Kommo, "How to use ads that click to WhatsApp"](https://www.kommo.com/blog/click-to-whatsapp/) (summarised from search results)
- **The Instagram account must be converted to a professional (Business) account** and connected to the same Business Portfolio before Ads Manager can run ads through it or use "Send message" as a destination.
- **Creative size gotcha specific to MENVA's own assets:** `social/templates/post.html` renders 1080×1350 (4:5) images — the right size for Feed/Explore placements. `social/templates/story.html` renders 1080×1920 but is built to say "New on the feed" over an existing post image, which is organic-promo copy, not ad copy — it is **not** a ready-made Stories/Reels ad creative today. Practical result: run these ads in Feed/Explore/In-stream placements only for now, and either let Meta's automatic placements crop the 4:5 image for Stories (it will letterbox or crop awkwardly) or exclude Stories/Reels placements until a dedicated 9:16 ad template exists. See Needs Abdullah.

---

## 2. Objectives

### (a) B2B leads — restaurant owners and managers in Lahore

Meta does not offer a clean "restaurant owner" job-title or "GM" targeting option for Pakistan — detailed job-title targeting is a US/limited-market feature, and even where it exists, restaurant-specific titles are thin. Interest targeting for "restaurant management" exists but is broad and catches consumers who merely follow restaurant content, not owners. So this campaign leans on **proxies**, not precision demographic filters:

| Proxy | How to set it up in Ads Manager | Why it works better than a title/interest filter |
|---|---|---|
| **Page-admin / business behaviour** | Meta's Detailed Targeting has a behaviour segment for people who **administer a Facebook Page** ("Small business owners" / admin-of-a-Page behaviour, found under Behaviors > Digital Activities in Ads Manager — exact label can shift, check at setup time). Stack this with the interests below. | Restaurant owners and managers overwhelmingly run their own Page or Instagram account — this catches the "runs a local business" signal directly instead of guessing a job title. |
| **Hospitality/restaurant-industry interests** | Add interests: "Restaurant management", "Small business", "Foodservice", "Point of sale", "Restaurant" (as a Page-category interest), "Entrepreneurship". Use "OR" logic (any one interest qualifies), then narrow with the Page-admin behaviour above using "AND". | Widens the pool to owners/managers who follow industry pages, suppliers, POS brands — a realistic B2B signal in a market with no job-title data. |
| **Geo radius around MM Alam / Gulberg / DHA** | Ads Manager > Locations > Drop pins: MM Alam Road, Gulberg III (centre roughly 31.5085°N, 74.3506°E), and DHA Phase 4–6/8, each with a 3–5 km radius; add Model Town and Johar Town as a second, lower-priority radius set once the first is spending well. Use "People who live in this location" only, not "recently in this location" (that would catch diners too). | Matches the ICP areas already researched in `sales-kit.md` section 1 — the geography most likely to contain restaurant decision-makers, not just diners passing through. |
| **Lookalikes (later, not at launch)** | Once 10+ real DM-PILOT conversations or 100+ Page engagers exist, build a 1–2% Lookalike of Pakistan (or, if Meta allows a smaller geo, a custom-radius Lookalike) from that engaged audience or from a Custom Audience of people who messaged "PILOT". | Needs a real seed list first — see section 6's DM-keyword log, which doubles as the seed. Don't build a Lookalike at zero-data launch; it will just mirror the general population. |

Objective: use Meta's **Leads** or **Engagement** objective, conversion location **Instagram** (or Messenger), destination set to open a chat with a **pre-filled ice-breaker message reading "PILOT"** so every conversation starts pre-tagged (this is the DM PILOT flow already used in organic captions — see section 5).

### (b) Diner awareness around partner restaurant(s)

- Age 18–30, all genders, **radius targeting around the pilot restaurant's actual table**, not a citywide blast — this is a foot-traffic-adjacent awareness play, not a broad brand campaign.
- **This needs the pilot restaurant's real address/geo-pin**, which this file cannot supply — per `BRIEF.md`, the pilot restaurant's name must never appear in public copy, and the file has never been told the address. This is a **Needs Abdullah** item: he (or the founder) drops the pin in Ads Manager directly; nothing here names or locates it.
- Interests to layer on top of the radius (optional, since radius + age already narrows well): "Food and dining", "Restaurants", "Foodies", "Instagram (app)" engagement.
- Placements: Feed + Explore + Reels (Reels needs a 9:16 asset — see the creative-size gotcha above; until one exists, keep Reels placement off or accept automatic cropping).
- Do **not** name the pilot restaurant, use its logo, or use any brand-carved crop (`brandOk`) in this campaign's creative — same rule as every other public post.

---

## 3. Three budget tiers

All PKR figures below are **spend as entered in Ads Manager**, before the ~16% Punjab ad-services tax discussed in section 1 — so the real cash outlay to fund each tier is roughly the number below × 1.16 until Abdullah confirms otherwise on his own statement.

| Tier | Monthly budget | Allocation | Expected range (clearly an estimate, from section 1's table) | What to learn |
|---|---|---|---|---|
| **1 — Test** | PKR 10,000 (≈ PKR 330/day) | 70% B2B DM PILOT (PKR 7,000), 30% diner awareness (PKR 3,000) | At PKR 140–350 CPC, roughly 30–70 link/message clicks total for the month; realistically 2–8 DM-PILOT conversations, most of which will be low-quality (students, curious diners, not owners) — this tier is about learning to run a campaign and read the numbers, not about hitting volume. | Whether the ad account, payment method and pixel/DM tracking actually work end to end; which one or two creatives get any engagement at all; a real (not estimated) CPC and CPM for MENVA's own account. |
| **2 — Learn** | PKR 30,000 (≈ PKR 1,000/day) | 60% B2B DM PILOT (PKR 18,000), 40% diner awareness (PKR 12,000) | Roughly 90–200 clicks/messages combined; realistically 8–20 DM-PILOT conversations if targeting proxies from section 2 are working; enough diner impressions (at PKR 150–500 CPM) for ~25,000–70,000 reach in the radius. | Which proxy audience (Page-admin behaviour vs. hospitality interests) actually produces owner-quality conversations, not just clicks; which of the 12 creatives (section 4) has the best cost-per-message; whether diner awareness moves any measurable scan volume at the pilot restaurant (cross-check against MENVA's own `/stats` dashboard once Phase 8 ships). |
| **3 — Scale** | PKR 75,000 (≈ PKR 2,500/day) | 55% B2B DM PILOT (PKR 41,000), 35% diner awareness (PKR 26,000), 10% held back for a Lookalike test (PKR 8,000) once tier 2 produced a real seed audience | Roughly 250–500+ clicks/messages combined; realistically 20–50+ DM-PILOT conversations; the first Lookalike test becomes viable (needs ≥100 source engagers per Meta's own guidance, which tier 2 should have produced). | Whether a Lookalike outperforms the manual proxy stack from section 2; whether cost-per-qualified-conversation (a real restaurant owner, not a browsing diner) is trending down as creative and targeting are refined; first real signal on whether Meta ads pay for themselves against the PKR 25,000 pilot price (e.g. is cost-per-signed-pilot under PKR 25,000?). |

**Do not skip tier 1.** Every range above is built on secondhand agency estimates, not MENVA's own account data — tier 1's real job is to replace every "estimate" label in this file with a real number from Abdullah's own Ads Manager.

---

## 4. Twelve ad creatives

Every creative reuses an **existing** rendered asset — a specific slide from `social/content/calendar.json`, already built by the templates in `social/templates/`. Nothing new is rendered here. "Ad primary text" and "headline" are the Meta ad-copy fields (separate from that post's organic caption, written shorter and ad-specific); the slide's own on-image headline (its `h` field) is unchanged. All copy follows the brief: no invented stats, no pilot restaurant name, no promised pilot inclusions, no emoji, sentence case.

### B2B — DM PILOT (owners/managers)

**1 — Asset: calendar post #6 "quietest-salesperson", slide 1** (`statement` layout, "Your menu is your quietest *salesperson.*")
**PUBLIC**
- Primary text (EN): Your menu works every table, every night — most nights it's just text. MENVA puts your real dishes in 3D on the guest's own table, straight from the QR already there. No app for them to download. Lahore pilot: PKR 25,000.
- Primary text (Roman Urdu): Aap ka menu har table, har raat kaam karta hai — zyada tar sirf text hota hai. MENVA aap ki asli dishes 3D mein guest ke apne table par le aata hai, seedha table ke QR se. Unhe koi app download nahi karni. Lahore pilot: PKR 25,000.
- Headline: Put your menu on the table
- CTA button: Send message
- Ice-breaker: PILOT

**2 — Asset: calendar post #31 "owners-problem-list", slide 1** (`list` layout, "Five signs your menu is *costing you orders*")
**PUBLIC**
- Primary text (EN): Quick check: no photos or old ones, guests ask what a dish looks like, everyone orders the same "safe" dish, portion size surprises people, your best dish is buried on page three. Two or more sound familiar? That's what MENVA fixes.
- Primary text (RU): Jaldi check karein: photos nahi ya purani hain, guests poochte hain dish kaisi lagti hai, sab log wohi "safe" dish order karte hain, portion size guests ko surprise karta hai, aap ki best dish page teen par chhupi hoti hai. Do ya zyada match ho rahe hain? Yehi MENVA theek karta hai.
- Headline: Five signs your menu is costing you orders
- CTA button: Send message
- Ice-breaker: PILOT

**3 — Asset: calendar post #26 "owners-faq-1", slide 4** (`statement` layout, "What does *the pilot* cost?" — run as a single-image ad, not the full carousel, so the price question is the hook)
**PUBLIC**
- Primary text (EN): No app for guests. No POS integration. No online ordering. Built for restaurant wifi — the photo shows first, the 3D follows. The Lahore pilot is PKR 25,000. Ask us anything else.
- Primary text (RU): Guests ke liye koi app nahi. Koi POS integration nahi. Koi online ordering nahi. Restaurant wifi ke liye bana hai — pehle photo aati hai, phir 3D. Lahore pilot PKR 25,000 ka hai. Aur kuch poochna ho toh poochein.
- Headline: The pilot, in four answers
- CTA button: Send message
- Ice-breaker: PILOT

**4 — Asset: calendar post #46 "owners-myths", slide 3** (`statement` layout, "\"It will slow *service down.*\"")
**PUBLIC**
- Primary text (EN): Owners ask us this a lot: won't this slow service down? No — the waiter still takes the order, now off a clear list instead of a verbal back-and-forth. See it on your own table before deciding.
- Primary text (RU): Owners aksar poochte hain: kya isse service slow nahi hogi? Nahi — waiter phir bhi order khud leta hai, ab sirf ek saaf list se, baar baar poochhne ke bajaye. Faisla karne se pehle apne table par dekh lein.
- Headline: Does it slow service down? No.
- CTA button: Send message
- Ice-breaker: PILOT

**5 — Asset: calendar post #56 "owners-first-impression", slide 1** (`hero` layout, dish `steak-sandwich`, "First impressions happen *before the plate arrives.*")
**PUBLIC**
- Primary text (EN): The first thing a guest sees of your food isn't the food — it's the menu. Make that first impression the real plate, scanned in 3D, at true size. Lahore pilot: PKR 25,000.
- Primary text (RU): Guest sabse pehle khaana nahi, menu dekhta hai. Toh pehla taassur asli plate ka ho, 3D mein scan kiya hua, poore size mein. Lahore pilot: PKR 25,000.
- Headline: Make the first impression the real plate
- CTA button: Send message
- Ice-breaker: PILOT

**6 — Asset: calendar post #14 "owners-what-guests-ask", slide 1** (`statement` layout, "The most asked question in your restaurant: *\"What does it look like?\"*")
**PUBLIC**
- Primary text (EN): How many times a night does your staff answer "what does this look like"? A 3D menu answers it at the table, before anyone asks — so your team can focus on service instead of describing plates.
- Primary text (RU): Raat mein kitni baar staff ko batana padta hai "yeh dikhta kaisa hai"? 3D menu yeh sawaal table par hi khatam kar deta hai — staff sirf service par dhyan de sakta hai.
- Headline: "What does it look like?" — answered
- CTA button: Send message
- Ice-breaker: PILOT

### Diner awareness (18–30, radius around the partner restaurant)

**7 — Asset: calendar post #1 "hello-lahore", slide 1** (`hero` layout, dish `steak-main`, "See it before you *order it.*")
**PUBLIC**
- Primary text (EN): Scan the QR on the table, tap a dish, and the real plate appears in front of you — scanned in 3D, true to size, before you order it.
- Primary text (RU): Table par QR scan karo, dish par tap karo, aur asli plate saamne aa jaata hai — 3D mein scan kiya hua, poore size mein, order karne se pehle.
- Headline: See it before you order it
- CTA button: Learn more
- Link: menva-ar.netlify.app (demo) — see UTM convention in section 6

**8 — Asset: calendar post #24 "true-size", slide 1** (`phone` layout, dish `steak-main`, "No zoom. No tricks. *True size.*")
**PUBLIC**
- Primary text (EN): In AR you can't pinch the dish bigger or smaller. What you see on your table is the portion you get. Honest portions — that's the whole point.
- Primary text (RU): AR mein dish ko pinch karke chhota badaa nahi kar sakte. Table par jo dikhta hai, wohi portion milta hai. Honest portions — bas yehi baat hai.
- Headline: No zoom. No tricks. True size.
- CTA button: Learn more
- Link: menva-ar.netlify.app (demo)

**9 — Asset: calendar post #13 "turn-it-around", slide 1** (`closeup` layout, dish `garlic-prawn-skewers` — the green plate, unnamed, per brief, "Turn it *around.*")
**PUBLIC**
- Primary text (EN): The side of the plate a menu photo never shows you. Turn the dish around, check how much is actually there — then order.
- Primary text (RU): Menu ki photo jo side kabhi nahi dikhati. Dish ko ghuma kar dekho, kitna hai — phir order karo.
- Headline: Turn it around before you order
- CTA button: Learn more
- Link: menva-ar.netlify.app (demo)

**10 — Asset: calendar post #28 "show-the-waiter", slide 1** (`phone` layout, dish `chicken-fajita-wrap` — the trio, unnamed, per brief, "Build your list. *Show the waiter.*")
**PUBLIC**
- Primary text (EN): MENVA doesn't take your order — the waiter does. Add dishes to a list, add a note like "no onions", then turn your phone around and show it.
- Primary text (RU): MENVA order nahi leta — waiter leta hai. Dishes list mein add karo, note likho jaise "no onions", phone ghuma kar dikha do.
- Headline: Build your list. Show the waiter.
- CTA button: Send WhatsApp Message *(only if the ad points at MENVA's own WhatsApp for "try it near you" questions — otherwise use Learn more; see section 5)*
- Link (if Learn more): menva-ar.netlify.app (demo)

**11 — Asset: calendar post #8 "how-it-works-3-steps", slides 1–3** (run as a 3-card **carousel ad**, `step` layout × 2 + `phone` layout — reuses all three cards as-is)
**PUBLIC**
- Primary text (EN): How it works, in three steps: scan the code on your table, tap a dish, see it on your table at true size — then decide.
- Primary text (RU): Teen step mein: table ka code scan karo, dish par tap karo, apne table par poore size mein dekho — phir faisla karo.
- Headline (per card, matches on-image text): 1. Scan the code on your table / 2. Tap a dish / 3. See it on your table
- CTA button: Learn more
- Link: menva-ar.netlify.app (demo)

**12 — Asset: calendar post #3 "scan-not-photo", slide 1** (`closeup` layout, dish `steak-sandwich`, "This is a *scan*, not a photo.")
**PUBLIC**
- Primary text (EN): This isn't a photo. It's a 3D scan of the real plate — photographed from every side and rebuilt in 3D, so what you turn on your phone is what comes out of the kitchen. No stock photos, no AI food.
- Primary text (RU): Yeh photo nahi hai. Asli plate ka 3D scan hai — har side se photograph karke 3D mein banaya gaya, toh phone par jo ghumate ho, wohi kitchen se aata hai. Koi stock photo nahi, koi AI khaana nahi.
- Headline: This is a scan, not a photo
- CTA button: Learn more
- Link: menva-ar.netlify.app (demo)

---

## 5. Click-to-WhatsApp and click-to-Instagram-DM flows

Both flows exist to catch the same signal the organic posts already train guests and owners to send: the word **PILOT**. Keep the keyword consistent across organic and paid so the DM-tracking sheet in section 6 doesn't need two systems.

### Click-to-Instagram-DM (primary flow for the B2B creatives, 1–6)

1. Ad set destination: Instagram Direct.
2. Ice-breaker/pre-filled message the person taps to send: **"PILOT"**.
3. **Auto-reply (Instagram's native "Automated messages" / Instant Reply in the professional dashboard, no third-party tool needed):**
   - **English:** "Thanks for reaching out — this is MENVA. We put a real 3D scan of your dishes on the guest's own table, straight from a QR, no app. Lahore pilot: PKR 25,000. Two quick questions so we can get back to you properly: what's your restaurant called, and which area of Lahore are you in?"
   - **Roman Urdu:** "Shukriya, yeh MENVA hai. Hum aap ki dishes ka asli 3D scan guest ke apne table par le aate hain, seedha QR se, koi app nahi. Lahore pilot: PKR 25,000. Do chhoti si baatein batayein taake sahi tarah reply kar sakein: aap ka restaurant ka naam kya hai, aur Lahore mein kahan hain?"
4. A real person (Abdullah, until there's a team) replies to every conversation within the same day — Instagram's automated message is a holding reply, not a bot that closes the sale.

### Click-to-WhatsApp (secondary flow, for creative #10 and for anyone who prefers WhatsApp)

1. Requires: WhatsApp Business account, linked to the same Meta Business Portfolio as the ad account (see section 1's gotchas).
2. Ad set destination: WhatsApp, with the same pre-filled opener: **"PILOT"**.
3. **Auto-reply — at pilot volume (tiers 1–2), use the free WhatsApp Business app's Away Message / Greeting Message, set as a saved quick reply, not a paid automation platform:**
   - **English greeting:** "Assalam o Alaikum, this is MENVA. Thanks for messaging — we'll reply personally within a few hours. In the meantime: we put a real 3D scan of your dishes on the guest's own table via the table QR, no app needed. Lahore pilot: PKR 25,000."
   - **Roman Urdu greeting:** "Assalam o Alaikum, yeh MENVA hai. Message ka shukriya — hum kuch hi ghanton mein khud reply karenge. Tab tak: hum aap ki dishes ka asli 3D scan table ke QR se guest ke table par le aate hain, koi app nahi. Lahore pilot: PKR 25,000."
4. **At tier 3 volume, if WhatsApp message volume gets past what one person can track by hand**, a proper keyword-triggered auto-responder (WhatsApp Business Platform via a provider, e.g. the kind of tool already surfaced in research — Wati, or similar) becomes worth evaluating. That's a "later" item, not part of this launch plan — see Needs Abdullah.

---

## 6. Measurement plan — no heavy tracking

MENVA's own analytics (Phase 8 of the main build, `/stats` on the site) is the best source of truth once it ships, but paid media needs its own lightweight layer that works even before that:

### UTM links (for every "Learn more" ad — creatives 7, 8, 9, 11, 12)

Use one consistent pattern so every click is traceable back to a specific ad in a spreadsheet or in the site's own analytics later:

```
https://menva-ar.netlify.app/?utm_source=meta&utm_medium=paid-social&utm_campaign=<tier>-<objective>&utm_content=<creative-id>
```

Example for creative #7 in tier 2: `?utm_source=meta&utm_medium=paid-social&utm_campaign=tier2-diner-awareness&utm_content=c7-hello-lahore-s1`

- `utm_campaign`: `tier1-b2b`, `tier1-diner`, `tier2-b2b`, `tier2-diner`, `tier3-b2b`, `tier3-diner`, `tier3-lookalike`
- `utm_content`: the creative number and calendar post id from section 4, e.g. `c7-hello-lahore-s1`, `c11-how-it-works-carousel`

### DM keyword tracking (for every DM-PILOT ad — creatives 1–6, 10)

No pixel or CRM needed. Every conversation starts with the same word, "PILOT", so it's found by searching Instagram DM / WhatsApp for that word. Log each one manually.

### The sheet

One plain spreadsheet (Google Sheet or Excel — no OAuth automation, unlike the organic-posting pipeline in `social/n8n/`), one row per lead or click batch:

| Date | Channel (IG DM / WhatsApp / link click) | Creative # (from section 4) | Ad set / tier | Restaurant name given | Area | Qualified? (Y/N — real owner/manager, in Lahore, table-service) | Outcome (no reply / replying / demo booked / pilot signed / not interested) | Notes |
|---|---|---|---|---|---|---|---|---|

For the "Learn more" (diner) ads, add clicks in bulk from Ads Manager's own link-click count next to each `utm_content` value rather than logging every click by hand — the sheet's job there is just to hold the weekly total next to the UTM tag, so cost-per-click can be checked against the estimates in section 1.

### Kill / scale rules

| Signal | Kill | Hold and iterate | Scale |
|---|---|---|---|
| B2B: cost per DM-PILOT conversation, after ≥ PKR 3,000 spent on that creative | > PKR 500/conversation and zero qualified (real owner) conversations | 1+ qualified conversation, cost trending down week over week | ≥ 3 qualified conversations at a cost that, projected, beats PKR 25,000 per signed pilot |
| B2B: qualified-conversation rate | < 10% of conversations are a real owner/manager in Lahore after 20+ conversations — targeting proxy is probably wrong | 10–30% qualified — try the other proxy combination from section 2 | > 30% qualified — proxy is working, worth a Lookalike once volume allows (tier 3) |
| Diner: cost per link click, after ≥ PKR 2,000 spent on that creative | > PKR 300/click with no change after swapping the creative once | PKR 100–300/click, trending down | < PKR 100/click — increase that creative's share of the diner budget |
| Any creative | Frequency > 3 with falling CTR (ad fatigue) in the radius-limited diner audience, which is small | — | — refresh creative, don't just add budget |
| Any campaign | Ads Manager reports the payment failed twice in a row | Fix payment method before spending another rupee — do not switch cards mid-test, it resets learning | — |

---

## 7. Boosting vs Ads Manager for a beginner

**Recommendation: skip the blue "Boost post" button for the B2B and diner-awareness objectives in this plan, and go straight to Ads Manager — but understand why, since Instagram's own in-app "Promote" now offers a "Send message" goal that looks tempting.**

- Boosting is built for visibility metrics (reach, likes, basic link clicks) with almost no targeting control beyond broad interest/location/age — it can't do the layered Page-admin-behaviour + interest + radius stack in section 2, and it can't set a custom ice-breaker message reliably. [Hootsuite, "Boosted posts vs. ads: What to know in 2026"](https://blog.hootsuite.com/boosted-posts-vs-ad/); [Altos Agency, "Boosted Posts vs. Ads"](https://altosagency.com/blog/article/boosted-posts-vs-ads) (both summarised from search results)
- Ads Manager gives full conversion-location control (Instagram DM vs. WhatsApp vs. link), Detailed Targeting (the behaviour + interest stack), and the reporting needed to fill the kill/scale table in section 6. Same sources.
- The one place Boost is fine: Instagram's in-app "Promote" with the "Send message" goal, for tier 1 only, as a way to test a single creative for under PKR 1,000 before touching Ads Manager at all — genuinely simpler for a first-ever ad, and it uses the same Instagram professional account. Move to Ads Manager as soon as targeting matters (tier 2 onward).

### Step-by-step: the first campaign (tier 1, B2B DM PILOT, creative #1)

1. **Business Portfolio.** business.facebook.com → create a Business Portfolio for MENVA if one doesn't exist. Add the MENVA Instagram professional account and a Facebook Page.
2. **Business verification.** Submit SECP documents if MENVA is registered (section 1's gotcha) — start this early, it can take a week.
3. **Payment method.** Ads Manager → Billing → add a card. Expect a possible decline (section 1) — have a backup plan (a different bank's card, or one of the virtual-USD-card services, independently vetted) ready before this step.
4. **WhatsApp (only if doing creative #10 first).** Link a WhatsApp Business account in the same Business Portfolio.
5. **Create the campaign.** Ads Manager → Create → Objective: **Engagement** (or **Leads**, see section 2) → set the campaign name to something traceable, e.g. `tier1-b2b-dmpilot`.
6. **Ad set.** Conversion location: Instagram. Locations: drop the three pins for MM Alam Road, Gulberg III, DHA (section 2). Age 24–55 (typical owner/manager range — no data exists to justify a narrower band, so start wide and let delivery data narrow it later). Detailed Targeting: add the Page-admin behaviour, then the hospitality interests, combined as described in section 2. Daily budget: PKR 330 (tier 1's PKR 10,000 ÷ 30 days, 70% share to this ad set means split further if running both objectives at once — for the very first campaign, run B2B alone for the first week to get a clean read).
7. **Ad.** Use creative #1's existing image (`social/content/calendar.json` post #6, slide 1). Set the ice-breaker to "PILOT". Paste in the primary text, headline and CTA from section 4. Add the `utm_content` tag even though this ad has no link — keep the naming pattern consistent for the spreadsheet.
8. **Review and publish.** Check the preview on both Feed and Explore placements before publishing.
9. **Day 1 after launch:** open the sheet from section 6, start logging every DM.

---

## 8. Google Search ads — recommendation: not yet

**Honest assessment: this session could not pull real Google Ads Keyword Planner search-volume numbers for "digital menu Lahore" or "QR menu Pakistan"** — that data lives inside a logged-in Google Ads account (Keyword Planner), not on the open web, and no public source with actual Pakistan-specific volume for these exact terms turned up in search. Anyone claiming a specific monthly search volume for these exact phrases without having opened Keyword Planner themselves is guessing — this file won't do that either.

What can be said honestly, and why the recommendation is **no, not at these budget tiers**:

- These are new-category, unbranded, product-description search terms ("digital menu", "QR menu", "AR menu") stacked with a city name — that combination is a narrow, low-intent-volume shape almost everywhere, including in larger markets, because almost nobody searches for a product category *and* a city before they've heard of the category. Restaurant owners looking for this kind of tool are far more likely to search generic non-Pakistan terms ("QR code menu maker", "digital menu for restaurant") where Google's results are dominated by international SaaS tools (foodpanda-style QR menu makers, generic PDF/QR menu generators) — MENVA's AR angle is not what those searchers are looking for.
- Pakistani agencies that do run local search campaigns advise a **minimum of PKR 40,000–60,000/month** before there's enough click data for Google's algorithm to optimize meaningfully for a single-city, single-business campaign. [Growbiztech, "How Much Do Google Ads Cost in Pakistan"](https://growbiztech.com/how-much-do-google-ads-cost-in-pakistan-small-business-budget-guide-2026/) (summarised from search results) — that's larger than even tier 3 here, and Search wasn't the objective of any tier.
- Diners are not searching for "AR menu" or "QR menu" — they're the audience for the Meta creatives in section 4 (awareness/discovery), not Search (which serves existing, already-formed demand). Search ads make sense for a category once people already know to look for it by name, which MENVA's category doesn't have yet.

**Recommendation:** don't build a Search campaign in tier 1 or 2. If Abdullah wants a real answer on volume before committing money anywhere, the correct free step is opening Google Ads → Tools → Keyword Planner → "Discover new keywords" with Pakistan/Lahore as the location, which needs only a Google account and no spend — that's a **Needs Abdullah** item below, not something this file can do. Revisit Search only once: (a) tier 3 diner/B2B budgets are consistently working, and (b) MENVA has enough brand recognition that "MENVA" or "AR menu Lahore" branded searches start showing real volume in Search Console/Analytics.

---

## Needs Abdullah

Everything below needs Abdullah's money, account access, sign-up, direct contact with a person, a publishing decision, or a judgment call this file can't make on his behalf.

1. **Confirm the real cash cost of the Punjab 16% ad-services tax** on his own bank statement after the first real charge — this file's "budget × 1.16" guidance (section 1) is a secondhand estimate from agency blogs this session couldn't independently verify (several source pages were network-blocked). If Sindh or a different provincial rule applies instead (e.g. if the ad account's registered address is outside Punjab), the rate differs — check which applies to MENVA's actual registration.
2. **Create/verify the Meta Business Portfolio, submit SECP business-verification documents, and add a working payment method.** Expect the first card to possibly get declined (section 1) — a backup payment path (different bank, or an independently vetted virtual-USD-card service) may be needed. None of this can be done from here.
3. **All ad spend, at any tier.** Nothing in section 3's budget tiers has been spent — they're proposals.
4. **Publish the actual 12 ads (section 4) in Ads Manager**, including uploading the existing creative assets and setting each campaign live.
5. **Drop the real geo-pin for the diner-awareness campaign (section 2b).** This file was never told the pilot restaurant's address, and per the brief it can't ask — this step needs Abdullah (or the founder) directly.
6. **Set up Instagram's native Automated Messages / Instant Reply and WhatsApp Business's Away/Greeting message** with the scripts in section 5 — this is a few taps in the Instagram professional dashboard and WhatsApp Business app, but needs Abdullah's login.
7. **Create and share the tracking spreadsheet (section 6)** — a Google Sheet or Excel file Abdullah owns and updates; this file only specifies its columns.
8. **Decide whether to link a WhatsApp Business account** to the ad account at all (needed only for click-to-WhatsApp, creative #10 and section 5's WhatsApp flow) — if he'd rather keep everything on Instagram DM for now, skip that setup step.
9. **Run a free Google Ads Keyword Planner check** for "digital menu Lahore", "QR menu Pakistan" and a few close variants before fully ruling out Search (section 8) — this needs a logged-in Google Ads account, which this file doesn't have access to.
10. **A 9:16 (Stories/Reels) ad-ready creative template** doesn't exist yet (`story.html` is built for organic cross-promotion, not ad copy) — worth asking for one later if Reels/Stories placements turn out to matter; not blocking for the Feed/Explore-only launch in tiers 1–2.
11. **At tier 3 WhatsApp volume, evaluate a real keyword-auto-responder tool** (section 5) if manual replies stop keeping up — an independent vendor decision, not something to set up preemptively.
12. **Everything this file assumes about Meta's current UI (exact objective names, behaviour-segment labels, ice-breaker setup flow) should be sanity-checked at the moment of setup** — Meta renames and reshuffles Ads Manager options often enough that a 2025–2026-sourced description can be slightly stale by the time Abdullah opens the tool.
