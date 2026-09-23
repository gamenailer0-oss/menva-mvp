# Phase 5 — Swift AR placement

## What's in place (CLAUDE.md §7)
| # | Requirement | How |
|---|---|---|
| 1 | AR only after the model is fully loaded | The AR button lives inside the 3D view, which stays hidden until "Served."; model-viewer shows it only when `canActivateAR`. Then: "Ready — see it on your table." |
| 2 | Grounded pivot | Every model is bottom-centred by the pipeline (Phase 2) |
| 3 | True scale, locked | `ar-scale="fixed"` → Quick Look gets `allowsContentScaling=0`, Scene Viewer `resizable=false` (checked in model-viewer's code). Pinch-zoom still works in the in-page 3D view. |
| 4 | Table placement | `ar-placement="floor"` (all horizontal surfaces) |
| 5 | Contact shadow | `shadow-intensity="1"`, `shadow-softness="0.6"` |
| 6 | Light estimation | `xr-environment` |
| 7 | iOS pre-warm | After load on iPhone/iPad, `fetch(usdz, { priority: 'low' })` |
| 8 | Small files | Phase 2 budgets (GLB ≤ 1.0 MB, USDZ ≤ 1.7 MB) |
| 9 | Placement feedback | `object-placed` → 12 ms haptic + `ar_object_placed {ms}` |
| 10 | Clean exit | The dish sheet is a dialog that stays open; returning lands on it unchanged |
| 11 | Absolute HTTPS model URLs | `src` and `ios-src` are absolute |
| 12 | Failure path | "AR couldn't start on this phone — you can still turn the dish here." 3D stays. `ar_failed` logged. |

AR prompt (WebXR): a phone sweeping over a plate outline + "Move your phone slowly over the table."; after 5 s without a surface: "Try over the tablecloth or a napkin — patterned surfaces work best."

Timings recorded: `ar_launch`, `ar_session_started {ms}`, `ar_object_placed {ms}`, `ar_exit {duration_ms}`, `ar_failed` (sent to the server in Phase 8).

## Tested here
Simulated the full AR lifecycle in the browser: timings, 12 ms haptic, 5-second prompt change, prompt reset on exit, failure message — all correct. Fixed AR / "See it on your table" icons being squeezed to 3 px.

## ⚠ Needs real phones (can't be done from this PC)
The acceptance test is physical: median tap-to-placed ≤ 4 s on an ARCore Android via WebXR, and Quick Look on an iPhone opening at real size on the table, with no floating, sinking or pinch-scaling. Deploy the new `dist/` and try on:
1. An Android phone with ARCore (Chrome) — tap "See it on your table", point at the table.
2. An iPhone (Safari) — same.
Tell me what you see (and whether the dish looks the right size — all plate sizes are still unconfirmed, so AR uses each scan's own measured size).
