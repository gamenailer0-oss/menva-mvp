# Creator cameos in Madam ki Class

For each creator:
1. Get their **own** written OK: a WhatsApp or DM saying they agree to a cartoon cameo in a MENVA Reel, with their name, handle and their recorded voice. Save a screenshot somewhere private (not in this public repo).
2. Add them to `consent.json`:
   `{ "handle": "@theirhandle", "name": "Their Name", "ok_date": "2026-09-27", "ok_via": "WhatsApp", "look": "short hair, beard, round glasses" }`
3. Ask for their lines as **voice notes in their own style** (5 to 15 seconds each, a quiet room, one line per note). Save them as `cameos/<handle without @>/<line id>.m4a` (or .mp3 / .ogg / .wav). The line ids come from the episode script (for example `c1.m4a`, `c2.m4a`).
4. Add the cameo to an episode in `skit/extras.mjs` with `guest.handle`. The builder then uses their real audio, draws them in our cartoon style from `look`, and shows their name and handle on screen.

The builder refuses a cameo if the creator isn't in `consent.json` or a voice note is missing. It never generates a real person's voice.
Post cameo Reels as an Instagram **Collab** with the creator, after they've seen the final cut.
