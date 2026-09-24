# MENVA social: Instagram on autopilot

Posts MENVA's Instagram for 100 days, fully automatically, from a free server we control. No third-party scheduler, no approval step, and no AI at runtime: every caption and slide is already written in `content/calendar.json`.

**Start here:** [SETUP.md](SETUP.md) (click-by-click, for the founder) · [content/plan.md](content/plan.md) (the strategy) · [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) (what's still needed)

```
social/
├── SETUP.md                 how to get it running (Oracle Cloud free tier, Instagram token)
├── OPEN-QUESTIONS.md        decisions and blockers for Abdullah
├── content/
│   ├── plan.md              100-day strategy, research, rules
│   ├── calendar.json        the 72 posts: what the server reads (source of truth)
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
└── previews/sheet-*.jpg     every slide of the calendar, 24 per sheet
```

## How a post goes out

1. **n8n** checks every 15 minutes. On a posting day, at or after `POST_TIME` (20:30 PKT), it takes the day's post from `calendar.json` (day = today − `START_DATE` + 1).
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
