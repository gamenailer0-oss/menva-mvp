# Phase 6 — Capability ladder, refinement, security, diner tests

## Capability ladder (`js/capabilities.js`)
| Tier | What the diner gets | When |
|---|---|---|
| 1 | iPhone AR (Quick Look) | iOS, model loaded, `canActivateAR` |
| 2 | Android AR (WebXR / Scene Viewer) | Android, model loaded, `canActivateAR` |
| 3 | 3D to turn and zoom | WebGL works, no AR — and always in Instagram/Facebook/TikTok/Snapchat in-app browsers |
| 4 | 360° photo spin (swipe) | No WebGL, phone with ≤ 2 GB memory, model failed, or still loading after 12 s |
| 5 | The photo, sharp and still | Everything else; always the first thing painted |

- AR tiers are decided only after model-viewer and the model have loaded — never on a timer.
- No WebGL / low memory: nothing 3D is downloaded at all (saves ~2 MB on the phones least able to afford it).
- Past 12 s: the 360° view shows ("Here it is in 360° while the full view loads") and loading continues; the 3D takes over when ready.
- In-app browsers: 3D still works; one calm line — "For the table view, open this page in Chrome or Safari." — with a Copy link button.
- Debug: `?tier=1..5`, `?slow=1` (~1 Mbps).
- AR button now sits under the dish, full width, in thumb reach; shown only for tiers 1–2.

## Diner tests (`npm test`, Playwright, 17 journeys — all pass)
Scan table QR → menu, table number, first dish on the first screen, no sideways scroll, every button ≥ 44 px · open a dish → image in the first frame, details in order, 3D takes over, Escape returns focus · second dish faster · bad/old links · menu data down → retry · model missing → 360° · model and 360° missing → photo · offline after first visit · tiers 1–5 forced · Instagram in-app · low-memory phone · no WebGL · slow connection (360° at 12 s, then upgrade). Every test also fails on any console error, CSP violation or request to another website.

## Refinement (diner's point of view)
- Menu top: the restaurant name appeared four times before any food. Now: one card (logo as the heading, location, table number, tagline), one line of description, then dishes — the first dish is on the first phone screen.
- Removed decoration that carried no information (monogram seal, "Steakhouse / Menu · PKR" column); heading now says "Prices in PKR". Trimmed generic marketing phrasing.

## Security
- Headers on every response: strict Content-Security-Policy (own origin only; scripts never inline), no framing, nosniff, same-origin referrer, camera/AR limited to this site, HSTS, COOP.
- All CSV text HTML-escaped; table numbers validated (1–999); no user input reaches the server yet.

## Bugs found by the tests and fixed
- WebGL probe blocked the first frame after a tap → now probed while the diner reads the menu, and the context released.
- model-viewer loaded the meshopt decoder as a classic script → console error. Not needed (we use Draco) → no longer set or shipped.
- Loader's own stall fallback didn't record a tier; stall analytics fired during parsing.
