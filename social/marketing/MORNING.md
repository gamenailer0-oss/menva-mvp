# For Abdullah: decisions and to-dos

Everything that needs your permission, money, login or a real person was saved here instead of being done. Sorted by what unblocks the most.

## A. Decisions (answer these first, 20 minutes)

| # | Decision | Why it matters | Options / default |
|---|---|---|---|
| 1 | **Can posts name or show Gauchos?** | Unlocks the full steak and trio boards, filming at the restaurant, PR and case studies | Default: no (everything is built to work without it) |
| 2 | **Real names of the two unconfirmed dishes** ("green plate", "trio") | They're in 30+ posts and on the live site menu | Tell us the names, or keep the nicknames |
| 3 | **Instagram handle** | Printed on every slide, story, tent and deck | Set `IG_HANDLE` in the server's `.env` |
| 4 | **WhatsApp business number** | Landing page buttons, one-pager, deck, click-to-WhatsApp | Rebuild with `--whatsapp 92…` |
| 5 | **Custom domain** | Real QR codes on tents, one-pager and deck (netlify.app is refused for print) | Set it, then run print with `--domain` |
| 6 | **What the PKR 25,000 pilot includes** (length, dishes, who scans, what happens after) | Sales scripts deliberately say "we'll walk you through it" until this is set | See sales-kit.md §6 for framings |
| 7 | **Pilot framing**: founding partner / case study / first-5 cohort / straight pitch | Drives the Founding tables campaign | sales-kit.md §6, campaigns.md #4 |
| 8 | **OK the "A · Chili" look** | Everything uses it | Previews: `social/previews/sheet-*.jpg` |
| 9 | **Using the AR menu study in sales** (Fritz et al., *Journal of the Academy of Marketing Science*, 2023: dessert orders 41.2% vs 18%) | Our strongest outside evidence, but it's not a MENVA result | Verify the paper first; always cite it as research |
| 10 | **Who may post as the brand** (comment replies, same-day cricket posts) | community.md, campaigns.md #6 | You only, or name someone |
| 11 | **Budget**: ads (PKR 10k / 30k / 75k a month), print, ambassadors | Nothing has been spent | paid-ads.md §3, pr-and-offline.md |
| 12 | **OK to use the 360° spin renders for Reels** | Reels without filming | OPEN-QUESTIONS.md #12 |

| 13 | **Merge the link-preview fix to the live site** (OG tags, share image, `/stats` out of search; on the `social-automation` branch) | Links shared on WhatsApp currently unfurl blank | Review the `index.html` + `robots.txt` diff, then merge |
| 14 | **Next segment**: banquet halls/weddings or custom-cake bakeries | Both fit "see it before you commit"; banquets need 6–8 scans per deal | segments.md |

| 15 | **Filming and demos show the carved "Gauchos" on two boards** (the 3D models themselves, not our crops) | Affects AR screen recordings, Reels, and demos to other restaurants | Until naming is OK'd, film and demo with the steak sandwich and the green plate |

## B. Setup (in this order, about 4 hours total)

1. **Server + Instagram autoposting**: follow [../SETUP.md](../SETUP.md) steps 1–9 (about 1 hour). Start with `DRY_RUN=true`.
2. **Instagram profile**: upload the profile picture and highlight covers, and pick a name and bio ([../profile/README.md](../profile/README.md)).
3. **WhatsApp Business**: paste in the profile, catalog, quick replies, greeting and away messages ([channels.md](channels.md) §2).
4. **Landing page**: `node social/landing/build.mjs --whatsapp 92XXXXXXXXXX --instagram yourhandle`, then drag `social/landing/dist/` onto Netlify as a new site. Don't put it on the main site's `main` branch without checking it.
5. **Print files**: `node social/print/print.mjs --domain yourdomain --whatsapp "…" --instagram "@…"`, then send `social/print/out/*.pdf` to a printer (pr-and-offline.md lists Lahore printers).
6. **Instagram auto-replies** for "PILOT" ([community.md](community.md) §2).
7. **Tracker**: open [menva-marketing-tracker.xlsx](menva-marketing-tracker.xlsx) (or upload it to Google Sheets). It holds the CRM, weekly KPIs and a log of all 72 posts.
8. **Reels**: post the 4 motion Reels from [../reels/](../reels/) by hand with a trending sound (Mon/Wed/Sun 13:00).

## C. Outreach only you can do

- Verify the restaurant research list, then start **10 DMs + 5 walk-ins a week** ([sales-kit.md](sales-kit.md)).
- Micro-influencer invites: verify the follower counts first ([research/influencers.md](research/influencers.md)).
- Press: approve the quotes in the press release, then send the pitches ([pr-and-offline.md](pr-and-offline.md)).
- Events: ask Lahore Eat, Expo Centre and LUMS about a stall or demo slot.
- Awards: P@SHA ICT Awards, Startup World Cup Lahore, NIC Lahore / Plan9.

## D. Filming (when you're ready)

- Friends for the POV and reaction Reels; consent for every face ([reels.md](reels.md)).
- A second restaurant (not the pilot) for the B2B owner-reaction Reels.
- Accounts: TikTok, YouTube, LinkedIn company page ([channels.md](channels.md)).

## E. Checks I couldn't do from here

- A real Instagram API post (tested against a mock; the dry run in SETUP.md step 8 is the safety net).
- `install.sh` on a real Oracle ARM server.
- Influencer databases (modash, heepsy, collabstr) and some research sites were blocked here. Their numbers come from search snippets and are labelled as such.
- The Punjab 16% ad-services tax: confirm it on your first Meta ad charge (paid-ads.md).

Each file also ends with its own detailed "Needs Abdullah" list.
