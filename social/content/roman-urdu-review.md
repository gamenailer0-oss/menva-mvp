# Roman Urdu review — MENVA Instagram content

Reviewed every "caption" and slide "ru" / "b" / "h" / "by" field carrying Roman Urdu across `calendar.json` (100 days), `calendar-2.json` (100 more days, incl. Ramadan/Eid), and `trend-bank.json` (22 evergreen/trend posts), against `BRIEF.md` and the brand-book's Roman Urdu style guide (Section 5) and spelling table.

Fixes are in `roman-urdu-fixes.json` (9 entries). This file is a summary — nothing here edits the calendar files.

## Overall, this is strong

- The core lines are genuinely natural — "Order se pehle dekh lo," "Waiter ko list dikhao, baat khatam," "Aik banda order kare, baqi sab chup," "Dost ki plate hamesha behtar lagti hai. Kyun?" — these read like things a Lahori friend would actually text, not translations. The "one clean English line + one short Roman Urdu line" pattern from the style guide is used consistently and well.
- Gender/number agreement is handled correctly almost everywhere it matters: "plate aaye" (subjunctive, correctly gender-invariant), "khushiyan aur barkatein... aayein" (plural subjunctive matching a plural subject), "aankhen khuli rakho" (feminine plural adjective agreeing with "aankhen"), "dost hain" (plural verb for plural "dost"). No actual agreement errors were found.
- The Ramadan and Eid material (calendar-2.json, days 28-47 and around day 49-61) is warm and respectful throughout — greetings like "Ramadan Mubarak, Lahore" and "Khushiyan aur barkatein aap sab ke ghar aayein" land well, and none of the iftar/dawat jokes make light of the fast or the occasion itself; they're about ordinary table chaos (Dadi/Nani needing to see the plate first, the person who's early, the dessert-first planner), which is exactly the right register.
- The approved tagline "Pehle dekho, phir order" (trend-bank's `catchphrase-pehle-dekho`) is used correctly and matches the brand book's exact wording — good discipline given how easy it is to drift ("dekho phir order karo," etc.) across 200+ posts.
- Slang discipline is good: no post stacks more than one Roman Urdu idiom/slang term, and there's no imported global slang ("no cap," "it's giving," etc.) anywhere in the three files.

## Patterns fixed

1. **A calqued phrase repeated twice.** "Camera khata pehle" (meant to mirror the English headline "Camera eats first") drops the auxiliary verb and puts the adverb in English word order. Fixed to "Camera pehle khata hai" in both places it appears (`calendar.json` → `the-photographer`, `trend-bank.json` → `the-table-is-the-photo-spot`).
2. **A spelling inconsistency on a common word.** "Baqi" (rest/remaining) is spelled "baqi" everywhere else (`baqi sab chup`, `baqi log ruko`) but appears once as "baaki" (`calendar-2.json` → `types-of-people-9-dessert-first`). Standardised to "baqi."
3. **English-loan-verb register mismatch.** "Fix hai" (caption) vs. "fixed hai" (headline) on the same post (`wedding-season`) — the natural code-switch pattern drops the English past-tense ending, so the headline was brought in line with the caption.
4. **One "ru" field that isn't Roman Urdu at all.** `types-of-people-iftar-ready-early` in `calendar-2.json` has `"ru": "Respect, honestly."` — a straight repeat of the caption's English punchline, almost certainly a copy-paste slip. Replaced with an actual local line ("Itne time ke pakke ho? Yaar, salute hai.") carrying the same warm joke.
5. **A split future-tense verb and an over-formal phrase**, both isolated one-offs: "karo ge" → "karoge" (`dish-drop-1-steak-board`), and "kam az kam" (literary/formal register) → "kam se kam" (how someone would actually text it) in `queue-culture`.

## Lines that might land differently than intended (left alone, worth a human read)

- **"Khana wohi mangwao jo khana hai"** (`world-food-day`, calendar.json) fronts "khana" for a deliberate pun (food/to-eat), which works as a stylised line but reads a little dense on first pass — not wrong, just worth Abdullah reading aloud once before it goes out.
- **"Teen doodh, aik sawal: kitna bara slice?"** (`three-milk-cake`, trend-bank.json) shortens "three milk cake" to "teen doodh," which most people would actually just say in English as the dish's name. It works as a callback to the English line right before it, but a Lahori reading it cold might pause on "teen doodh" alone.
- **"Theek hai, but maine isse better khaya hai"** (`the-food-critic`, calendar.json) mixes in plain English connector words ("but," "better") rather than slang — this is genuinely how a lot of Lahori 18-30 year olds talk, so it's left as-is, but it's the one line in the set that leans furthest into code-switching and is worth a gut-check if the brand wants Roman Urdu to stay cleaner.

## Scope note

Only `calendar.json`, `calendar-2.json` and `trend-bank.json` were reviewed, per the brief. `calendar.csv`, `calendar-2.csv`, `trend-bank.csv` and `whatsapp-status.json` also exist in `social/content/` and contain the same or similar Roman Urdu lines (the CSVs appear to be exports of the JSON) — they weren't in scope for this pass and weren't checked line-by-line, so the same fixes likely apply there if/when those files are regenerated from the JSON.
