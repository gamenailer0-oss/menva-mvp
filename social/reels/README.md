# Motion Reels (no filming needed)

Four 1080×1920 Reels, 11–14 s, made from the brand design and the real dish renders (logo-free crops). They're **silent on purpose**: add a trending sound in the Instagram app when posting (reels.md explains why). Videos are in `out/`, each with a `-cover.jpg`.

| Reel | Length | Goal | Caption (paste) | Hashtags |
|---|---|---|---|---|
| `pehle-dekho.mp4` | 11 s | Reach, sends | Menu pe likha hai "large". Kitna large? Kisi ko nahi pata.<br><br>Pehle dekho, phir order. See the real dish on your table at true size before you order it. No app.<br><br>Send this to the friend who always asks the waiter "yeh kitna bara hota hai?" | #menva #lahorefood #lahorefoodies #3dmenu |
| `sight-test.mp4` | 12.5 s | Comments | The sight test. Read the menu line, guess the size, then see the real plate.<br><br>Pehle andaza lagao, phir dekho. How close were you? Comment "close" or "way off". | #menva #lahorefood #sighttest #lahoreeats |
| `menu-photos-lie.mp4` | 11 s | Sends, saves | Menu photos lie. Scans don't.<br><br>Every dish on MENVA is a 3D scan of a real plate: no stock photos, no AI food, ever. Asli plate, asli size.<br><br>Save this for the next time a menu photo lets you down. | #menva #lahorefood #realfood #lahorefoodies |
| `for-restaurants.mp4` | 14 s | B2B leads | Restaurant owners: your staff answers "what does it look like?" all night. Let the menu answer it at the table.<br><br>Real 3D dishes on your tables, straight from the table QR. No app for guests, and your waiters stay in charge.<br><br>Lahore pilot: PKR 25,000. DM "PILOT". | #menva #lahorerestaurants #restaurantmarketing #hospitalitypk |

**When:** the Reels slots in reels.md (Mon, Wed and Sun at 13:00 PKT) don't clash with the automated feed. Suggested week 1: Mon `pehle-dekho`, Wed `menu-photos-lie`, Sun `sight-test`. `for-restaurants` also works as a 9:16 ad (paid-ads.md) and as a WhatsApp video to send after a first DM.

**Posting:** Instagram doesn't allow the API to add music, so post these by hand from the phone. Pick the cover from the `-cover.jpg` or choose a frame in the app.

**Change or add a reel:** edit the scenes in `reels.js`, then run `node social/reels/make.mjs` (needs `npm install`, `node social/print/print.mjs` once for the dish crops, and an ffmpeg with H.264: `pip install imageio-ffmpeg`, or set `FFMPEG=`).
