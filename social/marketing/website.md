# MENVA — website audit and copy plan

Read against `BRIEF.md` and `brand-book.md`. Source code reviewed (read-only, nothing here was edited): `index.html`, `js/app.js` (the `brandPage()` function — the home page — plus `restaurantPage()`, `openDish()` and `js/capabilities.js` for the in-app-browser and SEO-relevant behaviour), and `social/landing/page.html` (the "for restaurants" landing page, built by `social/landing/build.mjs`).

Per `BRIEF.md`: the pilot restaurant's name is written as **[pilot restaurant]** throughout this file, never the real name, even though it already appears live on the product (that's an existing decision already reflected in the code — anything that would *change* how or whether it's shown is flagged under "Needs Abdullah").

---

## 1. Audit of the current home page

The home page is rendered client-side by `brandPage()` in `js/app.js` (route `/`). The static shell in `index.html` ships an empty `<div id="app"></div>` — everything below is injected by JavaScript after load.

### 1.1 Who it speaks to

**It speaks only to diners, and only to diners who are already physically at a table.** There is no restaurant-owner path anywhere on the home page — no "for restaurants" link, no pricing, no pitch, nothing pointing at `social/landing/page.html`. A restaurant owner who lands on `menva-ar.netlify.app` (from a business card, a WhatsApp forward, or a Google search for "digital menu Lahore") sees a diner product demo and no next step for them.

More specifically, the hero copy assumes the visitor is *at a restaurant table right now*:

> "Scan the code at your table and the real dish appears in front of you — true to size, before you decide."

That's the right copy for someone who just scanned a table QR. It is the wrong copy for the much larger audience who will actually land on this URL: people tapping a link in an Instagram bio, a WhatsApp forward, or a Google result, sitting on a sofa, not at a restaurant. For that visitor "scan the code at your table" describes an experience they aren't having yet, which weakens the value proposition's clarity in the exact channel (`link-in-bio`) the brand's own content plan relies on.

### 1.2 Clarity of the value proposition

The core line is strong and on-brief:

> **h1:** "See it on your table. Then *order it.*"
> **overline:** "AR menus · Lahore"

This is one of the five approved lines from `brand-book.md` Section 3, used correctly (the "specifically about the AR moment" register). It's concrete, calm, sentence case, no hype — good.

Where clarity breaks down:
- The value prop never explains **why** this matters (no more guessing what a dish looks like) before jumping to the mechanic. A first-time visitor with zero context gets "see it on your table" without the problem it solves.
- "AR menus · Lahore" as the overline states the category, but a visitor who doesn't already know what an "AR menu" is gets no plain-English translation until the "How it works" section, three scrolls down.
- The word **"AR"** appears before it's ever spelled out. `BRIEF.md`'s own approved language leads with the mechanic ("scan, tap, see, place"), not the acronym.

### 1.3 CTAs

Home page has exactly one primary action:

```html
<a class="product-action" href="/${slug}" data-link>Open the [pilot restaurant] menu →</a>
```

This is a good CTA — concrete, matches "scan, tap, see, place" verb guidance, no hype. Two issues:
1. **It's the only CTA on the whole page.** There's a second, softer one at the bottom of the pilot section ("See the full menu →"), but both go to the same place. A visitor who isn't ready to open the live menu (e.g. a restaurant owner, or a diner just browsing before deciding to visit) has nothing else to do or click.
2. **No CTA for restaurants at all.** Given `social/landing/page.html` already exists and is built for exactly this audience, the home page should link to it.

### 1.4 Trust signals

The only trust line on the page is:

> "Works in Safari and Chrome · No app to install"

This is true, on-brand, and useful — it pre-empts the "do I need to download something" objection. But it's the *only* trust signal on the entire page. Missing, and all legitimately available per `BRIEF.md`'s "can claim" list:
- **"Real, not rendered"** (pillar 1) — nothing on the home page says the dishes are real 3D scans, not AI or stock photography, even though this is one of MENVA's strongest, most defensible claims and a real differentiator (`brand-book.md` Section 2, pillar 1).
- No footer trust signals at all. The footer is three lines with no links:
  ```html
  <footer><span>menva.</span><p>See it before you order it.</p><small>3D scans provided by restaurants</small></small></footer>
  ```
  No Instagram, no WhatsApp, no contact, no "for restaurants," no privacy note. For a new, one-pilot startup, an empty footer reads as unfinished rather than calm.
- The line **"3D scans provided by restaurants"** is worth double-checking with Abdullah before repeating anywhere else — `BRIEF.md` doesn't say who captures the scans, and this phrasing implies restaurants supply their own scan files, which may not match how MENVA actually operates (see Section 7).

### 1.5 In-app-browser experience (Instagram, etc.)

Checked in `js/capabilities.js` and `js/app.js`. Relevant code:

```js
// js/capabilities.js
const inApp = /Instagram|FBAN|FBAV|FB_IAB|FBIOS|TikTok|musical_ly|Bytedance|Snapchat|Line\/|WhatsApp/i.test(ua);
...
function assign(viewer) {
  if (forced && forced <= 3) return forced;
  if (inApp) return 3;          // in-app browsers never get AR
  if (viewer.canActivateAR) return isIOS ? 1 : 2;
  return 3;
}
```

```js
// js/app.js, inside openDish() — only shown once a diner has tapped into a specific dish's 3D view
${MenvaCaps.inApp ? `<p class="inapp-note">For the table view, open this page in Chrome or Safari. <button type="button" class="copy-link">Copy link</button></p>` : ''}
```

**What actually happens, in order:**
1. **The home page itself renders fine inside Instagram's in-app browser.** The hero "AR demo" (`arDemo()`) is a pure CSS/HTML animation, not `model-viewer`, so nothing is blocked and no warning shows here.
2. Once the visitor taps into the pilot's menu and opens an actual dish, if they're still inside an in-app browser, the tier is forced to 3 ("in-page 3D only") — they can still see and turn the real 3D dish, but the AR ("place on your table") step is unavailable, and they see: *"For the table view, open this page in Chrome or Safari."* with a **Copy link** button.
3. If `navigator.clipboard` isn't available, it falls back to `window.prompt('Copy this link, then open it in Chrome or Safari:', location.href)`.

**Assessment:** the copy itself is honest, calm, and exactly matches the brand voice's error-copy rule ("explain what happened and what to do next, no apologies" — `brand-book.md` Section 4). No complaints about the wording.

The real issue is **reach, not wording**: MENVA's own marketing plan is Instagram-led, and Instagram's in-app browser is the default for anyone tapping a link in a caption, story, or bio. That means a large share of diner traffic will only ever reach tier 3 (3D, no AR) unless they notice and tap "Copy link," then manually switch apps — a real drop-off point for the product's signature "wow" moment (true-size AR placement). This isn't a copy problem to fix on the page itself; it's worth pre-empting in the *outbound* content (captions, bio text) that sends people to the link in the first place, e.g. telling people up front to open the link in their regular browser for the full effect. That's a recommendation for the content/caption files, not this one, so it's noted here and not actioned.

### 1.6 SEO basics

Checked in `/home/user/menva-mvp/index.html` (the only static HTML the site ships) and `robots.txt`.

| Element | Current state | Issue |
|---|---|---|
| `<title>` | `MENVA — See it before you order it` | Fine length (36 chars) and on-brand, but has no location or category keyword ("Lahore," "AR," "menu"), which weakens relevance for local search. |
| `<meta name="description">` | `MENVA — See it before you order it. Your good food looks better here.` | "Your good food looks better here" is vague — unclear who it's addressing (diner? restaurant?), doesn't say what MENVA *is* (AR menu, Lahore, QR), and isn't a strong click-through description for a search result. |
| `og:title` / `og:description` / `og:image` | **Not present.** Grepped the full file — no `og:` or `twitter:` tags anywhere. | This is the most concrete, fixable problem found. A link to `menva-ar.netlify.app` pasted into **WhatsApp**, Instagram DMs, or Messenger — the exact channels this brand relies on — will unfurl with no custom title, no description, and no image. Given the brand's own "send this to a friend" CTA pattern (`brand-book.md` Do/Don't table), a broken or blank link preview directly undercuts the one mechanic the content plan depends on. |
| Twitter Card tags | Not present. | Lower priority for a Pakistan-first audience, but free to add alongside OG tags. |
| Canonical link | Not present. | Minor now; matters once the custom domain replaces `menva-ar.netlify.app`, to avoid the old subdomain competing with the new domain in search. |
| Headings (H1 etc.) | **None exist in the static HTML.** The `<h1>` ("See it on your table...") only exists after JavaScript runs (`brandPage()` injects it into `#app`). | Google generally renders JavaScript, but many other crawlers and virtually all link-preview bots (WhatsApp, Facebook, Instagram, iMessage) do **not** execute JavaScript — they only read the static HTML. Right now that static HTML has no heading, no body copy, and no OG tags for them to read. |
| Structured data (JSON-LD) | Not present anywhere on the site. | No schema markup at all — see Section 4.4 for what to add. |
| `robots.txt` | `User-agent: * \n Allow: /` | Correctly allows indexing (nothing is accidentally blocked), but has no `Sitemap:` line, and no `sitemap.xml` file exists anywhere in the repo. `/stats` (the private analytics dashboard, key-protected) is also not disallowed — it's crawlable in principle even though its data is key-gated. |
| Indexability | Allowed, but currently pointed at `menva-ar.netlify.app`, a placeholder domain `BRIEF.md` says will change ("a custom domain is coming"). | Any SEO investment (backlinks, directory listings, Search Console verification) made against the `.netlify.app` URL now will need to be redone once the custom domain goes live — worth sequencing after the domain, not before. |

**Bottom line on SEO:** the biggest, cheapest win here is not keyword-stuffing — it's adding OG/Twitter tags and a proper meta description, because the current gap actively breaks link sharing on the exact platforms (WhatsApp, Instagram) the brand already uses as its main channel.

---

## 2. Recommended copy changes

Brand voice check applied to every suggestion: sentence case, no emoji, no hype words, concrete verbs, one idea per line, Roman Urdu as a natural companion line (not a literal translation).

### 2.1 Safe now (no naming, pricing, or founder decision involved)

| Location | Before | After | Why |
|---|---|---|---|
| `<title>` | `MENVA — See it before you order it` | `MENVA — AR dish menus for Lahore restaurants` (or keep the tagline and add the category+city in the meta description instead, see below — either works, pick one) | Adds "Lahore" and "restaurants," which nothing in the current title has, without losing the tagline if kept as an OG title instead (see 4.2). |
| `<meta name="description">` | `MENVA — See it before you order it. Your good food looks better here.` | `See a real 3D scan of the dish, at its true size, on your own table — before you order. Live pilot in Lahore. No app, works in Safari and Chrome.` | States what MENVA *is*, the mechanic, the city, and the "no app" reassurance — all facts already cleared in `BRIEF.md`'s "can claim" list. Removes the vague, unattributed "your good food looks better here." |
| Home hero overline | `AR menus · Lahore` | `See it before you order it.` (as the overline) with `AR menu · Lahore` demoted to the trust line below the CTA | Leads with the umbrella message (brand-book's own instruction: "if in doubt, use this one"), not an unexplained acronym. |
| Home hero lead paragraph | "Scan the code at your table and the real dish appears in front of you — true to size, before you decide." | Two versions, shown by context (see Section 3 for the structural fix): **at-table version** (unchanged, it's correct there) vs. **link-in-bio version**: "A diner scans the QR at their table, and the real dish appears in front of them — true to size, before they decide. Here's what that looks like." | Keeps the accurate at-table copy where it's true, and stops describing an experience the *actual* home-page visitor (arriving via a link, not a QR) isn't having. |
| Home hero trust line | "Works in Safari and Chrome · No app to install" | "Works in Safari and Chrome · No app to install · Real 3D scans, never AI" | Adds pillar 1 ("real, not rendered") — a cleared, differentiating claim currently missing from the page entirely. |
| Home hero secondary CTA | *(none exists)* | Add: `For restaurants →` linking to the landing page | The page currently has zero path for restaurant owners. This is one link, no new claims, no pricing. |
| Footer | `menva. / See it before you order it. / 3D scans provided by restaurants` | `menva. / See it before you order it. / For restaurants → · [Instagram link] · [WhatsApp link]` (drop or verify the "3D scans provided by restaurants" line — see 2.2) | Gives the page a minimal trust/contact layer instead of three dead-end lines. Social links need the handle/number confirmed (Section 7). |
| Landing page FAQ: "What does the pilot include?" | "Message us and we'll walk you through it, and show you a live demo on your own table." | "We'll walk you through exactly what's included on a quick call, and show you a live demo on your own table first." | Same meaning (never states inclusions, per `BRIEF.md`), reads as an invitation rather than a deflection. |
| Landing page hero secondary CTA | "Try it on your table" → links to the general demo URL (home page) | Keep the label, but point it at a specific dish inside the pilot menu (one with 3D) instead of the home page, so an owner reaches the actual 3D/AR moment in one tap instead of two | Shortens the demo path for a skeptical, time-pressed owner. Pure routing change, no new copy claims. |

### 2.2 Needs Abdullah (naming the pilot restaurant, or a business/identity decision)

| Location | Current / proposed | Why it needs sign-off |
|---|---|---|
| Home page "Now at" section, and the `/${slug}` CTA copy ("Open the [pilot restaurant] menu") | Already live in production, showing the real pilot name and logo. | `BRIEF.md`: "its name must never appear in public-facing copy without the founder's OK." It's already on the live site, so this may already be approved for the product itself — but any *change* to how, where, or how prominently it's shown (e.g. making it more prominent in SEO, meta tags, or the sitemap) needs a fresh OK, not an assumption that it's blanket-cleared. |
| Footer line "3D scans provided by restaurants" | Keep, cut, or reword | Can't verify from `BRIEF.md` who actually captures the scans (MENVA or the restaurant) — the current phrasing may misstate the product's own process. Needs Abdullah to confirm the correct mechanic before this line is repeated anywhere else (including JSON-LD `Organization` descriptions, see 4.4). |
| Any `Restaurant` / `LocalBusiness` schema naming the pilot restaurant directly (Section 4.4) | Not yet built | Structured data with the restaurant's real name, address, and logo is a much more permanent, machine-readable public statement than body copy — treat it as at least as sensitive as the "Now at" section, and get explicit sign-off before adding it. |
| A founder credit line on the landing page ("Built by Abdullah, Lahore") | Not present | Small-startup credibility booster, but it's Abdullah's own name and public identity — his call whether/how to include it here specifically (the press-facing "founder named" language in `brand-book.md` doesn't automatically extend to every page). |

---

## 3. Page structure recommendations

**Core problem:** one page (the home page) is trying to be both the diner demo and the entire public face of MENVA, with no branch for restaurant owners, and its copy is written for someone standing at a physical table rather than someone who tapped a link.

**Recommended structure:**

```
/                     → Diners. "Try the demo." Rewritten hero (2.1) for link-in-bio visitors,
                        one clear path into the pilot's live menu, one clear link out to
                        "For restaurants."
  ↳ /g (or /:slug)    → The actual pilot menu — unchanged, this is the real product.

/for-restaurants      → social/landing/page.html, published at this path on the main site
                        (or its own subdomain once the custom domain exists — either works,
                        but it needs to be reachable from the main site's nav/footer, which
                        it currently isn't at all).
```

**Diner vs. restaurant split, concretely:**
- Home page (`/`) keeps its diner-first hero and demo, but adds exactly one restaurant-facing line: a small `For restaurants →` link in the header or footer, nothing more. Per `brand-book.md`'s messaging rule ("don't mix these in one piece of copy"), the two audiences should never share a paragraph — a single link that hands off to a page written entirely for owners is the right amount of mixing (none, in the copy itself).
- The landing page (`social/landing/page.html`) stays 100% owner-facing, as it already is — no changes needed to its audience focus, only to reachability (right now nothing links to it) and the polish items in Section 5.

**Link-in-bio behaviour:** see Section 6 — the recommendation is to *not* build a third, separate "links" page. Point the Instagram bio link straight at the home page, and let the home page itself carry the one small "For restaurants" branch link. That keeps the brand's own domain as the only thing in the bio (no Linktree branding, no extra hop) and avoids maintaining a third piece of copy for the same two audiences already served by `/` and `/for-restaurants`.

---

## 4. SEO

### 4.1 Fifteen target keywords (Lahore / Pakistan)

**Honesty check, per `BRIEF.md`'s claims policy:** these are *candidate* keywords based on what MENVA plainly is, not verified search volumes. Nobody on this task has access to Google Keyword Planner, Ahrefs, or any search-volume tool — every "volume" claim below would be invented, so none is given. Before spending money or real effort against these, someone with Keyword Planner (or Google Search Console once the site has traffic) should check actual volume and difficulty. Treat this list as directionally reasonable, not measured.

| # | Keyword | Intent | Best page |
|---|---|---|---|
| 1 | 3D menu Lahore | Diner / curiosity | Home |
| 2 | AR menu Pakistan | Diner / curiosity | Home |
| 3 | digital menu for restaurants Lahore | Restaurant owner | Landing page |
| 4 | QR menu Lahore | Diner + owner (mixed) | Home |
| 5 | QR code menu Pakistan | Diner + owner | Home |
| 6 | AR restaurant menu Lahore | Owner | Landing page |
| 7 | 3D dish menu Pakistan | Diner | Home |
| 8 | augmented reality menu Pakistan | Diner / press | Home |
| 9 | contactless menu Lahore | Owner (older but still-searched framing) | Landing page |
| 10 | restaurant menu technology Lahore | Owner | Landing page |
| 11 | see menu in 3D before ordering | Diner, long-tail | Home |
| 12 | digital menu QR code Pakistan | Owner | Landing page |
| 13 | restaurant AR experience Lahore | Owner / press | Landing page |
| 14 | menu without app Lahore | Diner, long-tail | Home |
| 15 | Lahore restaurant startup | Press / investor | Home or a future press page |

Notes:
- Several of these (QR menu, digital menu, contactless menu) are shared with plain QR-menu vendors who have nothing to do with AR — expect competition from that category too, not just true AR/3D competitors.
- "AR menu Pakistan" and "3D menu Lahore" are the two most literally-true, differentiated terms — they describe exactly what MENVA does and nothing else currently marketed in Pakistan does (per the competitive read already in `brand-book.md` Section 2, investor row).

### 4.2 Title / meta description per page

| Page | Title (aim ≤ 60 chars) | Meta description (aim ≤ 155 chars) |
|---|---|---|
| Home (`/`) | `MENVA — AR dish menus for Lahore restaurants` | `See a real 3D scan of the dish, at true size, on your own table — before you order. Live pilot in Lahore. No app, works in Safari and Chrome.` |
| Pilot menu (`/g` or `/:slug`) | `[Pilot restaurant name] menu — MENVA` *(needs Abdullah — this title states the restaurant's name)* | `The [pilot restaurant] menu in 3D. Tap a dish, see the real plate, place it on your table at true size, then show your waiter.` *(same — needs Abdullah)* |
| For-restaurants landing | `MENVA for restaurants — Lahore` *(current title is already close: "MENVA for restaurants · Lahore" — fine as-is, minor optional tweak)* | Current meta description is already solid: `Let guests see your real dishes in 3D, on their own table at true size, before they order. No app. Lahore pilot: PKR 25,000.` — no change needed. |

### 4.3 OG / Twitter tags

**Home page has none — this is the single highest-priority SEO fix found in this audit.** Recommended set (values, not code, since site files aren't edited here):

```
og:title        MENVA — See it before you order it
og:description  See a real 3D scan of the dish, at true size, on your own table — before you order.
og:image        [an absolute URL to a 1200×630 image — a real dish scan, no AI, per brand rules]
og:url          https://menva-ar.netlify.app/   (update once the custom domain is live)
og:type         website
twitter:card    summary_large_image
twitter:title   (same as og:title)
twitter:description (same as og:description)
twitter:image   (same as og:image)
```

The landing page (`social/landing/page.html`) already has `og:title`, `og:description`, and `og:image` — good — but is missing `og:url`, `og:type`, and all `twitter:*` tags, and its `og:image` value (`img/og.jpg`) is a **relative path**; most platforms resolve this against the page URL correctly, but an absolute URL is the safer, standard practice for link-preview reliability and costs nothing to fix.

### 4.4 JSON-LD — which schema fits, and why

| Schema | Fits? | Reasoning |
|---|---|---|
| **Organization** | Yes — use on the home page. | MENVA is a company/brand, not a place a diner visits. `Organization` (name, url, logo, and `sameAs` links to Instagram/WhatsApp once confirmed) is the correct, low-risk baseline schema — it makes no claims that need proof (no ratings, no reviews, no revenue). |
| **LocalBusiness** | Only for a *restaurant's* page, not for MENVA itself. | MENVA is a tool restaurants use, not a physical venue diners visit — tagging `menva-ar.netlify.app` as a `LocalBusiness` would be inaccurate. It could fit the pilot restaurant's own page (`/g`) once the restaurant's name is cleared for that kind of permanent, structured public statement — see the "needs Abdullah" row in 2.2. |
| **SoftwareApplication** | **Not recommended.** | This schema type expects fields like `aggregateRating`, `offers`, or install counts to be useful/valid to Google — MENVA has none of these, and fabricating them would violate `BRIEF.md`'s "never invent stats" rule outright. MENVA also isn't an installable app (the brand book is explicit: "not an app," never call it one) — using `SoftwareApplication` schema would itself contradict the brand's own core "no app" claim. Skip it. |
| **Menu** (schema.org/Menu, nested under a Restaurant) | Optional, later. | Could describe the pilot's dish list once its name is cleared for structured data, giving Google potential rich-result eligibility for dish names/prices. Not urgent for an MVP with four scans and one pilot. |

**Recommendation:** ship `Organization` on the home page now (safe, no naming issue — MENVA the company, not the restaurant). Hold `LocalBusiness`/`Menu` schema for the pilot page until Abdullah clears structured, permanent use of the restaurant's identity.

### 4.5 Sitemap / robots note

Checked `robots.txt` directly:
```
User-agent: *
Allow: /
```
This correctly allows indexing — nothing is accidentally blocked. But:
- **No `Sitemap:` line**, and **no `sitemap.xml` exists** anywhere in the repo. Recommend adding one listing `/` and `/for-restaurants` at minimum (and the pilot menu URL once its indexing is cleared), plus a `Sitemap:` line in `robots.txt` pointing to it.
- **`/stats` (the private, key-gated analytics dashboard) isn't disallowed.** It requires a key to show real data, so nothing sensitive would actually leak into a search result, but there's no reason to let it be crawled or indexed at all — recommend adding `Disallow: /stats` to `robots.txt` as a clean-up, independent of the key gate.
- **Sequencing:** `BRIEF.md` says a custom domain is "coming" to replace `menva-ar.netlify.app`. Recommend building and submitting the sitemap, and doing any Search Console verification, against the **custom domain**, not the Netlify subdomain — otherwise the indexing work has to be redone once the domain switches (see "Needs Abdullah," domain confirmation is already flagged in `brand-book.md` Section 10 too).

---

## 5. The landing page (`social/landing/page.html`) — review and improvements

Overall: this page is in noticeably better shape than the home page for marketing fundamentals — it already has OG tags, a clear single audience (restaurant owners), a sticky mobile CTA, and FAQ coverage of the objections an owner would actually raise. The improvements below are refinements, not a rebuild.

| Area | Finding | Recommendation |
|---|---|---|
| **Copy** | Hero and "what your staff hears every night" section are strong — concrete, specific pain points ("What does it look like?", "How big is it?"), no hype. No changes needed there. | Keep as-is. |
| **CTA** | Two hero CTAs: "Book a 10-minute demo" (WhatsApp) and "Try it on your table" (links to the general home page). | Point "Try it on your table" at a specific dish inside the live pilot menu rather than the home page, so the owner reaches the real 3D/AR moment in one tap (see 2.1). |
| **CTA copy specificity** | "Book a 10-minute demo" — the "10-minute" claim is a specific, concrete number that isn't sourced anywhere in `BRIEF.md`. | Either confirm this is a real, intended time commitment (fine to keep if true and Abdullah can stand behind it) or soften to "Book a quick demo" if "10 minutes" isn't a guaranteed number. Flagged rather than changed, since it may be an intentional, accurate promise. |
| **FAQ** | Six questions cover the real objections (app requirement, staff/menu replacement, wifi, AR-less phones, AI, pilot inclusions). Good coverage, correctly avoids stating pilot inclusions per `BRIEF.md`. | Consider adding a seventh: **"How long does setup take?"** or **"What do you need from us to start?"** — likely the next question an interested owner asks after the FAQ, and currently unanswered anywhere on the page. Only add if Abdullah can give an honest, unfabricated answer (see Section 7). |
| **Trust — the honest gap** | **There are no testimonials, no client logos, no "trusted by" strip, and no results/numbers anywhere on the page.** This is correct and required — `BRIEF.md`: "never invent... testimonials... or results" — but it does leave the page with only one trust signal (the product demo itself) for a cold, skeptical B2B audience. | Don't fabricate placeholders. Once the pilot at [pilot restaurant] has run long enough to produce real numbers, the strongest, lowest-risk additions (each needs a source and Abdullah's sign-off before publishing, per `BRIEF.md`'s claims policy) are: **(1)** one real, sourced pilot metric ("X table scans in Y weeks at our first Lahore pilot" — with the actual number, not a placeholder), **(2)** a short quote from the restaurant's owner or a waiter about the "show the waiter" flow specifically (a process quote, not a sales-lift quote, since no sales-lift number exists), **(3)** a real screenshot of the `/stats` results page (redacted of anything not cleared for public view). All three are listed again in Section 7 since none can be added without Abdullah. |
| **Trust — near-term, no pilot data needed** | A page with zero visible signals besides the CTA can still build trust honestly right now. | Add a short, plain "who's behind this" line (see the founder-credit row in 2.2) and make sure the four real dish images already on the page (steak sandwich, garlic prawn skewers, steak board — all real scans, no AI, per the image alt text already in the code) are captioned as real scans somewhere visible, reinforcing pillar 1 without needing new data. |
| **Build/placeholder risk** | `social/landing/build.mjs` inserts `{{WA_LINK}}`, `{{IG_LINK}}`, and `{{CONTACT_LINE}}` from command-line flags; without a real WhatsApp number the script itself prints a warning and leaves visible `#fill-in-whatsapp-number` placeholder links in the built page. | Not a copy issue, but worth flagging directly: **do not publish this page until it's rebuilt with Abdullah's real WhatsApp number and Instagram handle** — otherwise every CTA button on the page is a dead link. (Already listed as pending in `brand-book.md` Section 10; repeating it here since it would silently break this specific page.) |

---

## 6. Link-in-bio recommendation

**Recommendation: a single page, not a Linktree-style multi-link hub.**

Reasoning:
- MENVA currently has exactly two audiences and exactly two destinations worth linking to (the diner demo and the restaurant pitch) — not the five-to-ten links a Linktree page is built for.
- A third-party link-hub tool puts another brand's UI and domain between the Instagram bio and MENVA's own site, which works against the calm, first-party, "not a hype-driven startup" voice `brand-book.md` sets out.
- The home page, once it gets the one small addition recommended in Section 3 (a "For restaurants" link), can *be* the link-in-bio destination itself — no separate page to build or maintain.

**Exact link labels recommended (sentence case, no emoji, matching the approved CTA-verb list in `brand-book.md` Section 4):**

| Where | Label | Destination |
|---|---|---|
| Instagram bio | *(the bio link itself — no label needed, Instagram shows the URL)* | Home page (`/`) |
| Home page header or footer | `For restaurants` | `/for-restaurants` (the landing page) |
| Home page footer (once confirmed) | `WhatsApp us` | The real WhatsApp link — needs Abdullah's number |
| Home page footer (once confirmed) | `Instagram` | The real Instagram profile — needs Abdullah's handle |

If a true multi-link page is ever needed later (e.g. once there's a press page, a careers link, multiple pilot restaurants), rebuild it as a first-party page in MENVA's own brand system at that point, rather than adopting Linktree pre-emptively for a two-destination need.

---

## 7. Needs Abdullah

1. **Sign-off on any change to how the pilot restaurant's name/logo is used or shown** — including in SEO titles, meta descriptions, a `LocalBusiness`/`Menu` JSON-LD block, or a sitemap entry for its menu URL (Section 2.2, Section 4.2, Section 4.4). It's already live on the product; treat any *new* or more permanent use (especially structured data) as a fresh decision, not an extension of the existing one.
2. **Confirm who actually captures the 3D scans** (MENVA or the restaurant) before the footer line "3D scans provided by restaurants" is kept, changed, or repeated elsewhere (Section 1.4, Section 2.2).
3. **Confirm the real WhatsApp number and Instagram handle** before publishing or relinking `social/landing/page.html`, and before adding the "WhatsApp us" / "Instagram" footer links recommended in Section 6 — without them, `social/landing/build.mjs` ships visible `#fill-in-whatsapp-number` placeholder links (Section 5, already flagged in `brand-book.md` Section 10).
4. **Confirm the custom domain** (currently `menva-ar.netlify.app`) before investing in sitemap submission, Search Console verification, or backlink-building — this work needs to target the final domain, not the placeholder one (Section 4.5; already flagged in `brand-book.md` Section 10).
5. **Decide whether to be named publicly on the landing page** as a small founder-credit line (Section 2.2) — separate from the general "founder named" press guidance already in `brand-book.md`, since this is a specific, new placement.
6. **Confirm the "Book a 10-minute demo" time claim** on the landing page hero is one Abdullah can actually commit to, or approve softening it (Section 5).
7. **Hold the testimonial/trust-signal additions listed in Section 5** until the pilot has run long enough to produce a real, sourced number or quote — nothing should be added to the landing page's trust section before then, and whatever is added needs Abdullah's sign-off on the exact figure or quote before it's published, per `BRIEF.md`'s claims policy.
8. **Approve publishing the landing page at a reachable URL** (`/for-restaurants` on the main site, or its own address) and adding the "For restaurants" link to the home page — this is the single change with the highest structural impact in this whole audit (Section 3), and it's a publishing decision, which `BRIEF.md` reserves for Abdullah.
