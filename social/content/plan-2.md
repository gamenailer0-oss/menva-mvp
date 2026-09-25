# MENVA on Instagram: season two (days 1-100, from 13 Jan 2027)

**What this is:** the strategy behind `calendar-2.json` (72 posts, same 5-a-week-plus-launch cadence as
`calendar.json`, continuing straight after it). Posting days stay Tue/Thu/Fri/Sat/Sun at 20:30 PKT; Monday
and Wednesday are rest days. Day 1 (13 Jan 2027) is a Wednesday and is the one exception, posted as the
season-two launch.

Same rules as season one (see `social/marketing/BRIEF.md` and the top of `plan.md`): English first, one
natural Roman Urdu line, one action per caption, at most 5 hashtags always including `#menva`, no emoji, no
invented prices beyond the PKR 25,000 pilot, no invented stats or dish names, "the green plate" and "the
trio" never named, Gauchos never named. Verified with `node social/scripts/check-calendar.mjs
social/content/calendar-2.json` → OK, and rendered with `render.mjs --calendar social/content/calendar-2.json
--sheet` → all 105 slides rendered clean, no overflow on inspection.

## 1. What's different from season one

Season two lands on the busiest stretch of the Lahore calendar: PSL season, all of Ramadan, Eid ul Fitr,
Pakistan Day, the start of spring, and April exam season — back to back. The pillar mix leans slightly more
diner-relatable and slightly more for-restaurants than season one, because so much of the season is
built around real calendar moments that give both audiences something concrete to post about.

Pillars: relatable 27, see-it-first 15, for-restaurants 16, menu-truth 10, behind-the-scan 4 (72 total).
Audience: diners 52, restaurants 16, both 4. Format: 17 carousels (24%), 55 single images — close to the
~25% carousel target.

## 2. Themes by week

| Dates (2027) | Days | What's running |
|---|---|---|
| 13–31 Jan | 1–19 | Launch of season two, general dining-culture relatable posts, Dish drop weeks 5–7, Sight test round 3, This or that rounds 4–5, Types of people at dinner parts 7–8, a myths recap and general for-restaurants posts. |
| 2–7 Feb | 21–26 | PSL season kicks off (match-night ordering, for-restaurants match-night pitch); Ramadan anticipation begins (respectful, no exact date claimed). |
| 9 Feb – 2 Mar | 28–49 | Ramadan: iftar and sehri dining culture, group iftar guide, family iftar, "types of people at iftar," no-AI-food reminder, owners' Ramadan-readiness and myths carousel, Eid anticipation starts near the end. |
| 4–14 Mar | 51–54 | Countdown to Eid: portion-for-the-dawat, for-restaurants Eid-rush pitch, This or that round 7. |
| 9 Mar | 56 | **Eid ul Fitr** (dated post; Eid greeting + dawat-table carousel). |
| 11–21 Mar | 58–68 | Eid week continued (dawat marathon, owners' Eid-week bookings, "types of people" Eid edition), then spring arrives in Lahore (Jashn-e-Baharan vibes — parks, patios, weather — kites deliberately never mentioned), owners' spring-patio pitch. |
| 23 Mar | 70 | **Pakistan Day** (dated, calm single post). |
| 25 Mar – 30 Mar | 72–77 | General relatable/menu-truth/for-restaurants posts, This or that round 9. |
| 1–22 Apr | 79–100 | **Exam season**: quick study-break dinners, budget-conscious ordering, campus-area owners pitch, papers-done celebration, Dish drop weeks 8–9, Sight test round 4, This or that round 10, a pilot-recap carousel, a team note, and the **day 100 / 200-days-total milestone carousel**. |

## 3. Dated posts (exact day/date)

| # | Day | Date (2027) | Id | Note |
|---|---|---|---|---|
| 1 | 1 | 13 Jan (Wed) | `new-season-menva` | Season two launch (exception to the Tue/Thu/Fri/Sat/Sun rule) |
| 16 | 21 | 2 Feb | `psl-season-here` | PSL season start (no fixtures claimed) |
| 17 | 23 | 4 Feb | `owners-match-night-pitch` | PSL season |
| 19 | 25 | 6 Feb | `ramadan-almost-here` | Ahead of Ramadan, subject to moon sighting |
| 20 | 26 | 7 Feb | `owners-ramadan-ready` | Ahead of Ramadan |
| 21 | 28 | 9 Feb | `ramadan-begins` | Ramadan expected to begin around now, subject to moon sighting |
| 22–35 | 30–47 | 11 Feb – 28 Feb | iftar/sehri/family-iftar/owners-Ramadan posts | Ramadan (respectful throughout, never mocking fasting) |
| 36 | 49 | 2 Mar | `eid-coming-soon` | Ahead of Eid, subject to moon sighting |
| 38–40 | 52–54 | 5–7 Mar | Eid-rush/portion posts | Ahead of Eid |
| 41 | 56 | 9 Mar | `eid-ul-fitr` | **Eid ul Fitr** (expected around 9–10 Mar, subject to moon sighting) |
| 42–44 | 58–60 | 11–13 Mar | Eid-week posts | Eid week |
| 46, 48, 49, 54 | 63–74 | 16–27 Mar | Spring posts | Spring in Lahore / Jashn-e-Baharan (no kite references, per Punjab's kite-flying ban) |
| 51 | 70 | 23 Mar | `pakistan-day` | **Pakistan Day** |
| 59–66 | 81–91 | 3–13 Apr | Exam-season posts | Exam season |
| 72 | 100 | 22 Apr | `day-100-v2` | Day 100 of season two — states "200 days" (100 + 100), which is arithmetic, not an invented stat |

If the moon-sighting dates for Ramadan or Eid move by more than a few days from the estimates above (Ramadan
~8 Feb, Eid ~9–10 Mar), re-check posts #19–#44 in `calendar-2.csv` — their copy stays generic ("Ramadan is
almost here," "Eid Mubarak") on purpose so a small date shift doesn't break anything, but a shift of more
than about a week would put them in the wrong week of the season.

## 4. Continuing series in this file

- **Dish drop** (weekly reveal): weeks 5–9, posts #4, #12, #18, #52, #62.
- **Sight test**: rounds 3–4, posts #7, #58.
- **This or that**: rounds 4–10, posts #6, #14, #28 (iftar edition), #39, #49 (spring edition), #56, #64.
- **Types of people at dinner**: parts 7–10, posts #2 (the director), #11 (the accountant), #31 (dessert
  first), #44 (the Eid table captain) — plus a one-off "types of people at iftar" post (#25) that isn't
  numbered into the main series since it's Ramadan-specific.
- **Owners ask / myths**: a myths recap (#10) and a second myths round (#35, Ramadan-themed).
- **For-restaurants**: 16 posts (~22% of the season), all ending in DM "PILOT", spread across PSL, Ramadan,
  Eid, spring and exam-season angles, plus general pitches and a pilot-explainer recap (#68).
- **Behind the scan**: a no-AI-food reminder (#33), a how-we-scan carousel (#47), a team note (#65), and the
  day-100 milestone carousel (#72).

## 5. Needs Abdullah

Nothing in this file requires Abdullah to do anything new beyond what season one already needed — no new
photography, no restaurant names, no filming, no spend. Two things worth flagging:

1. **Ramadan and Eid dates are estimates.** Ramadan 2027 is expected to start around 8 Feb and Eid ul Fitr
   around 9–10 Mar, both subject to moon sighting. Nobody needs to do anything now, but someone should
   glance at posts #19–#44 (Ramadan) and #36–#44 (Eid) once the actual dates are confirmed, in case the
   real dates land more than a few days from these estimates and the posts need to shift in the calendar.
2. **If a fifth dish gets scanned or the two unconfirmed dish names get confirmed**, this file should be
   revisited — right now it reuses the same four dishes as season one, still called "the green plate" and
   "the trio."

Everything else — captions, hashtags, alt text, the DM "PILOT" pitch, the PKR 25,000 pilot price — needs no
sign-off; it follows the same rules as `calendar.json` and passes the same automated checker.
