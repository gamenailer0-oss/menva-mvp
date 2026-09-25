# MENVA autoposter on GitHub (no server)

GitHub runs the poster for free, because the repository is public. It checks every 15 minutes between 12:00 and 23:59 Lahore time, and checks for trends every 3 hours. It posts:
- the calendar on Tue, Thu, Fri, Sat and Sun at 8:30 pm (Ramadan posts at 4:30 pm);
- the *Khana kahan?* sitcom on Wednesdays;
- Reels on Mondays;
- a Story with each post;
- trend posts, which come with a Stop button on your phone.

GitHub's scheduler isn't exact, so a post can go out 5 to 30 minutes after its set time.

**What's where**
- The workflow is `.github/workflows/menva-social.yml`. It must be on the `main` branch, because GitHub only runs schedules from there.
- The code is in this folder (`autopost.mjs`, `trends.mjs`, `lib.mjs`).
- The posts come from `social/content/`.
- The posting history (encrypted), the log and the finished images are on the `menva-autopost-data` branch, which is created automatically. `log/posts.csv` there is the readable log.

## Setup (about 25 minutes)

**1. Instagram: a Business account** (1 min). In the Instagram app on @eatmenva, go to Settings → Account type and tools → Switch to professional account → Business.

**2. Phone alerts** (1 min). Install the free **ntfy** app. Tap **+** and subscribe to the topic name you were given (it starts with `menva-`). Keep that name private: it's also the key that encrypts the posting history.

**3. The Instagram key** (15 min). Follow `social/SETUP.md` step 6 to get a long-lived Instagram token (developers.facebook.com → your app → Instagram → Generate token).

**4. Paste the secrets into GitHub** (3 min). On github.com, open **menva-mvp → Settings → Secrets and variables → Actions → New repository secret**, and add:

| Name | Value |
|---|---|
| `IG_ACCESS_TOKEN` | the Instagram token from step 3 |
| `NTFY_TOPIC` | the `menva-…` topic name from step 2 |
| `ANTHROPIC_API_KEY` | optional: for well-written trend posts (console.anthropic.com, a few US cents per post) |

**5. Test without posting** (3 min). On the same page, open the **Variables** tab and add `START_DATE` = today's date (for example `2026-09-27`) and `POST_TIME` = `00:01`. Then go to **Actions → MENVA social autopost → Run workflow → autopost**. Within 5 minutes your phone gets "MENVA test image ready" with links to the images. Nothing is posted, because the poster starts in test mode.

**6. Go live.** Under Variables:
- set `START_DATE` = `2026-10-05`, or the day you want post #1 to go out;
- delete `POST_TIME` (so posts go out at 20:30);
- add `DRY_RUN` = `false`.

That's it. Your phone buzzes on every post, failure and trend post.

## Settings (Variables tab; all optional)

| Variable | Default | What it does |
|---|---|---|
| `DRY_RUN` | `true` | `false` = really post |
| `START_DATE` | `2026-10-05` | the day post #1 goes out |
| `POST_TIME` | `20:30` | the daily posting time (Lahore) |
| `STORIES` | `true` | a Story teaser for each post |
| `REELS_MODE` | `auto` | `notify` = send Reels to your phone so you can add a trending sound yourself |
| `TRENDS` | `true` | trend posts on or off |
| `TREND_MAX_PER_WEEK` | `2` | the most trend posts in a week |
| `TREND_DELAY_MINUTES` | `90` | how long you have to tap Stop it |
| `IG_HANDLE` | `@eatmenva` | shown on every slide |

## Everyday

- **Change a post:** edit the file in `social/content/` on the `social-automation` branch. The next run uses it.
- **Pause everything:** set `DRY_RUN` = `true`.
- **Stop a trend post:** tap **Stop it** on the alert.
- **See what happened:** the **Actions** tab (every run), or `log/posts.csv` on the `menva-autopost-data` branch.
- **When the token expires:** Instagram tokens last 60 days, and the poster renews them weekly by itself. If it ever fails, you get an alert: make a new token (step 3) and update the `IG_ACCESS_TOKEN` secret.
