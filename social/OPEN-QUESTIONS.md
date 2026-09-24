# Open questions and things I skipped

Each item says what's blocked, what I did for now, and what's needed from Abdullah.

## Needs Abdullah

1. **The `social/HANDOFF.md` spec and the `redesign-chili` branch aren't on GitHub.** The only branch was `main`, so `social-automation` starts from `main`. Everything here comes from the task brief plus the repo (CLAUDE.md, `design/MENVA.DESIGN.md`, `css/tokens.css`).
   *Needed:* if the redesign-chili work still exists on someone's computer, push it. The social templates only use the fonts in `vendor/fonts/` and the dish renders, so a rebase later is easy.

2. **"A · Chili" design direction: my interpretation.** The written Chili spec was in the missing handoff. I used the site's own tokens with the chili-red accent `#B5371F` doing the work: cream paper, ink, Instrument Serif headlines with one italic red word, DM Sans text, and no emoji or gradients. Previews are in `social/previews/sheet-*.jpg`.
   *Needed:* a quick yes, or the list of differences. Colours and type are all in `social/templates/post.css`.

3. **Gauchos' logo is carved into two of the boards** (`steak-main` and `chicken-fajita-wrap`). The templates only use crops that leave the carving out. A crop that shows it is refused unless a post is marked `brandOk`.
   *Needed:* permission to show or name Gauchos, if you want it. Until then no post names Gauchos. Note that the "link in bio" site (menva-ar.netlify.app) *does* show "Now at Gauchos" on its home page.

4. **Two dish renders don't look like their names.** `garlic-prawn-skewers/poster.webp` looks like a toasted flatbread with toppings on a green plate. `chicken-fajita-wrap/poster.webp` looks like three open tortillas on a board. Their CSV rows also still say "Placeholder description — confirm with Abdullah".
   *For now:* posts call them "the green plate" and "the trio", and never name them. `check-calendar.mjs` blocks the words prawn, skewer, fajita and wrap.
   *Needed:* the real dish names. It's also worth checking the site menu, which shows these names today.

5. **Instagram handle.** It isn't known, so no handle is printed on the images yet.
   *Needed:* set `IG_HANDLE=@...` in the server's `.env`, and it appears on every slide.

6. **What the PKR 25,000 pilot includes** (length, number of dishes, who does the scanning). The site footer says "3D scans provided by restaurants". Posts only say "Lahore pilot: PKR 25,000. DM 'PILOT'" and never promise what's included.
   *Needed:* the pilot details, if you want posts that spell them out.

7. **Who signs the "note from the team" (#57)?** It's signed "Team MENVA", because I don't know how you want to be credited.

8. **Link in bio.** Posts say "link in bio" / "try the demo". It points wherever the bio points, today menva-ar.netlify.app.
   *Needed:* when the custom domain is live, update the bio. No link is printed on any image, so no posts need changing.

## Can't do from here (must be done by a person)

9. **Oracle account, Meta developer app, Instagram token, DNS and ntfy topic.** These need your logins and a card check. They're click-by-click in `SETUP.md`, steps 1–7.

10. **A live Instagram post from the real API.** The whole pipeline was tested here with Docker: n8n 2.40.6 → Gotenberg 8.37.0 → Caddy 2.11.4 → a mock Instagram API that downloads each image and checks it's a real JPEG. Single posts, carousels, the weekly token refresh, no-double-posting, and failure alerts all passed. The first real post is the first time Meta's live API sees it. Step 8 (dry run) exists to catch problems before that.

11. **`install.sh` on a real Oracle ARM server.** The Docker images are multi-arch (arm64 included) and the compose stack was tested. The Oracle-specific firewall lines follow Oracle's documented Ubuntu setup, but they haven't been run on a real Oracle instance.

## Ideas for later (not blocking)

12. **Reels.** Instagram's reach favours Reels. The 360° spin renders (`assets/dishes/*/spin.webp`) are real renders too and could become short turning-dish videos. I kept to `poster.webp` as the brief said.
    *Needed:* OK to use the spin renders for social.

13. **Google Sheet log.** The original plan mentioned logging posts to a Google Sheet. That needs a Google Cloud OAuth app, which is a lot of setup for a non-technical owner. Instead the server writes `files/log/posts.csv`, and the ntfy alert includes each post's link. A Sheets node can be added in n8n later.

14. **Plate sizes.** All four dishes still have `plate_length_cm = TO_CONFIRM`, so no post quotes a size in cm (the checker blocks it). Once the sizes are measured, "true size: 42 cm" style posts become possible.
