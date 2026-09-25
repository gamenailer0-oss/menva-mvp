# MENVA on Instagram: season three (days 1-100, from 23 Apr 2027)

**What this is:** the strategy behind `calendar-3.json` (72 posts, same 5-a-week cadence as
`calendar.json` and `calendar-2.json`, continuing straight after season two ends on 22 Apr 2027).
Posting days stay Tue/Thu/Fri/Sat/Sun at 20:30 PKT. Monday and Wednesday are rest days. Day 1
(23 Apr 2027) is a Friday, a normal posting day, so there is no launch-day exception this season.

Same rules as seasons one and two (`social/marketing/BRIEF.md`, `social/marketing/brand-book.md`):
English first, one natural Lahori Roman Urdu line, one action per caption, at most 5 hashtags
always including `#menva`, no emoji, no invented prices beyond the PKR 25,000 pilot, no invented
stats or dish names, "the green plate" and "the trio" never named, Gauchos never named, no sizes
in cm. Verified with `node social/scripts/check-calendar.mjs social/content/calendar-3.json` → OK,
and rendered with `render.mjs --calendar social/content/calendar-3.json --sheet` → 97 slides
rendered clean, no overflow on inspection of the contact sheets.

## 1. What's different from season two

Season three lands in the hottest, wettest stretch of the Lahore calendar: peak summer heat,
Eid ul Azha, Muharram (including Ashura, handled with extra care), mango season, the monsoon's
first rains, summer break, and exam-results season — back to back, with no other major religious
observance overlapping (Ramadan and Eid ul Fitr both fell in season two). The pillar mix stays
close to season two's, with slightly more relatable/seasonal content since so much of the window
is built around weather and culture rather than a single big event.

Pillars: relatable 30, see-it-first 12, for-restaurants 15, menu-truth 9, behind-the-scan 5 (70
total). Audience: diners 51, restaurants 14, both 5. Format: 18 carousels (26%), 52 single images
— right on the ~25% carousel target.

## 2. Themes by week

| Dates (2027) | Days | What's running |
|---|---|---|
| 23 Apr – 2 May | 1–10 | Summer heat begins pushing tables indoors; general dining-culture relatable posts; Dish drop week 10; Sight test round 5; This or that round 11; Types of people part 11 (the AC guardian). |
| 4–16 May | 12–24 | Continued summer-heat content; Eid ul Azha anticipation builds from day 22; **Eid ul Azha** lands on day 24 (16 May); Dish drop week 11. |
| 18–30 May | 26–38 | Post-Eid family dawat and grill-night culture (no animal/sacrifice content); Types of people part 12 (Eid table humour, food-only); This or that round 12; owners' myths round 3; Dish drop week 12. |
| 1–13 Jun | 40–52 | Mango season begins (text-only trend posts, no scan exists); no-AI-food reminder; summer break starts; **Muharram begins** around day 45 (calm note); Dish drop week 13; a calm, non-hype checklist ahead of the expected Ashura dates. |
| 15–27 Jun | 54–66 | **Ashura** (expected 9–10 Muharram, around 14–15 June, days 53–54): **no posts at all** (the draft post for day 54 was removed on review); normal posting resumes day 56; Sight test round 6; This or that round 13; mango-season posts continue; Dish drop week 14; owners' summer/analytics pitches. |
| 29 Jun – 11 Jul | 68–80 | Monsoon's first rains arrive (day 70); rainy-day dining culture; This or that round 14; Dish drop week 15; summer-break budget content. |
| 13–25 Jul | 82–94 | Exam-results season (celebration dinners, campus-area owners' pitch); rainy-day menu checklist; owners' pilot recap; a team note; more mango-season content (mango lassi). |
| 27–31 Jul | 96–100 | General relatable/menu-truth/for-restaurants posts, a real-scan-not-AI reminder, a day-99 teaser, and the **day 100 / 300-days-total milestone carousel**. |

## 3. Dated and sensitive posts (exact day/date)

| # | Day | Date (2027) | Id | Note |
|---|---|---|---|---|
| 16 | 22 | 14 May | `eid-ul-azha-coming-soon` | Eid ul Azha anticipation, expected around 16–17 May, subject to moon sighting |
| 17 | 23 | 15 May | `owners-eid-rush-pitch-2` | Ahead of Eid, restaurant-facing |
| 18 | 24 | 16 May | `eid-ul-azha-mubarak` | **Eid ul Azha** (main greeting; expected around 16–17 May, subject to moon sighting). Respectful and family-focused — no animal or sacrifice imagery or jokes anywhere in this file |
| 19 | 26 | 18 May | `post-eid-family-dawat` | Post-Eid grill-night/family-dawat culture — no animal or sacrifice imagery |
| 20 | 28 | 20 May | `types-of-people-12-kabab-guard` | Eid week — food-focused humour only (a cooked kabab, not a live-animal or sacrifice reference) |
| 21 | 29 | 21 May | `owners-eid-week-bookings-2` | Eid week bookings |
| 23 | 31 | 23 May | `dawat-portion-check` | Eid week, general portion-planning content |
| 29 | 40 | 1 Jun | `mango-season-is-it-real` | Mango season trend post — text-only, no MENVA mango scan exists |
| 33 | 45 | 6 Jun | `muharram-quiet-note` | **Muharram begins** (approximate, moon-sighting dependent, expected early–mid June). Calm, non-promotional, no CTA |
| 38 | 52 | 13 Jun | `gentle-checklist-pre-ashura` | Two days ahead of the expected 9–10 Muharram (Ashura) dates — calm, no playful hook, no CTA push |
| – | 53–54 | 14–15 Jun | *(no post)* | **Ashura (expected 9–10 Muharram): nothing is posted.** If the moon sighting moves Ashura, move or pause the neighbouring posts (days 52 and 56) too. |
| 43 | 59 | 20 Jun | `mango-season-lahore-plates` | Mango season trend post — text-only |
| 45 | 63 | 24 Jun | `owners-mango-season-pitch` | Mango season, general seasonal-menu pitch — no invented mango dish or scan |
| 54 | 75 | 6 Jul | `mango-dessert-doubt` | Mango season trend post — text-only |
| 64 | 89 | 20 Jul | `mango-lassi-culture` | Mango season trend post — text-only |
| 71 | 99 | 30 Jul | `three-hundred-days-coming` | Day-99 teaser ahead of the milestone |
| 72 | 100 | 31 Jul | `day-100-v3` | Day 100 of season three — states "300 days" (100 + 100 + 100), which is arithmetic, not an invented stat |

### Religious-date cautions (read before this window)

- **Eid ul Azha** is estimated at 16–17 May 2027, subject to moon sighting. Every Eid post in this
  file (#16–#23) uses date-flexible language ("Eid is close," "Eid Mubarak") rather than a hard
  date claim, so a shift of a few days doesn't break anything. No post in this file shows, describes,
  or jokes about an animal, a sacrifice, or qurbani — Eid content only shows MENVA's existing real
  dish scans (the steak board, the sandwich) as generic "what's on the dawat table" examples, and
  references "grill nights" only as a family-gathering culture note, never tied to the sacrifice
  itself.
- **Muharram** is estimated to begin around early–mid June 2027 (day ~45), with **Ashura (9–10
  Muharram)** estimated around 15 June (day 54). Three posts are built specifically to be safe
  around this period: a calm "quieter few weeks" note at the start of Muharram (#33, day 45), a
  toned-down, non-hype checklist two days ahead of the estimated Ashura dates (#38, day 52), and a
  calm, non-promotional FAQ-style post on the estimated Ashura date itself (#39, day 54) with no
  call to action at all. None of these three posts use the brand's usual playful hook, a CTA, or a
  DM "PILOT" pitch. **If the actual Ashura date lands more than a few days from 15 June, re-check
  posts #33, #38 and #39 in `calendar-3.csv` before they go out** — the surrounding posts (#34–#37,
  #40+) are ordinary seasonal content and don't need to move unless the whole window shifts by more
  than about a week.

## 4. Mango-season posts (no scan exists)

Five posts (#29, #43, #45, #54, #64) ride June–August mango-season culture. Four of them (#29,
#43, #54, #64) are diner-facing and deliberately **text-only** — no dish image, no invented mango
scan — built on the same "doubt resolved in public" insight from `research/pakistan-food-trends.md`
("is it actually that sweet/good this year?"). Each one says plainly that MENVA has no mango scan
yet. The fifth (#45) is a for-restaurants pitch about keeping *existing* dishes as clear as new
seasonal specials — it doesn't invent a mango dish either.

## 5. Continuing series in this file

- **Dish drop** (weekly reveal): continues from season two's week 9 → weeks 10–15 here, posts #2,
  #15, #31, #40, #51, #62, rotating through all four existing scans.
- **Sight test**: rounds 5–6, posts #8, #42.
- **This or that**: rounds 11–14, posts #6, #25, #44, #55.
- **Types of people at dinner**: parts 11–16, posts #5 (the AC guardian), #20 (the kabab guard, Eid
  edition), #35 (the AR filmer), #46 (the ice negotiator), #57 (the rain blamer), #63 (the results
  refresher).
- **Owners ask / myths**: a third myths round, #28.
- **For-restaurants**: 15 posts (~21% of the season), nearly all ending in DM "PILOT" plus the PKR
  25,000 Lahore pilot price, spread across summer, Eid, mango season, monsoon and exam-results
  angles, plus a pilot-recap carousel (#65).
- **Behind the scan**: a no-AI-food reminder (#30), the Muharram quiet note (#33), the Ashura calm
  FAQ (#39), a team note (#67), a day-99 teaser (#71), and the day-100 / 300-days milestone
  carousel (#72).

## 6. Needs Abdullah

Nothing in this file requires Abdullah to do anything new beyond what seasons one and two already
needed — no new photography, no restaurant names, no filming, no spend. Three things worth
flagging:

1. **Eid ul Azha and Muharram/Ashura dates are estimates.** Eid ul Azha 2027 is expected around
   16–17 May and Ashura around 9–10 Muharram (roughly 15 June), both subject to moon sighting.
   Nobody needs to do anything now, but someone should glance at posts #16–#23 (Eid) and #33, #38,
   #39 (Muharram/Ashura) once the actual dates are confirmed, in case the real dates land more than
   a few days from these estimates and the posts need to shift.
2. **If a fifth dish gets scanned, the two unconfirmed dish names get confirmed, or a mango dish is
   ever scanned**, this file should be revisited — right now it reuses the same four scans as
   seasons one and two, and the five mango-season posts stay deliberately text-only for lack of a
   real mango scan.
3. **The Instagram handle is still blank** (`"handle": ""`, same as `calendar.json` and
   `calendar-2.json`) — needs Abdullah to confirm and fill in the live handle before this season
   posts.

Everything else — captions, hashtags, alt text, the DM "PILOT" pitch, the PKR 25,000 pilot price —
needs no sign-off; it follows the same rules as `calendar.json` and `calendar-2.json` and passes
the same automated checker (`node social/scripts/check-calendar.mjs social/content/calendar-3.json`
→ OK).

## Review changes (25 Sep 2026)

A copy and sensitivity review (`calendar-3-review.md`) found the calendar strong; 7 wording fixes were applied (`calendar-3-fixes.json`). To keep **1–10 Muharram (days 45–54)** quiet, the two restaurant sales posts and the joke post in that window were moved or removed: `owners-summer-indoor-seating` moved to day 65, `types-of-people-13-ar-filmer` to day 64, and `owners-analytics-recap-2` was removed. The window now holds only the calm Muharram note, two practical tips, a light summer post and the pre-Ashura checklist, with nothing on Ashura itself. Check the dates against the moon sighting in May 2027.
