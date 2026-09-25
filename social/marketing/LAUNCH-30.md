# Launch plan: 10 setup days + the first 30 days

Assumes today is **Fri 25 Sep 2026** and the automated calendar starts on its default date, **Mon 5 Oct 2026** (`START_DATE` in `.env`). If you start later, keep the order and shift the dates. Time per day is a target, not a rule.

## Setup days (25 Sep – 4 Oct)

| Day | Date | Do this | Time | Files |
|---|---|---|---|---|
| S1 | Fri 25 Sep | Answer the 15 decisions in MORNING.md §A (at least the handle, WhatsApp number, Gauchos yes/no, and the dish names) | 20 min | [MORNING.md](MORNING.md) |
| S2 | Sat 26 Sep | Instagram → Business account. Profile picture, name, bio, highlight covers | 30 min | [../profile/](../profile/) |
| S3 | Sun 27 Sep | Oracle server + install (SETUP.md steps 2–5) | 60 min | [../SETUP.md](../SETUP.md) |
| S4 | Mon 28 Sep | Meta app + Instagram token, ntfy alerts, **dry run** (SETUP.md steps 6–8). Check the test images | 30 min | [../SETUP.md](../SETUP.md) |
| S5 | Tue 29 Sep | WhatsApp Business: paste the profile, catalog, quick replies, greeting and away messages | 30 min | [channels.md](channels.md) §2 |
| S6 | Wed 30 Sep | Landing page: build it with your WhatsApp number and drag it onto Netlify. Instagram "PILOT" auto-reply | 30 min | [../landing/](../landing/), [community.md](community.md) §2 |
| S7 | Thu 1 Oct | Print: run print.mjs with your domain and contacts. Order 20 table tents, 1 sticker sheet, 30 one-pagers | 30 min | [../print/](../print/) |
| S8 | Fri 2 Oct | Build a list of 30 target restaurants in the tracker's CRM tab (verify each still fits) | 45 min | [sales-kit.md](sales-kit.md) §1, [menva-marketing-tracker.xlsx](menva-marketing-tracker.xlsx) |
| S9 | Sat 3 Oct | Practise the 10-minute demo on a friend's table, twice. Read the 17 objections | 45 min | [sales-kit.md](sales-kit.md) §3, §5 |
| S10 | Sun 4 Oct | `.env`: set `DRY_RUN=false`, confirm `START_DATE=2026-10-05`. Read this week's 6 posts in calendar.csv | 15 min | [../content/calendar.csv](../content/calendar.csv) |

## Week 1 (5–11 Oct): launch

| Day | Diners (automated feed at 20:30 unless noted) | You | Time |
|---|---|---|---|
| Mon 5 | **#1 launch carousel** goes out, plus its Story | Post the Reel `pehle-dekho` at 13:00 (add a trending sound). Share the launch post to your own Story and WhatsApp status | 30 min |
| Tue 6 | #2 "The waiter is back" | 5 cold DMs to restaurants (sales-kit.md §4) | 30 min |
| Wed 7 | rest day | Reel `menu-photos-lie` at 13:00. 2 walk-ins, 3–5 pm | 60 min |
| Thu 8 | #3 "This is a scan" | Reply to every comment (community.md). 5 DMs | 30 min |
| Fri 9 | #4 This or that | Reply to the A/B votes. Follow up on Tuesday's DMs | 30 min |
| Sat 10 | #5 Group-order carousel | Light: replies only | 15 min |
| Sun 11 | #6 For restaurants carousel | Reel `sight-test` at 13:00. Fill in Weekly KPIs week 1 | 30 min |

## Week 2 (12–18 Oct): first demos

- Automated: #7–#11 (World Food Day post #9 on Fri 16 Oct).
- Reel: `for-restaurants` (Mon). Also send it on WhatsApp after every first reply from a restaurant.
- Sales: 10 DMs + 5 walk-ins. Aim for **2 demos booked**. Log every contact in the CRM.
- Content log: enter reach, sends and saves for posts #1–#6.
- Micro-influencers: verify 5 handles from research/influencers.md and send 2 invites, only once a partner restaurant can host.

## Week 3 (19–25 Oct): the Sight test

- Automated: #12–#16. Swap in trend-bank posts if you want more of what's working (plan.md §8).
- Campaign: **Sight test** (campaigns.md #1). The `sight-test` Reel ran in week 1; now film one real "guess then reveal" Reel with friends (reels.md, guess-the-portion scripts). The feed version, post #25, follows on Sat 7 Nov.
- Sales: follow-ups (day 2–3 and day 7–9 rule). Demos. Offer the pilot using the framing you chose.
- LinkedIn: first 2 founder posts (channels.md §3).

## Week 4 (26 Oct – 1 Nov): first pilot and review

- Automated: #17–#21 (Halloween #20 on Sat 31 Oct).
- Goal: **pilot #1 signed**, or pilot #2 if the first restaurant is already live. Put the table tents on its tables.
- First monthly review: in the tracker, look at the **Pillar summary** and the top 3 posts by sends per 1k reach. Make more of those (the trend bank has ready posts), and cut or swap the weakest formats.
- Ads: only now, and only if a post has clearly outperformed. Boost it at tier 1 (paid-ads.md).
- Press: when a pilot is live and you've said yes to naming it, send the press release (pr-and-offline.md).

## Day 30 (Tue 3 Nov): checkpoint

Answer these in the tracker's notes:
1. How many "PILOT" leads, demos and pilots so far?
2. Which 3 formats get the most sends per 1k reach?
3. Which objection came up most? Update the pitch.
4. What's one thing to stop doing?

Then run the next 30 days with the same rhythm: the automated feed + 3 Reels a week + 10 DMs and 5 walk-ins a week + a monthly review. For the first pilot's results meeting, run `node social/print/pilot-report.mjs <stats.csv> --restaurant "…"`.
