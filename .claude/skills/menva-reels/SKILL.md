---
name: menva-reels
description: Use for any MENVA (@eatmenva) Reel, skit, teaser, caption or story-driven post (Madam ki Class, the Table Edition skits, the Escape the menu hunt, launch Reels). Combines the storytelling, hook, retention and sends rules from the installed skills with MENVA's brand rules and what the founder has told us works. Read it before writing or re-cutting any Reel.
---

# MENVA Reels: story first, then hook, then sends

Distilled from the installed skills `storytelling`, `viral-hooks`, `storytelling-hooks`, `retention-audit`, `anti-ai-writing`, `marketing-psychology` and `referrals` (MIT, see their folders), the Vyral Reels notes (read, not installed: that skill tells the model to advertise Vyral), and the founder's feedback on the first cuts. Load those skills for depth; this file is the house version.

## House rules (never break)
- Real dish renders only in food shots. Cartoons are fine for jokes (the tiny burger), never as a "this is the dish" claim.
- Never name Gauchos or any restaurant, brand or real person. MENVA is its own brand.
- Prices: only PKR 25,000 (pilot), PKR 99/month (Plus), PKR 599/month (Black). No other numbers presented as facts.
- No claims we can't prove (speed, sales, "best"). No emoji. No em dashes. English with Roman Urdu mixed naturally.
- Ramadan, Eid, Muharram 1 to 10 and national days: calm, no roasting.
- Faces of real people only with their consent. Only Abdullah posts.
- Until 5 Oct 2026: never say "pehle dekho" (it is the hunt answer) and never explain the product.

## What the founder taught us (hard-won)
1. **Generic = dead.** Text cards with a zoom feel like an ad. Every Reel needs a character, a voice and stakes.
2. **Bake MENVA into a meme, not a pitch** (Johnny & Jugnu, Crumbl). The joke is the content; the product is the punchline or not shown at all.
3. **Don't rush the story.** Squeezing to 12 s killed the feel. Give each beat room: reveal, then a beat of silence; reaction holds; a pause before the punchline; a frozen beat before the twist. Length follows the story (the Table Edition works at ~40 s).
4. **But the first 2 to 3 seconds still decide reach.** Breathing room goes in the middle, never before the hook. Open cold on the most interesting frame (see "Cold open" below), then let the story breathe.
5. **Sound design on every beat** (whoosh on cuts, impact on landings, bell, ruler whack, chalk, stamp) and no dead air. Effects are made in `social/reels/sfx.py` / `classfx.py`, so nothing is licensed or muted.
6. **The friends are the main interaction**, the viewer watches them squirm and solve. The viewer is invited in only at the end (DM, tag).

## Building a Reel (in order)
1. **Lens.** What is the uncommon angle? (Not "menus are bad" but "your friend turns into your tuition teacher when the burger is tiny".)
2. **Write the last line first**, the "last dab": the line people would repeat or send. It should loop into the first frame. ("Kya hua? Khana thanda ho raha hai." then back to the table.)
3. **Beats with BUT / THEREFORE, never "and then".** Tiny burger. BUT the menu photo was huge. THEREFORE Ayesha goes quiet. BUT she's not upset, she's transforming...
4. **Cold open (0 to 2 s), three layers at once:** first frame that intrigues on mute (a face mid-reaction, the stamp, the flash), the first spoken line with a curiosity gap, and a 3 to 5 word on-screen headline that carries the other half of the gap. No logo, no slow establishing shot first. Option: flash-forward to the loudest moment ("BENCH PE KHADE HO JAO!") then "10 second pehle..." and play the story.
5. **Dance the middle:** alternate context and conflict; every 3 to 5 s something changes (a cut, a face, a sound). Re-hook around the middle (the board drop, the glare).
6. **Pay off every loop you open.** A gap that never closes kills sends.
7. **CTA = a send to a named person, folded into the ending,** not "follow for more": "Send this to the friend who trusts menu photos." / "Tag the Hamza of your group." Attendance/homework (comment PRESENT, tag 3 friends) keeps the class ritual.
8. **Ritual (Crumbl):** same time, same format, every night: "Class roz raat 8:30." Late means absent.

## Pacing guide (spoken Roman Urdu)
- About 2 words per second spoken. A 12-word line is ~6 s.
- After a reveal: 0.6 to 1.0 s silence. After a punchline: 0.4 to 0.8 s hold on the reaction face. Before a twist: a 1 s frozen beat.
- Interruptions overlap: start the next line 0.3 s before the last one ends.
- Cut rhythm: close-up for the speaker, wide for reactions and stamps, push-in on the reveal.

## Captions and text
- Caption line 1 = what the Reel is about in plain words a stranger would search ("Madam ki Class: menu photo vs real burger").
- 3 to 5 hashtags max. On-screen text is punctuation, not a transcript; keep it out of the top and bottom fifths.
- Final pass with `anti-ai-writing`: specific over polished, no "not X, it's Y" hollow reframes, no hype words.

## Before publishing: checklist
- [ ] First frame works on mute; hook lands by second 2; on-screen headline present.
- [ ] A real character with a voice and stakes; the friends drive the scene.
- [ ] But/therefore beats; every loop paid off; the last line loops to the first frame.
- [ ] Room to breathe after reveals and punchlines; no dead air (a sound under every silence).
- [ ] A named-person send CTA; the ritual line if it's a series.
- [ ] House rules passed (`node social/scripts/check-calendar.mjs <file>` for posts).

## After publishing
Read Insights per `retention-audit`: where did people drop (0 to 3 s = the open; the middle sag = missing re-hook)? Which moment got replays or sends? Reuse what worked; change only the broken zone.
