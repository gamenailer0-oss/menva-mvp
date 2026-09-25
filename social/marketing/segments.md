# MENVA — segments beyond Lahore premium restaurants

Internal document. Not for public use. Follows `social/marketing/BRIEF.md`: no invented stats, no invented product features, every number has a source URL or is labelled an estimate, and the pilot restaurant is referred to only as **[pilot restaurant]** (never by name).

Research date: 25 September 2026 (WebSearch, current session). Where a figure comes from a market-report-style site (Marketintelo, Growth Market Reports, etc.) or a single blog/listicle, it is flagged as a **soft estimate** — the same caution `research/competitors.md` applies to Lahore restaurant counts applies here.

**Scope reminder from `CLAUDE.md` (Section 9, "Out of scope"):** MENVA does not do, and this document does not propose, online ordering, payments, or POS integration for any segment. Every "how MENVA fits" section below only extends the existing mechanic — QR → real 3D scan → true-size AR placement, no ordering — to a new buyer or moment. Where a segment would only make sense *with* ordering, that is called out explicitly as out of scope, not glossed over.

---

## Ranking summary

| Rank | Segment | Fit | Size (sourced or labelled estimate) | Ease |
|---|---|---|---|---|
| 1 | Wedding & banquet halls / caterers | High — same "see before you commit" mechanic, bigger-ticket decision | Karachi wedding sector alone: **~PKR 33 billion** in local economic activity in 2025 ([Profit/Pakistan Today](https://profit.pakistantoday.com.pk/2026/01/15/karachi-wedding-sector-adds-rs33-billion-to-local-economy-in-2025/), [Business Recorder](https://www.brecorder.com/news/40402372/beyond-the-baraat-weddings-generated-rs33bn-for-karachis-economy-in-2025)); **~800 banquet halls in Karachi alone**, 70% occupancy (same sources) | Medium — same sales motion as restaurants, but needs multi-dish scans and a longer booking-cycle sale |
| 2 | Bakeries & dessert shops | High — "true size, not resizable" solves cake-size disappointment almost exactly | Not sized directly; Lahore has a visible, Instagram-dense custom-cake and three-milk-cake scene (multiple named bakeries found — see Section 4) | Easy — small businesses, single decision-maker, Instagram-native, fast to demo |
| 3 | Hotels (room service, restaurants, buffets) | Medium-high — same mechanic, applies to room-service cards and buffet lines too | Pakistan tourism/hospitality market estimated **US$4.91bn in 2026**, forecast **US$8.31bn by 2031** ([ResearchAndMarkets](https://www.researchandmarkets.com/reports/5332782/pakistan-tourism-and-hotel-market-share)) — labelled estimate, hospitality-wide not hotel-F&B-specific | Hard — multi-stakeholder, procurement-driven, slower than an owner-operator restaurant |
| 4 | Corporate catering / office lunch | Medium — same "see before you book" logic, B2B not B2C | No Pakistan-specific market-size figure found; one industry op-ed frames recurring office lunch as low-margin ([LinkedIn](https://www.linkedin.com/pulse/why-office-lunch-catering-terrible-business-case-muhammed-asif-khan)) | Medium — sell to the caterer, not the office, so the buyer list is short and known |
| 5 | Food festivals & franchises | Low-medium — two different plays (exposure booth vs. franchise consistency), neither a repeatable sales motion yet | Franchise scale is real and sourced (KFC Pakistan 150+ outlets, [Wikipedia](https://en.wikipedia.org/wiki/KFC_Pakistan); McDonald's Pakistan 83 outlets in 24 cities, [Wikipedia](https://en.wikipedia.org/wiki/McDonald%27s_Pakistan)) but sales cycle to head office is long | Hard — long approval chains (franchise) or one-off, non-recurring (festival) |
| 6 | Karachi & Islamabad (other cities) | Same product, no change needed | Karachi: **~613 restaurants** listed on Tripadvisor ([Tripadvisor](https://www.tripadvisor.com/Restaurants-g295414-Karachi_Sindh_Province.html)), **831 fast-food restaurants** per a business-listing scrape ([Rentech Digital](https://rentechdigital.com/smartscraper/business-report-details/pakistan/sindh/list-of-fast-food-restaurants-in-karachi)); Islamabad: **~445 restaurants** on Tripadvisor ([Tripadvisor](https://www.tripadvisor.com/Restaurants-g293960-Islamabad_Islamabad_Capital_Territory.html)) — all directory counts, likely undercounts, same caveat as the Lahore 2,128 figure in `competitors.md` | Hard for now — MENVA is a one-founder, in-person-demo business based in Lahore; out-of-city sales need travel or a local rep |
| 7 | Cloud kitchens & delivery brands | Low — MENVA's core strength (true-size AR) can't reach the actual transaction, because MENVA does no ordering and delivery brands live or die on the order itself | Pakistan food-delivery market estimated at **~$500 million currently**, projected to **$5–10 billion within 5–7 years** ([Arab News](https://www.arabnews.com/node/1759636/amp), soft estimate); cloud-kitchen-specific 2020 estimate was **~PKR 7.5 billion/year** ([Arab News](https://www.arabnews.com/node/1759636/amp)) | Medium to set up a demo, but low value delivered without an ordering hook |
| 8 | Food-delivery apps/aggregators as partners | Low near-term — speculative BD, not a sellable segment yet | No evidence found of any AR/3D feature at foodpanda, Cheetay, or any Pakistani aggregator (searched directly) | Very hard — large-org BD conversation, no case study to open the door with yet |
| 9 | Diaspora & tourists | Not a standalone segment — a messaging angle for segment 1 (restaurants) and segment 1 above (weddings), since the buyer is still the restaurant/hall owner | Pakistani diaspora ~**9.99 million globally** (2022 estimate, [Wikipedia](https://en.wikipedia.org/wiki/Pakistani_diaspora)); international tourist arrivals reported at **over 1 million in 2025**, an "820%" year-over-year rise per one travel-industry blog ([Wonderland Tours](https://www.wonderland-tours.com/blog/pakistan-tourism-boom-2026-820-percent-rise-international-visitors) — single source, treat the percentage cautiously, likely off a low base year) | N/A — fold into existing pitches, no separate sales motion |

---

## 1. Wedding and banquet halls / caterers

**Pain point.** Pakistani wedding menus are chosen mostly on trust, word of mouth, and abstract package sheets ("6 starters, 1 biryani, 3 desserts") — a balanced package typically runs **6–8 dishes** across starters, a rice dish, 2–4 meat mains, sides and dessert ([Hanif Rajput Caterers](https://hanifrajputcaterers.com/catering-menu-pakistani-wedding/), [Chak89](https://www.chak89.com/weddings/pakistani-cuisine.php)). Couples are told to "ask for a food tasting if possible" when booking ([Shadiyana](https://www.shadiyana.pk/wedding-venues/chalet-banquet-halls)) — tasting is treated as an optional extra, not a given, and a couple deciding on a banquet package is often choosing blind between multiple venues at once, for an event that can't be redone. Catering/hall cost runs **PKR 1,700–3,500+ per head** depending on tier ([Shadiyana](https://www.shadiyana.pk/wedding-venues/chalet-banquet-halls)), so a wrong impression of a dish is an expensive mistake at scale (hundreds of guests).

**How MENVA's existing product fits.** The core mechanic transfers directly: instead of a diner scanning a table QR before ordering, a couple scans a QR at the banquet hall's sales office or the caterer's meeting room and sees a real 3D scan of the package's signature dish (e.g. the biryani or the BBQ platter) at true size, before signing. This is the same "see it before you commit" moment MENVA already sells to restaurants — just moved from a dining table to a booking-decision table. No ordering is involved either way, so nothing here breaks the "waiter stays in charge" principle — the analogous role is the venue's sales staff closing the booking, not a diner ordering food. **Where the product would need to change:** a wedding package has more hero dishes (6–8) than the 4 scans MENVA currently has, so this segment needs a bigger initial scanning batch than a single steakhouse pilot; and if a hall wants to show *multiple* packages (budget/mid/premium tiers) as distinct groups, that's a menu-structuring question for `data/dishes.csv` categories, not a new engineering build — but it hasn't been tried yet and should be scoped before promising it.

**Buyer.** The banquet hall owner or the catering company's owner/sales head — decision typically sits with one person who also controls the sales pitch to couples.

**Pricing-model idea (option, not a decision).** A per-package flat fee (scan a package's hero dishes as one bundle, priced above a single-restaurant pilot given the higher stakes and bigger dish count) — or a seasonal fee tied to the winter wedding season, since demand visibly peaks December–January when families return from abroad ([Profit/Pakistan Today](https://profit.pakistantoday.com.pk/2026/01/15/karachi-wedding-sector-adds-rs33-billion-to-local-economy-in-2025/)).

**How to reach them.** Direct outreach (WhatsApp/Instagram/walk-in, same channels as the restaurant sales kit) to halls and caterers listed on `shadiyana.pk`, `hamaravenue.com`, `eventorace.com` and Shadiyana's Lahore catering directory ([16 caterers listed](https://www.shadiyana.pk/list/catering/lahore)); wedding expos, where many halls and caterers already have a sales booth, are a natural place to demo live.

**3 outreach lines.**
1. "Your couples are booking a menu they can't actually see — let them place the real biryani platter on this table before they sign."
2. "One tasting event a season isn't enough couples. Show every couple the real dish, every meeting, on their own table."
3. "PKR 33 billion moved through Karachi's wedding season last year alone — the dish your couples imagine and the dish that gets served should be the same one."

**Risks.** Wedding bookings are seasonal (sourced: winter peak) and booked months in advance, so the sales cycle and the payoff cycle are both long; hall/catering margins per head are thin at the budget-to-mid tier (PKR 1,200–3,000/head, [Shadiyana](https://www.shadiyana.pk/wedding-venues/chalet-banquet-halls)), so a hall may resist any added cost; a wedding package's dish count (6–8+) is several times MENVA's current 4-dish inventory, so this segment stresses the scanning bottleneck `competitors.md` already flags as MENVA's real operational limit.

---

## 2. Hotels (room-service menus, hotel restaurants, buffets)

**Pain point.** Hotel digital menus in 2026 are largely QR-to-photo/PDF systems for room service, restaurant, lobby-bar, pool and banquet menus ([Menujo](https://menujo.com/menus-for/hotels), [MenuHoster](https://menuhoster.com/hotel-menu)) — no evidence of any AR feature at any Lahore hotel found in search. A guest ordering room service is choosing blind from a card in the room, with no chance to compare dishes the way a diner can at a table; a buffet line relies on the food itself (or a small photo sign) to sell a dish, and hotel restaurants sit inside the same premium-casual/fine-dining bracket MENVA already targets.

**How MENVA's existing product fits.** Directly — a QR on the room-service card or a table-tent at the buffet line opens the same "see a real 3D scan, then place it life-size" experience already built for restaurant tables. **Where the product would need to change:** MENVA's current architecture routes one restaurant slug to one menu (`/g/:table` for a single restaurant, per `CLAUDE.md`); a hotel typically runs several distinct menus under one property (room service, the in-house restaurant, the buffet, poolside) — supporting multiple menus per site is a real product question to raise with the dev side before promising a hotel a unified experience, not something to claim is already built.

**Buyer.** The F&B Director or hotel GM — a departmental or multi-stakeholder decision, not a single owner-operator, since most hotels running formal F&B programs are chain-affiliated or corporately structured.

**Pricing-model idea (option).** A per-outlet or per-menu fee (room service, restaurant, buffet priced and scanned separately), or a single annual property-wide contract covering all outlets — the latter is a bigger commitment and likely needs a stronger case study first.

**How to reach them.** LinkedIn outreach to F&B directors directly (this role is the actual buyer, unlike a restaurant owner); the same in-person walk-in/demo approach from the sales kit, timed to a hotel's slow hours; hospitality trade events.

**3 outreach lines.**
1. "Room service is the one order your guests place completely blind — let them see the actual plate on their own hotel-room table first."
2. "Your buffet line sells itself in person. Your room-service card doesn't — give it the same real dish, true to size, on a phone."
3. "We built this for restaurant tables. A hotel room's desk works exactly the same way."

**Risks.** Hotel F&B decisions typically move through procurement and multiple approvals, much slower than a single restaurant owner saying yes on the spot; international chain hotels (Marriott, Sheraton, Pearl Continental — named in search results) may require sign-off above the local GM; this is a longer, more resource-intensive sale than MENVA's current one-founder, walk-in-and-demo motion is built for.

---

## 3. Cloud kitchens and delivery brands

**Pain point.** Cloud kitchens and delivery-only brands sell entirely on photos — on foodpanda, Cheetay, or their own Instagram/website — and foodpanda already enforces a real photo-quality bar (minimum 4000×2925px, top/front view, no branding, per `competitors.md`, sourced from [foodpanda Magazine PK](https://magazine.foodpanda.pk/blog/partner-photography-hacks-to-make-your-dishes-pop-on-foodpanda/)). Customers can't judge real portion size from any of these listings, and mismatched expectations drive complaints and returns — but this is the toughest incumbent bar MENVA has to clear (a good foodpanda photo is already free and decent).

**How MENVA's existing product fits — and where it clearly doesn't.** MENVA can show a real 3D scan of a delivery brand's hero dish on the brand's own website, Instagram bio link, or a QR on the packaging itself — the true-size AR placement works on any flat surface, not only a restaurant table, so a home or office desk works fine. **But MENVA does not do ordering, and cloud kitchens exist entirely to take an order.** MENVA cannot embed itself inside foodpanda's or Cheetay's checkout flow — that would require an integration MENVA doesn't build and isn't in scope (`CLAUDE.md` explicitly rules out online ordering, payments and POS integration). So for this segment, MENVA is at best a pre-decision, outside-the-checkout layer ("see it on the brand's site, then go order on foodpanda") — a real but structurally weaker fit than a restaurant, where the AR view and the order happen in the same physical visit.

**Buyer.** The cloud kitchen founder or marketing lead.

**Pricing-model idea (option).** A small per-dish scan fee for 1–2 hero items, priced lower than the restaurant pilot given the weaker conversion story.

**How to reach them.** Instagram DM to individual cloud kitchen brands; approaching shared-kitchen operators (Lettus, Pandakitchens, Hotpod — all named in search results as active in Karachi/Lahore/Multan, [Express Tribune](https://tribune.com.pk/story/2345563/let-ghost-and-cloud-kitchens-thrive), [Business Recorder](https://www.brecorder.com/news/40157552)) as a way to pitch several tenant brands at once.

**3 outreach lines.**
1. "A foodpanda photo tells people what your dish looks like. AR tells them exactly how big it is."
2. "Show the real size of your dish on your own page — before they add it to their cart somewhere else."
3. "You already have great photos. This is the thing a photo still can't do: true scale, on their own table."

**Risks.** The single biggest risk is structural, not tactical: MENVA has no way to close the loop into an actual order at the point of decision, since the diner still has to leave to a delivery app or a phone call — this is a real gap, not a solvable objection; cloud kitchens are typically leaner, more price-sensitive operations than premium restaurants and may not see the value at pilot pricing.

---

## 4. Bakeries and dessert shops

**Pain point.** Custom cake and dessert ordering in Lahore is dominated by exactly the ambiguity MENVA's true-size claim solves: customers order a cake by weight or inches from a photo, with no felt sense of the real size, and "cake was smaller than expected" is a recognizable complaint pattern in the category. A 1lb three-milk cake in Lahore runs **PKR 1,800–3,500** ([CocoCrave](https://www.cococrave.pk/blog/three-milk-cake-in-lahore/)); named bakeries and home bakers (Baba Bakers, Layers Bakery, and multiple home-baker operations reviewed on CocoCrave, [example](https://www.cococrave.pk/blog/home-bakers-in-lahore-for-custom-cakes-reviews-lahore/)) sell primarily through Instagram and word of mouth.

**How MENVA's existing product fits.** This is the tightest match to MENVA's specific "true size, locked, not pinch-resizable" feature (`CLAUDE.md` Section 7: `ar-scale="fixed"`) of any segment in this document — no other category has "how big is it really" as its single most common complaint the way cakes do. A QR at the bakery counter or in a pre-order Instagram/WhatsApp conversation lets a customer place a standard-size cake or a cookie box on their own kitchen table before ordering, the same mechanic already built. **No product change needed** for standard SKUs (a "6-inch two-tier" or "1lb three-milk cake" is a fixed, repeatable size to scan). It fits less cleanly for fully bespoke custom-design cakes (multi-tier, fondant art), where every order is a one-off and a single scan can't represent every variant — best pitched for a bakery's standard, repeatable items, not every custom order.

**Buyer.** The bakery owner — often a single home-based entrepreneur, per the home-baker listings found.

**Pricing-model idea (option).** A smaller per-SKU scan fee than the restaurant pilot, likely needing a lower price tier altogether given many Lahore custom-cake businesses are home-based, small-scale operations rather than restaurant-sized businesses — this needs Abdullah's judgment on where that price point should sit.

**How to reach them.** Instagram DM (this is where Lahore's bakery and home-baker scene already lives and sells) and outreach through baker-review/directory sites like CocoCrave, which already lists and profiles individual Lahore bakers.

**3 outreach lines.**
1. "Your customers order a cake size from a photo and hope. Let them see the real size on their own table first."
2. "The three-milk cake everyone in Lahore is ordering — show its exact size before the order, not after the delivery."
3. "No pinch-to-resize. What they see is the actual cake, life-size, on their own counter."

**Risks.** Many bakeries are small home-based operations without a physical shopfront or "table" for a formal sales demo the way a restaurant has, so the pitch and demo setting needs rethinking (a kitchen counter, a delivery photo, or an Instagram-embedded flow rather than an in-restaurant walkthrough); price sensitivity is likely higher than premium restaurants, and PKR 25,000 (the current restaurant pilot price) may be too high for a home-based bakery's typical order volume — this needs its own pricing conversation, not a copy-paste of the restaurant pilot price; a single scan doesn't cover fully bespoke, one-off cake designs.

---

## 5. Corporate catering and office lunch services

**Pain point.** Office/corporate catering in Pakistan is served by named companies (Al Alwaan in Karachi, Marcem, Professionals Events, Hanif Rajput — all found operating across Karachi/Lahore/Islamabad, [Marcem](https://marcem.com.pk/corporate-lunchboxes-service/), [Al Alwaan](https://alalwaan.pk/corporate/)), and an HR or admin manager typically commits to a recurring lunch package, or books a one-off event menu, without seeing the actual plated dish in advance. One industry op-ed specifically frames **recurring** office lunch catering as a thin-margin, price-sensitive business, while noting that clients spend more willingly on occasional private/corporate parties than daily lunch ([LinkedIn](https://www.linkedin.com/pulse/why-office-lunch-catering-terrible-business-case-muhammed-asif-khan)) — meaning the stronger MENVA fit is one-off corporate events, not daily lunch contracts.

**How MENVA's existing product fits.** Same "see it before you book" mechanic as wedding halls (Section 1), just aimed at HR/admin buyers evaluating a caterer's event package rather than a couple evaluating a wedding menu — no ordering involved either way, consistent with scope. No product change needed beyond, again, having enough dish scans to represent a catering package rather than a single restaurant's hero dish.

**Buyer.** Not the office itself — the corporate caterer's own sales team, who would use MENVA as a differentiator when pitching HR/admin managers. MENVA's actual customer here is the caterer, the same as with wedding caterers.

**Pricing-model idea (option).** Bundle into the caterer's own package fee as a sales differentiator (the caterer buys MENVA, not each corporate client) — likely the same per-package or per-dish pricing idea as Section 1, applied to a caterer's event-catering line rather than their wedding line.

**How to reach them.** Direct outreach to the named corporate caterers already serving this niche (Al Alwaan, Marcem, Professionals Events, Hanif Rajput) — a short, known list, easier to canvas fully than an open-ended restaurant search.

**3 outreach lines.**
1. "Your corporate clients are booking an event menu on trust. Let them see the actual dish before they sign the order."
2. "One AR demo in a pitch meeting can do more than another PDF menu — show the plate, not just describe it."
3. "You already win on trust and reliability. This gives your sales meetings something they can see, not just read."

**Risks.** The sourced op-ed suggests recurring daily-lunch catering is a genuinely low-margin business where an added cost may be a hard sell; the buyer list (established Pakistani corporate caterers) is short, meaning this segment has a real ceiling on how many customers exist; differentiation value is highest for one-off/event catering, lower for routine daily lunch, so the pitch needs to target the right part of a caterer's business.

---

## 6. Food festivals and franchises

**Two distinct plays, not one segment.**

**A. Franchises — plating consistency across branches.**
**Pain point.** Quality control across a franchise's branches is a named, real concern in Pakistan's franchising environment, particularly for enterprises using locally produced items across multiple outlets ([Trade.gov country commercial guide](https://www.trade.gov/country-commercial-guides/pakistan-franchising)). Scaled chains like KFC Pakistan (150+ outlets, [Wikipedia](https://en.wikipedia.org/wiki/KFC_Pakistan)) and McDonald's Pakistan (83 outlets across 24 cities, [Wikipedia](https://en.wikipedia.org/wiki/McDonald%27s_Pakistan)) depend on every branch delivering the same standard plate, but MENVA has found no evidence any of them use a shared visual reference tool for this today.
**How MENVA fits.** A head office could commission one standard "hero dish" scan and roll the same QR out to every branch — diners at any branch see the identical, official-standard plate in AR. This is a real extension of the existing "one scan, one QR" mechanic, just distributed across many physical locations instead of one restaurant. It is a diner-facing feature exactly as already built; framing it as a plating-consistency *tool* for the franchise's own QA is a sales narrative, not a new product capability MENVA builds.
**Buyer.** Franchise head-office marketing or operations director.
**Pricing idea (option).** A single per-brand licence fee covering one hero-dish scan, reused across every branch's printed QR — this could make the per-branch economics attractive (one shoot, many locations), worth exploring with Abdullah.

**B. Food festivals — a demo/exposure play, not a recurring sale.**
**Pain point.** At a pop-up food festival (e.g. Karachi Eat, [Foodoplanet coverage](https://foodoplanet.com/karachi-eat-food-festival-2026/)), customers browse many vendors quickly with only a banner photo to judge a dish before committing a single-use token.
**How MENVA fits.** A shared demo booth or kiosk could show a handful of standout vendors' dishes in AR — but this means negotiating with a festival organizer for a booth, not selling to each stall individually, and it's a one-off, short-duration event rather than an ongoing paying relationship.
**Buyer.** The festival organizer.
**Pricing idea (option).** Likely a sponsorship/exposure play rather than a revenue line — MENVA might pay for the booth space rather than charge for it, purely for visibility and case-study leads; needs Abdullah's judgment on whether the exposure is worth the cost.

**3 outreach lines (franchise-focused, since that's the more repeatable of the two).**
1. "Every branch promises the same dish. Now every branch can show the same exact plate, in AR, before it's ordered."
2. "One scan, every location — a single standard for what 'your dish' actually looks like, company-wide."
3. "Franchise consistency usually means a training manual. This is the same idea, but the guest sees it too."

**Risks.** Franchise sales cycles run through head office and are likely long, similar in nature to the hotel segment; large multinational franchise operators (KFC, McDonald's) are corporate structures where a small Lahore startup's cold outreach is a long shot without an existing relationship or introduction; food festivals are short, one-off engagements that don't build into a lasting paid relationship on their own — treat as lead generation and visibility, not a sales channel with its own revenue line.

---

## 7. Food-delivery apps and aggregators as partners or channels

**Framing.** This is distinct from Section 3 (individual cloud kitchens) — this is about foodpanda, Cheetay, or a similar aggregator platform itself becoming a distribution partner or integration point for MENVA's AR views, the way Kabaq/QReal became an AR vendor for a bigger platform (Denny's) in the US market, per `competitors.md`.

**Search finding.** No evidence was found of foodpanda Pakistan, Cheetay, or any Pakistani aggregator having any AR/3D feature, pilot, or stated interest, in direct search (`foodpanda AR menu`, `Pakistan aggregator 3D`). This is a genuine gap, not a live opportunity today.

**How MENVA's existing product fits.** Speculatively at best: MENVA could in theory supply 3D/AR assets that an aggregator embeds into its own listing pages ("view in AR" before adding to cart) — but this requires an actual technical integration into the aggregator's app, something entirely outside MENVA's current build, roadmap, and control. MENVA's own no-ordering rule is not even the blocker here — the blocker is that this is a large-company partnership and engineering negotiation, not a sale MENVA can close with a demo on a table.

**Buyer.** foodpanda Pakistan or Cheetay's partnerships/product team — a large organization, unlikely to engage a pre-revenue, one-founder startup without a strong existing track record.

**Pricing-model idea.** None proposed — any such deal would be bespoke and negotiated well after MENVA has case studies to point to; premature to price this now.

**How to reach them.** LinkedIn outreach to named partnerships/product staff at foodpanda Pakistan is the only concrete channel found — but expectations should be low without an established case-study portfolio first.

**3 outreach lines.**
1. "Restaurants using MENVA see diners place a real 3D dish on their own table before ordering — worth exploring for your listings?"
2. "We're the closest thing to Kabaq/QReal operating in Pakistan today — open to a conversation about what a listing-level AR view could look like?"
3. "We don't do ordering — we do the moment right before it. Curious whether that's worth testing inside your app."

**Risks.** MENVA currently has no leverage, case study, or existing relationship to open this door; aggregators have limited incentive to add a new vendor dependency for a feature they can approximate today with good photos; this is realistically a 12-month-or-later conversation, not a near-term revenue segment — treat as "watch," not "pursue."

---

## 8. Other cities: Karachi and Islamabad

**Market notes (sourced, all directory-style counts — same caveat as the Lahore 2,128-restaurant figure in `competitors.md`: likely undercounts, methodology not published).**
- Karachi: **~613 restaurants** listed on Tripadvisor ([Tripadvisor](https://www.tripadvisor.com/Restaurants-g295414-Karachi_Sindh_Province.html)); **831 fast-food restaurants** per a business-listing scrape, described as a 5.72% rise from 2023 ([Rentech Digital](https://rentechdigital.com/smartscraper/business-report-details/pakistan/sindh/list-of-fast-food-restaurants-in-karachi)).
- Islamabad: **~445 restaurants** on Tripadvisor ([Tripadvisor](https://www.tripadvisor.com/Restaurants-g293960-Islamabad_Islamabad_Capital_Territory.html)).
- Karachi's wedding sector generated **~PKR 33 billion** in local economic activity in 2025, with **~800 banquet halls** citywide at ~70% occupancy ([Profit/Pakistan Today](https://profit.pakistantoday.com.pk/2026/01/15/karachi-wedding-sector-adds-rs33-billion-to-local-economy-in-2025/), [Business Recorder](https://www.brecorder.com/news/40402372/beyond-the-baraat-weddings-generated-rs33bn-for-karachis-economy-in-2025)) — meaning the wedding-segment opportunity (Section 1) may be even larger in Karachi than in Lahore, by these figures.
- No Islamabad-specific wedding or restaurant-market figure of comparable quality was found; Islamabad's smaller population and higher share of diplomatic/expat residents makes it a plausible fit for the hotel segment (Section 2) and the diaspora/tourist angle (Section 9), but this is reasoning, not a sourced claim.

**Product fit.** No change — this is a geography decision, not a new segment or product need.

**Ease.** Genuinely harder than continuing in Lahore in the near term: MENVA's entire sales motion, per the sales kit, is Abdullah demoing in person on a real table — replicating that in Karachi or Islamabad means travel costs, time away from Lahore's own pipeline, or hiring/training a local rep, none of which is scoped yet.

**Recommendation.** Not a distinct outreach segment with its own scripts — fold the same restaurant and wedding-hall playbooks into Karachi/Islamabad once Lahore has 3–5 paid case studies to point to, and treat the "when and how" as a resourcing decision for Abdullah, not a marketing one.

---

## 9. Diaspora and tourists

**Framing.** This is not a standalone segment with its own buyer — it's a messaging angle to use inside the existing restaurant (Section, current ICP) and wedding-hall (Section 1) pitches, since the buyer in both cases is still the restaurant or hall owner, not the diaspora visitor or tourist directly.

**Pain point (for the end diner, not the buyer).** A returning overseas Pakistani or a foreign tourist often can't read a Urdu-heavy or dish-name-only menu confidently, and doesn't know a dish's real appearance, ingredients, or spice level before ordering — a sharper version of the uncertainty MENVA already solves for local diners.

**Sourced figures (context, not a market size to sell against).** Global Pakistani diaspora estimated at **~9.99 million** as of 2022 ([Wikipedia](https://en.wikipedia.org/wiki/Pakistani_diaspora)), with large populations in Saudi Arabia, the UK and the UAE (same source); winter wedding season specifically draws families back from abroad (Section 1, [Dawn](https://www.dawn.com/news/1998854)); international tourist arrivals reported at **over 1 million in 2025**, described by one travel-industry blog as an "820%" year-over-year increase ([Wonderland Tours](https://www.wonderland-tours.com/blog/pakistan-tourism-boom-2026-820-percent-rise-international-visitors)) — this is a single, non-primary source and such a large percentage move likely reflects a low base year; treat the percentage as a labelled, soft estimate, not a hard fact, and do not repeat the "820%" figure externally without checking the underlying base number.

**How MENVA's existing product fits.** No change — the same QR → 3D scan → true-size AR mechanic already answers "what is this and how big is it," which is exactly what a diaspora visitor or tourist needs more than a regular local diner does.

**Buyer.** Same as Section 1 (restaurants/wedding halls) — no separate buyer to reach.

**Pricing-model idea.** None — no new price tier, this is a messaging addition to existing pitches.

**How to reach them.** Not a separate channel — add one line to the restaurant/wedding-hall pitch for venues known to have diaspora or foreign-tourist clientele (5-star hotel restaurants, MM Alam Road/DHA fine dining, wedding season specifically).

**Risks.** Treating this as its own segment risks wasted sales effort chasing a buyer that doesn't exist separately from Section 1; the tourism growth figure is dramatic and single-sourced, and should never be quoted externally without a caveat about the base year.

---

## Recommended order for the next 6–12 months

1. **Continue Lahore premium restaurants** (current focus, per `sales-kit.md`) — build 3–5 paid case studies before expanding; every other segment's pitch leans on having real usage numbers to show.
2. **Wedding and banquet halls / caterers (Lahore)** — the strongest next segment: same sales motion as restaurants, a large and sourced local wedding economy, and a natural "see before you book" extension — but budget for a bigger scanning batch per deal (6–8 dishes vs. 4).
3. **Bakeries and dessert shops** — easiest to start in parallel: small businesses, single decision-makers, Instagram-native, and the tightest product-feature fit (true, locked size) of any segment here. Needs its own, likely lower, price point — flagged for Abdullah.
4. **Hotels** — pursue opportunistically alongside restaurant outreach, since some MM Alam Road/DHA fine-dining venues are already hotel restaurants; don't build a dedicated hotel sales process until Lahore restaurant case studies exist, given the longer procurement cycle.
5. **Corporate catering companies** — low-effort to canvas (a short, known list of named caterers) but treat as a secondary track, not a priority push, given the price sensitivity found in the research.
6. **Food festivals and franchises** — opportunistic only. Approach a franchise head office or festival organizer if a specific, warm contact appears; don't build a standing outreach cadence around either yet.
7. **Karachi and Islamabad** — defer until Lahore has 3–5 paid case studies; this is a resourcing decision (travel or a local rep) for Abdullah, not a marketing task to start now.
8. **Cloud kitchens and delivery brands** — lowest priority of the commercial segments, given the structural gap that MENVA can't reach the actual transaction; revisit only if this changes.
9. **Food-delivery aggregators as BD partners** — "watch," not "pursue," for the next 6–12 months; revisit only once MENVA has a strong case-study portfolio to open the conversation with.
10. **Diaspora and tourists** — not a phase, fold the messaging into restaurant and wedding-hall pitches immediately at no extra cost.

---

## Needs Abdullah

- **Wedding/banquet segment:** decide the per-package pricing idea (Section 1) and whether MENVA can realistically scan 6–8 dishes for a first wedding-hall deal given the current scanning bottleneck (`competitors.md` Section 5).
- **Bakery segment:** decide a separate, likely lower, price tier for small/home-based bakeries — PKR 25,000 (the current restaurant pilot price) may not fit this buyer, and this document does not set a number.
- **Hotel segment:** decide whether to invest sales time in F&B director outreach given the longer procurement cycle and MENVA's current one-person sales capacity; also a **product/engineering question, not marketing**: whether MENVA's architecture should ever support multiple menus (room service, restaurant, buffet) under one property, since the current build is one restaurant/site per `CLAUDE.md`.
- **Corporate catering:** decide whether pitching MENVA to the caterer (as their own sales differentiator) rather than to individual offices is worth pursuing given the short buyer list and thin margins found in research.
- **Franchise segment:** decide whether to attempt outreach to large multinational franchise head offices (KFC, McDonald's) given the long approval chain and lack of an existing relationship, or to wait for a warm introduction.
- **Food festival segment:** decide whether a sponsored/exposure demo booth at a specific festival is worth the cost — this document does not recommend one, only flags it as an option.
- **Aggregator BD (Section 7):** decide if and when to make a speculative outreach to foodpanda/Cheetay partnerships contacts — recommended to wait for a stronger case-study portfolio first, per this document's ranking.
- **Karachi/Islamabad expansion:** decide the timing and whether it requires travel budget or a local sales rep; this document defers it, it does not set a date.
- **All outreach itself** — sending any DM, WhatsApp message, email, or doing any walk-in or demo described in this document — is Abdullah's to execute, per `BRIEF.md`.
- **Any public-facing use of the figures in this document** (e.g. the PKR 33 billion Karachi wedding figure, the diaspora/tourism numbers, the franchise outlet counts) should be checked against `BRIEF.md`'s "no invented stats, always cite" rule before it appears in any pitch deck or public copy — every number above already carries its source, but Abdullah should confirm before any external use.
