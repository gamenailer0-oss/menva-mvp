# How to finish the last pieces

Five things are left, and each needs you in person. This is the order that gets posts out fastest.

---

## 1. Get the automatic posting running (about 25 minutes, once)

**No server needed:** GitHub runs the poster for free. Follow `social/actions/README.md`:
1. Make @eatmenva a Business account.
2. Install the ntfy app and subscribe to your topic.
3. Get the Instagram key.
4. Paste the key and topic into GitHub as secrets.
5. Run a test post (nothing is published).
6. Set `DRY_RUN` = `false`.

(`social/SETUP.md` has the older server option, which needs an Oracle or paid server. You don't need it.)

## 2. Checkout for MENVA Plus and MENVA Black

The app on `main` has no accounts or payments yet, so this is two jobs: taking the money, and unlocking the plan in the app.

**Taking payments in Pakistan, simplest first:**

| Option | What you need | Good for |
|---|---|---|
| **Manual to start:** Raast or IBAN transfer, JazzCash or Easypaisa to a business number. The customer sends a screenshot on WhatsApp and you send back an unlock code | A bank account or wallet, and nothing else | The first 50 to 100 subscribers. Launch this week. |
| **Payment gateway** such as Safepay, PayFast or the JazzCash/Easypaisa merchant APIs | A registered business (NTN), a business bank account, and their onboarding checks (often 1 to 3 weeks) | Automatic monthly billing once people are actually paying |

Monthly auto-renewal on cards needs a gateway. Wallets usually mean the customer pays again each month, so send a WhatsApp reminder.

**Unlocking the plan in the app:** a build job in the main app (outside the marketing work), and it conflicts with the MVP plan's "no user accounts". The simplest version:
- MENVA sends an unlock code after payment.
- The app stores it on the phone and checks it against a small list kept in a Netlify Function.
- Plus opens the 3D view outside restaurant tables; Black shows the badge.

**Before the first paid post:** a one-page terms-and-refunds page (what each plan includes, how to cancel, refund rule), a price that includes any tax, and the checkout link in the bio.

**Then:** the 8 launch posts in `social/content/subscriptions-launch.json` are ready. Add them to the calendar in launch week, or ask me to schedule them.

## 3. Perk deals with restaurants (for MENVA Black)

Only advertise a perk once a restaurant has agreed to it in writing. Use `social/marketing/perk-agreement.md`, a one-page template: the perk, who qualifies (they show the Black badge on their phone), limits, start and end dates, and who covers the cost. WhatsApp confirmation of the filled-in page is enough to start.

Start with perks that cost the restaurant nothing: a better table when one is free, a welcome chai or water, first taste of new dishes. Discounts can come later.

## 4. Trending sounds on Reels

Instagram doesn't let any app, ours included, attach sounds from its music library automatically. You have three options:
- **Hands-off:** Reels post themselves on Mondays, silent. Silent Reels still work, and ours have big on-screen text.
- **Hands-off with music:** put a track you're allowed to use in `social/reels/audio/` and re-make the Reels. For example, a free commercial-use track from Pixabay Music or YouTube's Audio Library. Name it `default.mp3` for all Reels, or `<reel-name>.mp3` for one.
- **Best reach:** set `REELS_MODE=notify`. On Mondays your phone gets the video and caption. Open Instagram, pick the trending sound and paste the caption. It takes about a minute.

Never use a copyrighted song you don't have rights to. Instagram mutes it or takes the Reel down.

## 5. Things only you can film or say

- The founder voice note Reel (`social/marketing/spicy-ideas.md`, idea 12).
- The "pehle dekho" hand move.
- Any Reel with a real person's face, and only with their OK.

---

**What runs by itself after step 1:**

| What | When | Source file |
|---|---|---|
| Feed posts | Tue, Thu, Fri, Sat and Sun, 8:30 pm (Ramadan posts at 4:30 pm) | `content/calendar*.json` |
| The sitcom | Wednesdays | `content/series-khana-kahan.json` |
| Reels | Mondays | `content/series-reels.json` |
| A Story for each post | With each post | |
| Trend posts | Up to 2 a week, with your Stop button | `n8n/src/trends.js` |
| Token refresh, retries, alerts, no double posts | Automatic | |

**What still needs you:** the checkout, the perk deals, and anything with a face or a voice.
