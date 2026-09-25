# MENVA social: Instagram on autopilot

Posts MENVA's Instagram for 200 days (144 posts, each with a Story), fully automatically, from a free server we control. No third-party scheduler, no approval step, and no AI at runtime: every caption and slide is already written in `content/calendar.json` and `calendar-2.json`.

**Start here:** [marketing/MORNING.md](marketing/MORNING.md) (decisions and to-dos) · [marketing/STRATEGY.md](marketing/STRATEGY.md) (the whole marketing plan on one page) · [SETUP.md](SETUP.md) (server, click by click) · [marketing/LAUNCH-30.md](marketing/LAUNCH-30.md) (the first 30 days) · [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md)

What's in the kit:
- **Automated Instagram**: 144 feed posts over 200 days (`content/calendar.json` + `calendar-2.json`), a Story teaser for each, and a 22-post trend bank.
- **Ready to post by hand**: 8 motion Reels (`reels/`), a WhatsApp Status week and 8 ad creatives in 9:16 (`previews/ready/`).
- **Print**: table tent, menu stickers, window sticker, A4 one-pager, 10-slide pitch deck, pilot results report (`print/`).
- **Web**: a "for restaurants" landing page (`landing/`) and an Instagram profile kit (`profile/`).
- **Playbooks** (`marketing/`): sales kit, campaigns, Reels and video scripts, channels, community, paid ads, PR and offline, brand book, segments, website, and the research behind them; a tracker workbook.

```
social/
├── SETUP.md                 how to get it running (Oracle Cloud free tier, Instagram token)
├── OPEN-QUESTIONS.md        decisions and blockers for Abdullah
├── content/
│   ├── plan.md              100-day strategy, research, rules
│   ├── calendar.json        posts for days 1–100: what the server reads (source of truth)
│   ├── calendar-2.json      days 101–200, read automatically after day 100
│   ├── trend-bank.json      22 extra posts to swap in; ads-9x16.json, whatsapp-status.json
│   └── calendar.csv         the same, for Excel / Google Sheets (generated)
├── templates/               the "A · Chili" post design: one HTML page draws any slide
│   ├── post.html, post.css, post.js
│   └── README.md            slide fields and layouts
├── n8n/
│   ├── workflow.json        what n8n imports (generated: don't edit by hand)
│   └── src/*.js             the workflow's code, readable
├── server/
│   ├── docker-compose.yml   n8n 2.40.6 + Gotenberg 8.37.0 + Caddy 2.11.4 (pinned)
│   ├── Caddyfile, .env.example
│   └── install.sh, update.sh
├── scripts/
│   ├── check-calendar.mjs   checks the content rules, writes calendar.csv
│   ├── render.mjs           renders slides to JPEG locally (previews)
│   └── build-workflow.mjs   n8n/src → n8n/workflow.json
├── previews/                contact sheets of every slide; ready/ holds post-ready 9:16 images
├── reels/                   8 motion Reels (MP4) + the code that draws them
├── print/                   print.mjs (tent, stickers, one-pager, deck, window sticker), pilot-report.mjs
├── landing/                 "for restaurants" page + build.mjs
├── profile/                 profile picture, highlight covers, link-preview image
└── marketing/               strategy, playbooks, research, tracker (see STRATEGY.md)
```

## How a post goes out

1. **n8n** checks every 15 minutes. On a posting day, at or after `POST_TIME` (20:30 PKT) or the post's own `time`, it takes the day's post from `calendar.json`, then `calendar-2.json` from day 101 (day = today − `START_DATE` + 1).
2. For each slide it asks **Gotenberg** (headless Chrome) to screenshot `templates/post.html?d=<slide JSON>` at 1080×1350. **Caddy** serves the template, the real dish renders and the fonts on a private port. A slide that breaks a rule (a missing dish, or a crop that shows restaurant branding) throws an error, so it never gets posted.
3. The JPEGs are saved to `server/files/media/`. Caddy serves them at `https://<domain>/media/…` so Instagram can download them.
4. **Publish** calls the Instagram API with Instagram Login (`graph.instagram.com`): it makes one container per image (a carousel if there's more than one), waits until they're `FINISHED`, publishes, then records the permalink in `server/files/state.json` and `files/log/posts.csv`.
5. Safety nets: the token is refreshed weekly (long-lived tokens last 60 days); it never posts twice (checks its own record and the captions of recent posts); failures retry every 15 minutes, 3 times a day, and alert the phone through ntfy. A manual test of a future post is always a dry run.

## Working on it

```bash
npm install                                    # once (repo root)
node social/scripts/check-calendar.mjs         # after editing calendar.json
node social/scripts/render.mjs 12 13 --sheet   # preview posts 12 and 13 → social/previews/out/
node social/scripts/build-workflow.mjs         # after editing social/n8n/src/*.js
```
Then commit, and on the server run `social/server/update.sh`.

Content rules (checked by `check-calendar.mjs`): real dish renders only, no emoji, never name Gauchos or show its logo without Abdullah's OK, no dish prices (the PKR 25,000 pilot is the only price), no sizes in cm, and don't name the two unconfirmed dishes.
