# Calendar 3 review — Roman Urdu, religious/cultural sensitivity, claims, Gen Z fit

Reviewed all 71 posts in `calendar-3.json` (days 1–100, 2027-04-23 through 2027-07-31) against `BRIEF.md`, the brand-book's Roman Urdu style guide (Section 5) and spelling table, and the patterns already fixed in `roman-urdu-review.md`. Fixes are in `calendar-3-fixes.json` (7 entries). This file is a summary — nothing here edits the calendar.

## Overall, this is strong

- The Roman Urdu is genuinely natural and disciplined: no slang stacking, no imported global slang, consistent use of the approved "Order se pehle dekh lo" family of lines, and correct gender/number agreement almost everywhere ("tasveer milni chahiye" — fem/fem, "baat seedhi pahunchti hai" — fem/fem, "sawal ... khatam ho jaata hai" — masc/masc, "Aadha season guzar gaya" — masc/masc, matching the "menu/season is masculine" convention used consistently throughout).
- The Eid ul Azha material (days 22–33) is handled carefully and explicitly self-aware: every Eid post's `note` field calls out "no animal or sacrifice imagery or jokes," and the actual copy holds to it — the humour is about kabab-hoarding and grill nights, never the qurbani itself. No red flags here.
- Mango-season posts are honest about the gap: every one explicitly states MENVA has no mango scan and stays text-only, with no invented facts about MENVA or about mangoes.
- No load-shedding jokes, no halal-certification claims, no emoji, no banned hype words, no app/download language, no pilot restaurant name, no naming of the two unconfirmed dishes.
- The calendar's own Ashura handling is good: no post lands on 9–10 Muharram (days 53–54), and the two posts closest to it (day 45, day 52) are deliberately calm and non-promotional, exactly as their `note` fields promise.

## Fixes applied (see calendar-3-fixes.json)

1. **"Char dishes hain" → "char dish hain"** (`team-note-halfway-summer`, caption + slide `ru`) — Urdu doesn't pluralize a borrowed noun with the English "-s" once a number already marks it plural; the calendar gets this right elsewhere ("Result season," not "Results season"), so this one stood out.
2. **"Iss" → "is"** (`cold-drinks-again`, caption) — the only doubled-s spelling of "is" (this) in the file; "is" is used elsewhere in the same calendar (`muharram-quiet-note`). Same category of drift as "baqi" vs "baaki" caught in the earlier review.
3. **"Joon" → "June"** (`mango-season-lahore-plates`, caption) — month names should stay English loanwords like the rest of the style guide's list (order, waiter, scan...), not get phonetically respelled. The post's own slide headline already says "June" correctly, so this also fixes an internal inconsistency.
4. **Softened an unverified benefit claim** (`owners-staff-time-3`, caption ×2 + slide `b`) — the post states "fewer table-side questions" as an established fact of using MENVA. Nothing in BRIEF.md or the brand book confirms this yet (Section 8: no order-value or result claims exist for MENVA yet); hedged with "to expect" / "aksar" / "can often" so the line stays honest.

## Flagged, not auto-fixed — needs a human call

### Two promotional pilot-pitch posts fall inside the 1–10 Muharram window

The calendar is careful about Ashura itself (no post on days 53–54, and the posts nearest it — day 45 and day 52 — are explicitly calm/non-promotional per their own `note` fields). But two full restaurant-pitch posts, each with a price and a "DM PILOT" call to action, land squarely inside the same ten-day window and carry no note flagging them at all:

- **`owners-summer-indoor-seating`** — day 47 (2027-06-08), which is roughly **3 Muharram**. Headline: "Indoor seating season is pitch season too." Full price + CTA.
- **`owners-analytics-recap-2`** — day 51 (2027-06-12), roughly **7 Muharram**. Headline: "Mid-season check: what are guests opening?" Full price + CTA.

This directly contradicts the tone the calendar itself commits to two days earlier, in `muharram-quiet-note` (day 45): *"We'll keep the tone calm and quiet through Ashura, as always."* A hard sales pitch with a PKR price tag in the middle of that stretch reads as a miss, not a deliberate choice — most likely these two posts were scheduled by the normal weekly cadence and nobody re-checked them against the Muharram note once it was added.

**Recommendation:** move both posts to dates outside days 45–54 (there's room either just before day 45 or after day 54), or swap them with two of the routine "relatable" posts that already fall outside the window. I didn't attempt a text-only fix (e.g. stripping the price/CTA) because that would gut the post's actual purpose — moving the date is the cleaner fix. Leaving the call to you.

### Two lighter, casual posts also fall inside the window — lower priority

- **`types-of-people-13-ar-filmer`** — day 49 (~5 Muharram), a dry joke about someone filming the AR placement.
- **`cold-drinks-again`** — day 50 (~6 Muharram), a light joke about asking for extra ice.

Neither is celebratory or promotional in tone — they're the same register as any other "relatable" post — so I didn't flag these as needing to move. But if the goal is a visibly quieter feed for the full ten days (not just around Ashura), these are the two candidates worth reconsidering alongside the pitch posts above.

## Scope note

Reviewed `caption` and slide `ru`/`b`/`h`/`by` fields (Roman Urdu) plus the English in every field, across all 71 posts in `calendar-3.json` only, per the brief.
