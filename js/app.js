/**
 * MENVA — Main Application
 * Path-routed SPA (History API): /  ·  /g  ·  /g/:table  ·  /:restaurant/:table
 * Menu data comes only from /data/menu.json (built from data/dishes.csv).
 * Native <dialog> for the dish sheet. model-viewer is loaded lazily from /vendor (js/viewer.js).
 * touch-action: pan-y on all model-viewer elements.
 */
(function () {
  'use strict';

  const app = document.getElementById('app');
  const arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h15M13 6l6 6-6 6"/></svg>';
  const closeIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 6 12 12M18 6 6 18"/></svg>';
  const resetIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/></svg>';
  const heartIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2Z"/></svg>';
  // "A dish drops onto a table" — the AR button's mark (animation in css/sheet.css)
  const dropIcon = '<svg class="ar-drop" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 20h19"/><ellipse class="ar-drop-shadow" cx="12" cy="20" rx="6.5" ry="1.2" fill="currentColor" stroke="none"/><g class="ar-drop-dish"><path d="M5 15.5a7 7 0 0 1 14 0Z"/><path d="M3.5 15.5h17"/><path d="M12 7.2V6"/></g></svg>';
  const shareIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/><path d="M4 13h16M8 6V4m8 2V4"/></svg>';
  const arIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10M7 8h10M7 16h6"/></svg>';

  const unsureIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.4 2.4 0 1 1 3.4 2.2c-.7.4-1 .9-1 1.6M12 16.8h.01"/></svg>';
  const downIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v15M6 13l6 6 6-6"/></svg>';
  const tickIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';

  const TABLE_KEY = 'menva.table';
  const DATA_URL = '/data/menu.json';

  let data = null;
  let activeRestaurant = null;
  let currentTable = null;
  let lastTrigger = null;
  let lastWaiterTrigger = null;
  let trayUnsubscribe = null;

  // ─── Formatting ───────────────────────────────────────────────
  const CONFIRM = 'Please confirm with your server';
  const MAX_NOTE = 80; // matches .tray-note[maxlength] and MenvaTray's own clamp
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const formatPrice = (value) => (value == null ? CONFIRM : `PKR ${new Intl.NumberFormat('en-PK').format(value)}`);
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const SPICE = ['Not spicy', 'Mild', 'Medium', 'Hot'];
  const SERVE_LABEL = { hot: 'Hot', iced: 'Iced' };
  const serveTag = (s) => (s && SERVE_LABEL[s] ? `<span class="serve-tag">${SERVE_LABEL[s]}</span>` : '');
  // Theme goes on <html> too (not just <body>) so root-level rules that read it — e.g. the accent
  // scrollbar in css/base.css — pick up the restaurant's own colour instead of MENVA's default.
  const setTheme = (t) => { document.documentElement.dataset.theme = t; document.body.dataset.theme = t; };

  // ─── Data ─────────────────────────────────────────────────────
  async function loadData() {
    if (data) return data;
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error(`menu data ${res.status}`);
    data = await res.json();
    return data;
  }
  const findRestaurantBySlug = (slug) => {
    const s = slug.toLowerCase();
    return data.restaurants.find(r => r.slug === s || r.id === s);
  };

  // ─── Footer ──────────────────────────────────────────────────
  const footer = `<footer><span>menva<span class="wordmark-dot">.</span></span><p>See it before you order it.</p><a class="footer-link" href="/for-restaurants" data-link>For restaurants</a><small>3D scans provided by restaurants</small></footer>`;

  // ─── Header ──────────────────────────────────────────────────
  // No directory to go back to: on a restaurant page the diner stays on that menu. The "For restaurants"
  // pill is on every page (css/home.css: accent outline on MENVA pages, neutral ink outline on a
  // restaurant's own page so it never fights that restaurant's accent).
  function header() {
    const wordmark = `<a class="wordmark" href="/" data-link aria-label="MENVA home">menva<span class="wordmark-dot">.</span></a>`;
    return `<header class="topbar">${wordmark}<nav><a class="topbar-pill" href="/for-restaurants" data-link>For restaurants</a><div class="theme-toggle-wrap"><button data-mode-toggle aria-label="Switch theme"><span class="toggle-icon"><svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg><svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 14A8.5 8.5 0 0 1 10 3.5 8.5 8.5 0 1 0 20.5 14Z"/></svg></span></button></div></nav></header>`;
  }

  // ─── Cheffy cameo (only when the restaurant config enables it) ─
  function cheffy(pose, text) {
    return `<div class="cheffy-cameo"><img src="/assets/cheffy/${pose}.webp" alt="Cheffy" width="42" height="52"><p><span>Cheffy</span>${text}</p></div>`;
  }

  // ─── Home hero: scan → appears → on your table (css/hero.css) ──
  // A hand holds a phone to the table QR, the dish opens on the screen, then lifts out and sits on the
  // real table at true size. Inline SVG + CSS only (transform/opacity), one 9 s loop. The markup IS the
  // key frame (dish on the table beside the phone), so it paints at once and reduced motion keeps it;
  // the loop then starts part-way through (negative delay in css/hero.css) and never hides the first paint.
  // A seeded 21×21 QR-like pattern, drawn once: three finder squares plus a fixed scatter of modules.
  function qrPattern() {
    const N = 21, on = Array.from({ length: N }, () => Array(N).fill(false));
    const finder = (x, y) => { for (let j = 0; j < 7; j++) for (let i = 0; i < 7; i++) on[y + j][x + i] = i === 0 || j === 0 || i === 6 || j === 6 || (i > 1 && i < 5 && j > 1 && j < 5); };
    finder(0, 0); finder(14, 0); finder(0, 14);
    let s = 7;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const inFinder = (x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12);
      s = (s * 48271) % 2147483647;
      if (!inFinder) on[y][x] = s % 100 < 47;
    }
    let d = '';
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (!on[y][x]) continue;
      let n = 1; while (x + n < N && on[y][x + n]) n++;
      d += `M${x} ${y}h${n}v1h-${n}z`; x += n - 1;
    }
    return d;
  }

  function arDemo(dish, menuNames = []) { // menuNames: unused since the scene no longer shows a words-only menu
    const FALLBACK = '/assets/dishes/steak-main/card.webp';
    const card = dish?.assets?.card;
    const src = card || dish?.assets?.poster || FALLBACK;
    const [w, h] = card || !dish?.assets?.poster ? [944, 569] : [1200, 900];
    const name = dish?.name || 'The dish';
    const cm = dish?.dimensions_cm?.width ? Math.round(dish.dimensions_cm.width) : null;
    const size = cm ? `${cm} cm · true size` : 'True size';
    const img = (cls, extra) => `<img class="${cls}${card ? '' : ' ar-photo'}" src="${esc(src)}" alt="" width="${w}" height="${h}" decoding="async" ${extra}>`;
    const ink = 'fill="none" stroke="var(--ar-ink)" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"';
    const skin = `fill="var(--ar-skin)" stroke="var(--ar-ink)" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"`;
    const corners = (x0, y0, x1, y1, L) => `M${x0} ${y0 + L}V${y0}H${x0 + L}M${x1 - L} ${y0}H${x1}V${y0 + L}M${x1} ${y1 - L}V${y1}H${x1 - L}M${x0 + L} ${y1}H${x0}V${y1 - L}`;
    return `<figure class="ar-demo" role="img" aria-label="A hand holds a phone to the QR on a restaurant table. The ${esc(name)} opens on the screen, then lifts out and sits on the real table at its true size.">
      <div class="ar-scene" aria-hidden="true">
        <svg class="ar-defs" width="0" height="0" focusable="false"><defs><symbol id="ar-qr" viewBox="0 0 21 21"><path d="${qrPattern()}" fill="currentColor" shape-rendering="crispEdges"/></symbol></defs></svg>
        <div class="ar-room"></div>
        <div class="ar-cloth"></div>
        <div class="ar-card">
          <svg viewBox="0 0 100 128" focusable="false">
            <ellipse cx="50" cy="124" rx="44" ry="4.5" fill="rgba(30,18,8,.28)"/>
            <rect x="5" y="3" width="90" height="116" rx="6" fill="#F6F0E4" stroke="#CBBFA8" stroke-width="1.2"/>
            <rect x="5" y="112" width="90" height="7" rx="3" fill="#E6DAC4"/>
            <svg x="19" y="14" width="62" height="62" viewBox="0 0 21 21" color="#1A1714"><use href="#ar-qr"/></svg>
            <text x="50" y="94" text-anchor="middle" font-size="12" font-weight="600" fill="#1A1714" letter-spacing="-.2">Table 12</text>
            <text x="50" y="105" text-anchor="middle" font-size="5.6" fill="#5C5349">Scan to see the menu</text>
          </svg>
          <div class="ar-scan"><svg viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false"><path d="${corners(2, 2, 98, 98, 20)}" fill="none" stroke="#B5371F" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg><i class="ar-scan-line"></i><span class="ar-scan-tick">${tickIcon}</span></div>
        </div>
        <div class="ar-shadow"></div><div class="ar-ring"></div>
        <div class="ar-hand">
          <svg class="ar-hand-back" viewBox="0 0 200 420" focusable="false">
            <path d="M50 250C44 276 52 300 66 320C76 334 80 350 86 372L94 420H172C166 392 160 372 158 350C156 330 160 310 160 290V250Z" ${skin}/>
            <path d="M158 126C178 128 188 158 188 190C188 232 184 262 166 290L158 292Z" ${skin}/>
            <rect x="38" y="8" width="126" height="262" rx="24" fill="#1B1612" stroke="var(--ar-ink)" stroke-width="2.2"/>
            <path d="M36 62v26M36 98v26" ${ink} stroke-width="3"/>
          </svg>
          <div class="ar-screen">
            <div class="ar-cam"><div class="ar-cam-qr"><svg viewBox="0 0 21 21" color="#1A1714" focusable="false"><use href="#ar-qr"/></svg></div><svg class="ar-cam-frame" viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false"><path d="${corners(6, 6, 94, 94, 16)}" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg></div>
            <div class="ar-page">
              <span class="ar-island"></span>
              <p class="ar-page-name">${esc(name)}</p>
              <div class="ar-tile"><span class="ar-tile-ico">${arIcon}</span>${img('ar-dish-s', 'fetchpriority="low"')}</div>
              <span class="ar-pill ar-pill-see">See it on your table</span>
              <span class="ar-pill ar-pill-on">${tickIcon}On your table</span>
            </div>
          </div>
          <svg class="ar-hand-front" viewBox="0 0 200 420" focusable="false">
            <path d="M50 322C32 298 24 262 30 238C33 224 48 220 55 232C63 248 56 276 72 304C66 318 58 326 50 322Z" ${skin}/>
            <path d="M36 239C38 233 46 232 50 237" ${ink} stroke-width="1.6"/>
            <rect x="146" y="128" width="44" height="24" rx="12" ${skin}/>
            <rect x="148" y="153" width="42" height="24" rx="12" ${skin}/>
            <rect x="152" y="178" width="38" height="24" rx="12" ${skin}/>
            <rect x="158" y="203" width="32" height="23" rx="11.5" ${skin}/>
          </svg>
        </div>
        ${img('ar-dish', 'fetchpriority="high"')}
        <svg class="ar-brackets" viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false"><path d="${corners(3, 3, 97, 97, 11)}" fill="none" stroke="rgba(20,12,6,.38)" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/><path d="${corners(3, 3, 97, 97, 11)}" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>
        <div class="ar-measure"><span class="ar-tick"></span><span class="ar-tick"></span><span class="ar-rule"></span></div>
        <span class="ar-label">${esc(size)}</span>
        <div class="ar-chips">
          <span class="ar-chip ar-chip-scan"><i class="ar-dot"></i>Scanning table 12</span>
          <span class="ar-chip ar-chip-open">${arIcon}Opens on your phone</span>
          <span class="ar-chip ar-chip-placed">${tickIcon}Placed on your table</span>
          <span class="ar-chip ar-chip-waiter">${tickIcon}Show the waiter</span>
        </div>
      </div>
    </figure>`;
  }

  // "How it helps you decide": three beats in step with the phone's 9 s loop (css/hero.css).
  function decideBeats() {
    const beat = (n, icon, title, text) => `<li class="beat beat-${n}"><span class="beat-icon" aria-hidden="true">${icon}</span><span class="beat-text"><strong>${title}</strong><span>${text}</span></span><span class="beat-bar" aria-hidden="true"></span></li>`;
    return `<ol class="decide-beats" aria-label="How MENVA helps you decide">
      ${beat(1, unsureIcon, 'Unsure what to order?', 'A menu of words only.')}
      ${beat(2, arIcon, 'See it life-size on your table', 'Scan the QR and place the real dish, at true size.')}
      ${beat(3, tickIcon, 'Order with confidence', 'Show the waiter what you picked.')}
    </ol>`;
  }

  // One class on the whole hero pauses the scene and the three beats together, so they stay in step:
  // while the hero is scrolled out of view, or while the tab is hidden.
  let stopDemoWatch = null;
  function pauseDemoOffscreen() {
    stopDemoWatch?.();
    stopDemoWatch = null;
    const hero = app.querySelector('.home-hero');
    if (!hero) return;
    let inView = true;
    const apply = () => hero.classList.toggle('is-offscreen', !inView || document.hidden);
    const io = 'IntersectionObserver' in window ? new IntersectionObserver(([e]) => { inView = e.isIntersecting; apply(); }) : null;
    io?.observe(hero);
    document.addEventListener('visibilitychange', apply);
    stopDemoWatch = () => { io?.disconnect(); document.removeEventListener('visibilitychange', apply); };
    apply();
  }

  // ─── Motion: scroll reveal ──────────────────────────────────────
  // Section/card arrival: fade + rise, staggered, once per element. Content is visible even if this
  // never runs (the opacity:0 start only applies under html.js-motion). Reduced motion: skip entirely.
  const REVEAL_SELECTOR = '.dish-card, .dish-row, .menu-heading, .decide-beats, .home-menus-head, .menu-card, .share-band';
  function initMotion(root) {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.documentElement.classList.toggle('js-motion', !reduced);
    if (reduced) return;

    const targets = [...root.querySelectorAll(REVEAL_SELECTOR)];
    if (!targets.length) return;

    // Stagger within each parent group, capped at 6 steps.
    const counts = new Map();
    targets.forEach(el => {
      const n = counts.get(el.parentElement) || 0;
      el.style.setProperty('--i', Math.min(n, 6));
      counts.set(el.parentElement, n + 1);
    });

    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.15 });

    const vh = window.innerHeight || document.documentElement.clientHeight;
    targets.forEach(el => {
      const rect = el.getBoundingClientRect();
      // Already on screen at render time: reveal at once, no need to wait on a scroll trip.
      if (rect.top < vh && rect.bottom > 0) el.classList.add('is-in');
      else io.observe(el);
    });

    // "See it on your table" shimmer runs only while its card is actually in view.
    const marks = root.querySelectorAll('.see-mark');
    if (marks.length) {
      const io2 = new IntersectionObserver((entries) => {
        entries.forEach(entry => entry.target.classList.toggle('in-view', entry.isIntersecting));
      }, { threshold: 0.4 });
      marks.forEach(el => io2.observe(el));
    }
  }

  // ─── Motion: card tilt toward the cursor (fine pointer + hover only) ───
  function initTilt(root) {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    root.querySelectorAll('.dish-card .dish-photo, .menu-card-dishes .menu-card-photo').forEach(el => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty('--tilt-y', `${(px * 8).toFixed(2)}deg`);
        el.style.setProperty('--tilt-x', `${(py * -8).toFixed(2)}deg`);
      });
      el.addEventListener('pointerleave', () => {
        el.style.setProperty('--tilt-x', '0deg');
        el.style.setProperty('--tilt-y', '0deg');
      });
    });
  }

  // One restaurant card for the home page's "Explore the menus" section. The same design for every
  // restaurant (logo, a line in their own words, area · city, up to 3 dish photos, "Explore menu");
  // the card carries that restaurant's own `data-theme`, so its tokens (surface, ink, accent) tint it.
  // The whole card is one tap target: the "Explore menu" link stretches over it (css/home.css), and
  // each dish photo sits above that and opens that dish (/<slug>?dish=<id>).
  // Three logo shapes: a round mark (Baraza) gets its name beside it; a wide lockup or wordmark
  // (Gauchos, Haute Dolci) carries the name itself and is inverted to light in dark mode.
  const LOGO_SIZE = { 'haute-dolci': [700, 43] };
  function menuCard(r) {
    const slug = esc(r.slug);
    const name = esc(r.name || r.displayName);
    const theme = esc(r.theme || 'default');
    const dishes = (r.dishes || []).filter(d => d.has3d).slice(0, 3);
    let brand;
    if (r.logoRound) {
      brand = `<img class="menu-card-logo menu-card-logo--round" src="${esc(r.logoRound)}" alt="" width="56" height="56"><span class="menu-card-name">${name}</span>`;
    } else if (r.logo) {
      const [w, h] = LOGO_SIZE[r.id] || [240, 100];
      brand = `<img class="menu-card-logo menu-card-logo--wide menu-card-logo--${esc(r.id)}" src="${esc(r.logo)}" alt="${name}" width="${w}" height="${h}">`;
    } else {
      brand = `<span class="menu-card-name">${name}</span>`;
    }
    const where = [r.area, r.location].filter(Boolean).map(esc).join(' · ') || 'Lahore';
    return `<article class="menu-card" data-theme="${theme}">
      <div class="menu-card-brand">
        <h3 class="menu-card-title">${brand}</h3>
        ${r.tagline ? `<p class="menu-card-quote">${esc(r.tagline)}</p>` : ''}
        <p class="menu-card-where">${where}</p>
      </div>
      ${dishes.length ? `<ul class="menu-card-dishes" aria-label="Dishes you can see in AR at ${name}">${dishes.map(d => `
        <li><a href="/${slug}?dish=${esc(d.id)}" data-link>
          <span class="menu-card-photo" style="background-image:url('${d.assets.blur}')"><img src="${esc(d.assets.poster)}" alt="" width="1200" height="900" loading="lazy" decoding="async"></span>
          <span class="menu-card-dish">${esc(d.name)}</span>
        </a></li>`).join('')}
      </ul>` : ''}
      <a class="menu-card-more" href="/${slug}" data-link>Explore menu ${arrow}<span class="sr-only"> at ${name}</span></a>
    </article>`;
  }

  // "Then show it off.": a small, static Table Card (the shareable image a diner makes from a dish).
  // js/sharecard.js draws the real one only when a diner taps "Share" on a dish and exposes no render
  // function, so this is a CSS-built miniature in Haute Dolci's own look: its real headline line, its
  // real cut-out of the dish, its own tokens. Nothing is fetched until the band scrolls near.
  function shareBand(r, dish) {
    if (!r || !dish) return '';
    const line = (r.shareLines?.firstLook || [])[0];
    const img = dish.assets?.card || dish.assets?.poster;
    if (!img || !line) return '';
    const lines = String(line).split('|').map(s => s.trim()).filter(Boolean);
    const logo = r.logo ? `<img class="tc-logo" src="${esc(r.logo)}" alt="" width="700" height="43">` : '';
    return `<section class="share-band" aria-labelledby="share-heading">
      <div class="tc" data-theme="${esc(r.theme || 'default')}" role="img" aria-label="Example Table Card: ${esc(dish.name)} at ${esc(r.name)}">
        <div class="tc-top">${logo}<span class="tc-pill">Live 3D · First look</span></div>
        <p class="tc-line">${lines.map((l, i) => i === lines.length - 1 ? `<em>${esc(l)}</em>` : `${esc(l)}<br>`).join('')}</p>
        <img class="tc-dish" src="${esc(img)}" alt="" width="1200" height="900" loading="lazy" decoding="async">
        <p class="tc-name">${esc(dish.name)}</p>
        <p class="tc-stub"><span>Table 12</span><span>${esc(r.area ? r.area.split(',')[0] : r.location || 'Lahore')}</span></p>
      </div>
      <div class="share-copy">
        <p class="overline">Table Card</p>
        <h2 id="share-heading">Then show it off.</h2>
        <p>Make a Table Card of your dish, in the restaurant's own look, and share it.</p>
      </div>
    </section>`;
  }

  // ─── Brand page (/) — customers only: no 3D, no owner pitch (that lives at /for-restaurants) ─
  function brandPage() {
    document.title = 'See restaurant dishes on your table in AR — Lahore | MENVA';
    setTheme('default');

    // Restaurants listed on the home page, in data order (scripts/build-data.mjs sorts by `homeOrder`).
    // If the menu data hasn't loaded, fall back to a single Gauchos card so the diner can still reach /g.
    const listed = (data?.restaurants || []).filter(r => r.listed);
    const cards = listed.length
      ? listed.map(menuCard).join('')
      : menuCard({ slug: 'g', id: 'gauchos', name: 'Gauchos', theme: 'gauchos', logo: '/assets/restaurant/gauchos-logo.svg', area: 'Gulberg III', location: 'Lahore' });

    // The hero dish is Haute Dolci's San Sebastián cheesecake; the phone's first beat lists that
    // restaurant's own dish names. Without it (data down) arDemo falls back to its default dish.
    const heroDish = (data?.restaurants || []).flatMap(r => r.dishes).find(d => d.id === 'hd-san-sebastian' && d.has3d);
    const heroRestaurant = heroDish && data.restaurants.find(r => r.id === heroDish.restaurant);
    const menuNames = (heroRestaurant?.dishes || []).slice(0, 4).map(d => d.name);

    app.innerHTML = header() + `<main class="home">
      <section class="home-hero">
        <div class="hero-copy">
          <p class="overline">Don't order blind.</p>
          <h1>See it on your table. Then <em>decide.</em></h1>
          <p>Scan the QR at your table. The real dish appears at true size, before you order.</p>
          <a class="product-action" href="#menus" data-scroll>Explore menus ${downIcon}</a>
          <p class="hero-trust">No app. Works in Safari and Chrome.</p>
        </div>
        <div class="hero-stage">${arDemo(heroDish, menuNames)}</div>
        ${decideBeats()}
      </section>

      <section class="home-menus" id="menus" aria-labelledby="menus-heading">
        <div class="home-menus-head">
          <p class="overline">Restaurants in Lahore</p>
          <h2 id="menus-heading" tabindex="-1">Explore the menus</h2>
        </div>
        <div class="menu-grid">${cards}</div>
      </section>
      ${shareBand(heroRestaurant, heroDish)}
    </main>` + footer;

    // "Explore menus" scrolls to the restaurants (no hash change: popstate would re-render the page).
    app.querySelector('[data-scroll]')?.addEventListener('click', (e) => {
      e.preventDefault();
      const target = app.querySelector('#menus');
      target?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      target?.querySelector('h2')?.focus({ preventScroll: true });
    });
    pauseDemoOffscreen();
    initMotion(app);
    initTilt(app);
  }

  // ─── Restaurant Page ──────────────────────────────────────────
  // Menu cards: "it's an object, not a photo". Each 3D dish photo turns a couple of degrees as it first
  // scrolls into view (once; transform only, see css/sheet.css). Reduced motion: nothing moves.
  function initPhotoTurn(root) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-turned');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.4 });
    root.querySelectorAll('.dish-card .dish-photo').forEach((el) => io.observe(el));
  }

  function restaurantPage(r, table) {
    activeRestaurant = r;
    currentTable = table;
    document.title = `${r.name} — MENVA`;
    setTheme(r.theme || 'default');

    // Categories in CSV order. Dishes with 3D get a poster card; others a clean text row.
    const catId = (cat, i) => `cat-${i}-${cat.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x'}`;
    const menuHTML = r.categories.map((cat, i) => {
      const dishes = r.dishes.filter(d => d.category === cat).map(d => {
        const line = `<div class="dish-line"><h4>${esc(d.name)}${serveTag(d.serve)}</h4>${d.price_pkr == null ? '<span class="price-ask">Ask for price</span>' : `<span>${esc(formatPrice(d.price_pkr))}</span>`}</div>`; // the sheet gives the full "please confirm" line
        const desc = d.description ? `<p>${esc(d.description)}</p>` : '';
        if (d.has3d) {
          return `<button class="dish-card" data-preview="true" data-dish="${esc(d.id)}" aria-label="${esc(d.name)} — see it on your table">
            <div class="dish-photo" style="background-image:url('${d.assets.blur}')">
              <img src="${esc(d.assets.poster)}" alt="" width="1200" height="900" loading="lazy" decoding="async">
              <span class="ar-tag" aria-hidden="true">AR</span>
              <span class="see-mark">${arIcon} See it on your table</span>
            </div>
            ${line}${desc}
          </button>`;
        }
        return `<button class="dish-row" data-preview="false" data-dish="${esc(d.id)}" aria-label="${esc(d.name)}">${line}${desc}</button>`;
      }).join('');
      const note = r.categoryNotes?.[cat] ? `<p class="category-note">${esc(r.categoryNotes[cat])}</p>` : '';
      return `<section class="menu-category" id="${catId(cat, i)}"><h3>${esc(cat)}</h3>${note}<div class="dish-grid">${dishes}</div></section>`;
    }).join('');
    const catNav = r.categories.length > 1 ? `<nav class="cat-nav" aria-label="Menu categories"><div class="cat-nav-scroll"><div class="cat-nav-indicator" aria-hidden="true"></div>${r.categories.map((cat, i) => `<a href="#${catId(cat, i)}" class="cat-link">${esc(cat)}</a>`).join('')}</div></nav>` : '';

    // One identity block, the same for every restaurant: a full-width brand band holding the
    // restaurant's own logo (the page's h1), its own tagline and quiet pills (hours / area / table —
    // only the ones the restaurant has given us). Each brand supplies its own tokens, logo and display
    // font (css/tokens.css, css/sheet.css); the structure never changes.
    const themeClass = `theme-${esc(r.theme || 'default')}`;
    const name = esc(r.displayName || r.name);
    const subtitle = r.showCheffy ? cheffy('wave', esc(r.menuSubtitle)) : `<span>${esc(r.menuSubtitle || '')}</span>`;
    const bandLogo = r.logoRound ? `<img src="${esc(r.logoRound)}" alt="${name}" class="band-logo" width="88" height="88">`
      : r.logo ? `<img src="${esc(r.logo)}" alt="${name}" class="band-logo-wide" width="220" height="27">`
      : `<span class="band-name">${name}</span>`;
    const bandHTML = `<section class="restaurant-band ${themeClass}">
      <div class="band-inner">
        <h1 class="band-heading">${bandLogo}</h1>
        <div class="band-copy">
          ${r.tagline ? `<p class="band-tagline">${esc(r.tagline)}</p>` : ''}
          <div class="band-pills">
            ${r.hours ? `<span class="pill">${esc(r.hours)}</span>` : ''}
            ${r.area ? `<span class="pill">${esc(r.area)}</span>` : ''}
            ${table ? `<span class="table-chip">Table ${esc(table)}</span>` : ''}
          </div>
        </div>
      </div>
    </section>`;

    app.innerHTML = header() + bandHTML + `<main class="restaurant-page ${themeClass}">
      <div class="loyalty-slot" data-loyalty></div>
      ${r.description ? `<p class="menu-intro">${esc(r.description)}</p>` : ''}
      ${catNav}
      <section class="menu-section">
        <div class="menu-heading"><h2>${esc(r.menuTitle || 'Menu')}</h2>${subtitle}</div>
        ${menuHTML}
      </section>
      <p class="menu-disclaimer">3D views are scans of the actual dishes served at ${esc(r.name)}. Allergen, halal and nutrition details come from the restaurant — where it says "${CONFIRM}", please ask before ordering.</p>
    </main>` + footer + `<dialog id="dish-dialog" aria-labelledby="dish-title"><div class="sheet-handle" aria-hidden="true"></div><button class="close-dialog" aria-label="Close">${closeIcon}</button><div id="dish-content"></div></dialog>` +
      `<button type="button" class="tray-pill" id="tray-pill" hidden></button>` +
      `<dialog id="waiter-dialog" class="waiter-dialog" aria-labelledby="waiter-title"><div class="waiter-content"></div></dialog>`;

    app.querySelectorAll('[data-dish]').forEach(btn => {
      btn.addEventListener('click', () => openDish(r.dishes.find(d => d.id === btn.dataset.dish), btn));
    });

    // Highlight the category currently in view in the sticky nav; the active fill slides to it.
    const navLinks = app.querySelectorAll('.cat-link');
    if (navLinks.length) {
      const indicator = app.querySelector('.cat-nav-indicator');
      const moveIndicator = (link) => {
        if (!indicator || !link) return;
        indicator.style.setProperty('--indicator-x', `${link.offsetLeft}px`);
        indicator.style.setProperty('--indicator-w', `${link.offsetWidth}px`);
      };
      const setActive = (link) => {
        navLinks.forEach(a => a.classList.remove('active'));
        link.classList.add('active');
        moveIndicator(link);
      };
      setActive(navLinks[0]);
      window.addEventListener('resize', () => moveIndicator(app.querySelector('.cat-link.active')));

      const byId = new Map();
      navLinks.forEach(a => byId.set(a.getAttribute('href').slice(1), a));
      const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const link = byId.get(entry.target.id);
          if (!link) return;
          if (entry.isIntersecting) {
            setActive(link);
            link.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'instant' });
          }
        });
      }, { rootMargin: '-40% 0px -55% 0px' });
      app.querySelectorAll('.menu-category').forEach(sec => io.observe(sec));
    }

    initMotion(app);
    initTilt(app);
    initPhotoTurn(app);

    const dialog = app.querySelector('dialog');
    dialog.querySelector('.close-dialog').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', e => {
      if (e.target === dialog) dialog.close();
    });
    dialog.addEventListener('close', () => {
      document.body.classList.remove('modal-open');
      app.querySelector('#dish-content').innerHTML = '';
      lastTrigger?.focus();
    });

    initTray(r, table);
  }

  // ─── Tray pill + "Show the waiter" (CLAUDE.md Phase 7) ──────────
  // The pill is hidden by CSS while the dish sheet is open (#dish-dialog[open] ~ #tray-pill), and
  // by JS whenever the table has nothing on it.
  function initTray(r, table) {
    const pill = app.querySelector('#tray-pill');
    const waiterDialog = app.querySelector('#waiter-dialog');
    const content = waiterDialog.querySelector('.waiter-content');
    const dishById = new Map(r.dishes.map((d) => [d.id, d]));
    let clearArmed = false;
    let clearTimer = 0;
    let lo = null; // the loyalty card / gift pass at the bottom of the screen (js/loyalty.js)

    function renderPill() {
      const n = MenvaTray.count(r.id, table);
      pill.hidden = n === 0;
      if (n > 0) pill.textContent = `Show the waiter · ${n}`;
    }

    // Small restaurant mark at the top. The screen is always dark, so wide logos are drawn in white.
    function waiterBrand() {
      const name = esc(r.displayName || r.name);
      if (r.logoRound) return `<img class="waiter-brand-mark" src="${esc(r.logoRound)}" alt="" width="32" height="32"><span class="waiter-brand-name">${name}</span>`;
      if (r.logo) return `<img class="waiter-brand-logo" src="${esc(r.logo)}" alt="${name}" height="26">`;
      return `<span class="waiter-brand-name">${name}</span>`;
    }

    // The screen is built once per opening; after that only the parts that changed are touched, so a
    // quantity tap never re-lays-out the list and the focused button keeps its focus.
    function buildWaiter() {
      content.innerHTML = `
        <div class="waiter-top">
          <div class="waiter-brand">${waiterBrand()}</div>
          <button type="button" class="waiter-done">Done</button>
        </div>
        <h2 id="waiter-title"${table ? '' : ' class="is-order"'}>${table ? `Table ${esc(table)}` : 'Your order'}</h2>
        <div class="waiter-main">
          <ul class="waiter-list"></ul>
          <p class="waiter-empty" hidden>Nothing on the table yet.</p>
        </div>
        <p class="waiter-hint">Turn your screen toward your server.</p>
        <div class="waiter-loyalty"></div>
        <button type="button" class="waiter-clear" hidden>Clear the list</button>
        <p class="sr-only" id="waiter-status" role="status"></p>
      `;
      lo = window.MenvaLoyalty ? MenvaLoyalty.waiter(content.querySelector('.waiter-loyalty'), { restaurant: r, table }) : null;
    }

    function createItem(id, dish) {
      const name = esc(dish.name);
      const li = document.createElement('li');
      li.className = 'waiter-item';
      li.dataset.item = id;
      li.innerHTML = `
        <div class="waiter-item-row">
          <span class="waiter-item-qty"></span>
          <span class="waiter-item-name">${name}</span>
        </div>
        <p class="waiter-item-note" hidden></p>
        <div class="waiter-item-edit">
          <button type="button" class="waiter-edit-btn waiter-edit-minus" aria-label="Fewer ${name}">−</button>
          <button type="button" class="waiter-edit-btn waiter-edit-plus" aria-label="More ${name}">+</button>
          <button type="button" class="waiter-edit-btn waiter-edit-remove" aria-label="Remove ${name}">Remove</button>
          ${dish.price_pkr != null ? `<span class="waiter-item-price">${esc(formatPrice(dish.price_pkr))}</span>` : ''}
        </div>`;
      return li;
    }

    function updateItem(li, it) {
      const qtyEl = li.querySelector('.waiter-item-qty');
      const qtyText = `${it.qty} ×`;
      if (qtyEl.textContent !== qtyText) {
        const first = qtyEl.textContent === '';
        qtyEl.textContent = qtyText;
        if (!first) { qtyEl.classList.remove('is-bump'); void qtyEl.offsetWidth; qtyEl.classList.add('is-bump'); } // a 160 ms transform nudge
      }
      const noteEl = li.querySelector('.waiter-item-note');
      const note = it.note || '';
      if (noteEl.textContent !== note) noteEl.textContent = note; // text, never markup
      noteEl.hidden = !note;
    }

    function syncWaiter() {
      const list = content.querySelector('.waiter-list');
      if (!list) return;
      const items = MenvaTray.get(r.id, table).filter((it) => dishById.has(it.id));
      const existing = new Map([...list.children].map((li) => [li.dataset.item, li]));
      const focusedIndex = list.contains(document.activeElement) ? [...list.children].indexOf(document.activeElement.closest('.waiter-item')) : -1;

      items.forEach((it, i) => {
        let li = existing.get(it.id);
        if (li) existing.delete(it.id); else li = createItem(it.id, dishById.get(it.id));
        updateItem(li, it);
        if (list.children[i] !== li) list.insertBefore(li, list.children[i] || null); // only moves what must move
      });
      existing.forEach((li) => li.remove());

      // The row the guest was on is gone: keep focus in the list instead of dropping it to the page.
      if (focusedIndex >= 0 && !list.contains(document.activeElement)) {
        const next = list.children[Math.min(focusedIndex, list.children.length - 1)];
        (next?.querySelector('.waiter-edit-plus') || content.querySelector('.waiter-done')).focus();
      }

      content.querySelector('.waiter-empty').hidden = items.length > 0;
      const clearBtn = content.querySelector('.waiter-clear');
      clearBtn.hidden = items.length === 0;
      if (!items.length) { clearArmed = false; clearTimeout(clearTimer); clearBtn.textContent = 'Clear the list'; }
    }

    const say = (text) => { const el = content.querySelector('#waiter-status'); if (el) el.textContent = text; };

    content.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      if (btn.classList.contains('waiter-done')) return waiterDialog.close();
      if (btn.classList.contains('waiter-clear')) {
        if (!clearArmed) {
          clearArmed = true;
          btn.textContent = 'Tap again to clear';
          clearTimer = setTimeout(() => { clearArmed = false; if (btn.isConnected) btn.textContent = 'Clear the list'; }, 3000);
          return;
        }
        clearTimeout(clearTimer);
        clearArmed = false;
        MenvaTray.clear(r.id, table);
        return waiterDialog.close();
      }
      const li = btn.closest('.waiter-item');
      if (!li) return; // the loyalty pass has its own controls (js/loyalty.js)
      const id = li.dataset.item;
      const item = MenvaTray.get(r.id, table).find((x) => x.id === id);
      if (!item) return;
      const name = dishById.get(id)?.name || '';
      if (btn.classList.contains('waiter-edit-plus')) {
        MenvaTray.setQty(r.id, table, id, item.qty + 1);
        say(`${name}: ${Math.min(20, item.qty + 1)}`);
      } else if (btn.classList.contains('waiter-edit-minus')) {
        if (item.qty <= 1) { MenvaTray.remove(r.id, table, id); say(`${name} removed`); }
        else { MenvaTray.setQty(r.id, table, id, item.qty - 1); say(`${name}: ${item.qty - 1}`); }
      } else if (btn.classList.contains('waiter-edit-remove')) {
        MenvaTray.remove(r.id, table, id);
        say(`${name} removed`);
      }
    });

    function openWaiter(trigger) {
      lastWaiterTrigger = trigger;
      MenvaTrack('waiter_view');
      buildWaiter();
      syncWaiter();
      // A visit is stamped when the guest came through a table QR and shows a real list (once a day).
      lo?.visit(MenvaTray.get(r.id, table).filter((it) => dishById.has(it.id)).length);
      document.body.classList.add('modal-open');
      waiterDialog.showModal();
    }

    pill.addEventListener('click', () => openWaiter(pill));
    waiterDialog.addEventListener('close', () => {
      document.body.classList.remove('modal-open');
      content.innerHTML = '';
      lo = null;
      clearArmed = false;
      clearTimeout(clearTimer);
      const back = lastWaiterTrigger?.isConnected ? lastWaiterTrigger : (app.querySelector('[data-loyalty-claim]') || pill);
      back.focus();
    });

    trayUnsubscribe?.();
    trayUnsubscribe = MenvaTray.onChange(() => {
      renderPill();
      if (waiterDialog.open) syncWaiter();
    });
    renderPill();

    // The quiet stamp card under the banner. On the gift visit it offers a way to the pass even
    // when the list is empty.
    window.MenvaLoyalty?.mountPage(app.querySelector('[data-loyalty]'), r, { onClaim: (btn) => openWaiter(btn) });
  }

  // ─── Dish facts (order fixed by CLAUDE.md, Phase 3) ────────────
  // halal → allergens → spice → dietary → ingredients → nutrition. Anything unknown says CONFIRM.
  function fact(label, value) {
    const unknown = value == null;
    return `<div class="fact${unknown ? ' fact-unconfirmed' : ''}"><dt>${label}</dt><dd>${unknown ? CONFIRM : value}</dd></div>`;
  }

  function dishFacts(d) {
    const halal = d.halal === 'yes' ? 'Halal' : d.halal === 'no' ? 'Not halal' : null;
    const allergens = d.allergens == null ? null : d.allergens.length ? d.allergens.map(a => esc(cap(a))).join(', ') : 'None of the 11 common allergens';
    const spice = d.spice_level == null ? null : `<span class="spice" aria-hidden="true">${'●'.repeat(d.spice_level)}${'○'.repeat(3 - d.spice_level)}</span> ${SPICE[d.spice_level]}`;
    const dietary = d.dietary == null ? null : d.dietary.length ? d.dietary.map(x => esc(cap(x))).join(', ') : 'No dietary labels';
    const ingredients = d.ingredients == null ? null : d.ingredients.map(esc).join(', ');

    const n = d.nutrition;
    const num = (v, unit) => (v == null ? '—' : `${v}${unit}`);
    const nutrition = n
      ? `<div class="nutrition-grid">
          <div class="nutrition-item"><div class="value">${num(n.calories, '')}</div><div class="label">kcal</div></div>
          <div class="nutrition-item"><div class="value">${num(n.protein_g, 'g')}</div><div class="label">Protein</div></div>
          <div class="nutrition-item"><div class="value">${num(n.fat_g, 'g')}</div><div class="label">Fat</div></div>
          <div class="nutrition-item"><div class="value">${num(n.carbs_g, 'g')}</div><div class="label">Carbs</div></div>
        </div>${n.serving_g != null ? `<p class="fact-note">Per serving of ${n.serving_g} g</p>` : ''}`
      : `<p class="fact-unconfirmed">${CONFIRM}</p>`;

    return `<dl class="facts">
        ${fact('Halal', halal)}
        ${fact('Allergens', allergens)}
        ${fact('Spice', spice)}
        ${fact('Dietary', dietary)}
        ${fact('Ingredients', ingredients)}
      </dl>
      <details class="nutrition"><summary>Nutrition</summary>${nutrition}</details>
      ${d.confirmed_by ? `<p class="fact-note">Details confirmed by ${esc(d.confirmed_by)}</p>` : ''}`;
  }

  // Coffee dishes only: a compact "Origin · Tasting notes · Brew" card, showing only the fields
  // that exist. Never a placeholder — an absent field just doesn't get a row.
  function beanFacts(d) {
    if (d.origin == null && d.tasting_notes == null && d.brew_method == null) return '';
    const rows = [];
    if (d.origin) rows.push(fact('Origin', esc(d.origin)));
    if (d.tasting_notes?.length) rows.push(fact('Tasting notes', d.tasting_notes.map(esc).join(', ')));
    if (d.brew_method) rows.push(fact('Brew', esc(cap(d.brew_method))));
    return rows.length ? `<dl class="facts bean-facts">${rows.join('')}</dl>` : '';
  }

  // "Add to my table" row: stepper + optional note. Pre-fills from the tray if the dish is
  // already on the table, and swaps its own label to "Update my table".
  function initTrayAdd(content, dish) {
    const btn = content.querySelector('.tray-add-btn');
    const qtyEl = content.querySelector('.tray-qty');
    const noteEl = content.querySelector('.tray-note');
    const statusEl = content.querySelector('.tray-add-status');
    const existing = MenvaTray.get(activeRestaurant.id, currentTable).find((it) => it.id === dish.id);
    let qty = existing ? existing.qty : 1;
    let resetLabelTimer = 0;

    qtyEl.textContent = String(qty);
    if (existing) {
      noteEl.value = existing.note || '';
      btn.textContent = 'Update my table';
    }

    content.querySelectorAll('.tray-step').forEach((step) => {
      step.addEventListener('click', () => {
        qty = Math.min(20, Math.max(1, qty + Number(step.dataset.step)));
        qtyEl.textContent = String(qty);
      });
    });

    // Quick-note chips: tap appends the restaurant's suggested note (comma-separated), respecting
    // the 80-char limit and skipping anything already in the note. noteEl.value is plain text —
    // never innerHTML — so this is safe even if the chip's own text came from untrusted data.
    content.querySelectorAll('.quick-note-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const note = chip.dataset.note;
        const parts = noteEl.value.split(',').map((s) => s.trim()).filter(Boolean);
        if (!note || parts.includes(note)) return;
        const joined = [...parts, note].join(', ');
        if (joined.length > MAX_NOTE) return;
        noteEl.value = joined;
      });
    });

    btn.addEventListener('click', () => {
      MenvaTray.add(activeRestaurant.id, currentTable, dish.id, qty, noteEl.value);
      MenvaTrack('tray_add', { dish: dish.id });
      clearTimeout(resetLabelTimer);
      btn.textContent = 'Added';
      statusEl.textContent = `Added to your table — ${qty} × ${dish.name}${noteEl.value.trim() ? `, ${noteEl.value.trim()}` : ''}`;
      resetLabelTimer = setTimeout(() => { if (btn.isConnected) btn.textContent = 'Update my table'; }, 1200);
    });
  }

  // ─── Favourites ──────────────────────────────────────────────
  // The same on-device list the Table Card reads (js/sharecard.js): menva.favs.<restaurant> = [dish ids].
  // No account, nothing leaves the phone; every call is safe without localStorage.
  const favKey = (rid) => `menva.favs.${rid}`;
  function readFavs(rid) { try { const v = JSON.parse(localStorage.getItem(favKey(rid)) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } }
  const isFav = (rid, did) => readFavs(rid).includes(did);
  function toggleFav(rid, did) {
    const favs = readFavs(rid);
    const next = favs.includes(did) ? favs.filter((x) => x !== did) : [...favs, did].slice(-200);
    try { localStorage.setItem(favKey(rid), JSON.stringify(next)); } catch {}
    return next.includes(did);
  }

  // ─── Dish Sheet ──────────────────────────────────────────────
  // Order: price → description → halal → allergens → spice → dietary → ingredients → nutrition.
  const LOAD_LIMIT_MS = 12000; // past this, show the 360° view while the full view keeps loading
  // Each dish is shot from its own best angle (data/model-sources.json → assets.orbit/target); the poster,
  // the share card and the live 3D's first view all use it so the poster → 3D crossfade lines up.
  const DEFAULT_ORBIT = '-25deg 55deg 85%';

  async function openDish(dish, trigger) {
    lastTrigger = trigger;
    const dialog = app.querySelector('dialog');
    const content = app.querySelector('#dish-content');
    const a = dish.assets;
    MenvaTrack('dish_open', { dish: dish.id });
    const firstOpen = window.MenvaShare ? MenvaShare.markSeen(activeRestaurant.id, dish.id) : false; // first time on this phone → "tried something new"

    // The Pass: blur-up poster paints instantly (inline base64, zero network), then focuses as the GLB loads.
    // model-viewer's own AR button is replaced by an empty slot; ours sits below the stage (thumb reach).
    const modelViewer = dish.has3d ? `<model-viewer id="dish-viewer" camera-controls touch-action="pan-y" camera-orbit="${esc(a.orbit || DEFAULT_ORBIT)}"${a.target ? ` camera-target="${esc(a.target)}"` : ''} shadow-intensity="1" shadow-softness="0.6" environment-image="neutral" interaction-prompt="none" auto-rotate-delay="0" rotation-per-second="30deg" alt="${esc(dish.name)} — close-up view">
            <span slot="ar-button" hidden></span>
            <div slot="ar-prompt" class="ar-prompt">
              <svg viewBox="0 0 120 80" aria-hidden="true"><ellipse cx="60" cy="62" rx="44" ry="12"/><g class="ar-prompt-phone"><rect x="50" y="8" width="20" height="34" rx="4"/><line x1="57" y1="13" x2="63" y2="13"/></g></svg>
              <p>Move your phone slowly over the table.</p>
            </div>
          </model-viewer>` : '';

    // Three calm zones (css/sheet.css): 1 the dish — stage, name, price and the one filled button;
    // 2 "Add to my table"; 3 a slim row of quiet extras — then the details.
    // The AR slot keeps its height from the first frame, so the button arriving never moves anything.
    const faved = isFav(activeRestaurant.id, dish.id);
    content.innerHTML = `
      ${dish.has3d ? `<div class="dish-stage${dish.serve === 'iced' ? ' iced' : ''}">
          ${MenvaLoader.markup(dish, modelViewer)}
          <button id="reset-view" class="reset-view" hidden aria-label="Reset the view">${resetIcon}</button>
        </div>` : ''}
      <section class="dish-detail">
        <div class="zone zone-dish">
          <p class="overline">${esc(activeRestaurant.name)} / ${esc(dish.category)}</p>
          <h2 id="dish-title">${esc(dish.name)}${serveTag(dish.serve)}</h2>
          <p class="detail-price${dish.price_pkr == null ? ' fact-unconfirmed' : ''}">${esc(formatPrice(dish.price_pkr))}</p>
          ${dish.has3d ? `<div class="ar-slot">
            <button type="button" class="ar-btn" hidden>${dropIcon} <span class="ar-btn-label">See it on your table</span></button>
            <p id="viewer-status" class="stage-status" role="status"></p>
          </div>
          ${MenvaCaps.inApp ? `<p class="inapp-note">For the table view, open this page in Chrome or Safari. <button type="button" class="copy-link">Copy link</button></p>` : ''}` : ''}
        </div>
        <div class="zone tray-add">
          <div class="tray-stepper">
            <button type="button" class="tray-step" data-step="-1" aria-label="Fewer">−</button>
            <output class="tray-qty" aria-live="polite">1</output>
            <button type="button" class="tray-step" data-step="1" aria-label="More">+</button>
          </div>
          <input type="text" class="tray-note" placeholder="Note for the kitchen (optional)" maxlength="80" aria-label="Note for the kitchen (optional)">
          ${activeRestaurant.quickNotes?.length ? `<div class="quick-notes">${activeRestaurant.quickNotes.map(n => `<button type="button" class="quick-note-chip" data-note="${esc(n)}">${esc(n)}</button>`).join('')}</div>` : ''}
          <button type="button" class="tray-add-btn">Add to my table</button>
          <p class="tray-add-status" role="status" aria-live="polite"></p>
        </div>
        ${dish.has3d ? `<div class="extras" role="group" aria-label="More for this dish">
          <button type="button" class="share-pill" hidden>${shareIcon}<span>Share my table card</span></button>
          <button type="button" class="fav-btn" aria-pressed="${faved}">${heartIcon}<span>My fav</span></button>
        </div>` : ''}
        <div class="zone-details">
          ${dish.description ? `<p class="dish-desc">${esc(dish.description)}</p>` : ''}
          ${beanFacts(dish)}
          ${dishFacts(dish)}
        </div>
        <button class="back-menu">Back to menu ${arrow}</button>
      </section>
    `;

    content.querySelector('.back-menu').addEventListener('click', () => dialog.close());
    content.querySelector('.copy-link')?.addEventListener('click', copyLink);
    initTrayAdd(content, dish);
    document.body.classList.add('modal-open');
    dialog.showModal();

    if (!dish.has3d) return;

    const viewer = document.getElementById('dish-viewer');
    const status = document.getElementById('viewer-status');
    const arButton = content.querySelector('.ar-btn');
    const resetBtn = document.getElementById('reset-view');
    const sharePill = content.querySelector('.share-pill');
    const favBtn = content.querySelector('.fav-btn');
    const slot = content.querySelector('.ar-slot');
    favBtn.addEventListener('click', () => {
      const on = toggleFav(activeRestaurant.id, dish.id);
      favBtn.setAttribute('aria-pressed', String(on));
      MenvaTrack('fav_toggle', { dish: dish.id, on });
    });
    sharePill.addEventListener('click', () => {
      window.MenvaShare?.open({ restaurant: activeRestaurant, dish, table: currentTable, isNew: firstOpen, trigger: sharePill });
    });
    // The card is offered once the dish has settled on a view: the live 3D, or the 360° / photo
    // fallback — and again, with a nudge, when the diner comes back from AR.
    const showSharePill = (nudge) => {
      if (!window.MenvaShare || !stage.isConnected) return;
      sharePill.hidden = false;
      if (nudge) { sharePill.classList.remove('is-nudge'); void sharePill.offsetWidth; sharePill.classList.add('is-nudge'); }
    };
    const say = (text) => { status.textContent = text; };
    const spin = a.spin ? { url: a.spin, layout: a.spinLayout } : null;
    const openedAt = performance.now();
    // This sheet's own stage: timers and events from a sheet the diner already closed must not
    // touch the next dish's sheet (#dish-content is reused).
    const stage = content.querySelector('.dish-stage');
    let tier = null;
    const setTier = (t, reason) => {
      if (t === tier || !stage.isConnected) return;
      tier = t;
      stage.dataset.tier = t;
      slot.dataset.tier = t;
      showSharePill(false);
      MenvaTrack('tier_assigned', { dish: dish.id, tier: t, ...(reason && { reason }) });
    };

    // Start The Pass before model-viewer's script arrives so the diner sees progress copy at once.
    // The dish is "alive": once the live 3D is on screen it turns by itself from its best angle until the
    // diner touches it, and the first dish of a visit shows a one-time "Drag to turn" hint.
    let hint = null;
    const turner = MenvaViewer.autoTurn(viewer, { onTouch: () => hint?.dismiss() });
    const pass = MenvaLoader.start(content, viewer, {
      lines: activeRestaurant.loaderLines,
      onLive: () => {
        if (!stage.isConnected || tier === 4 || tier === 5) return;
        turner.start();
        hint = MenvaViewer.dragHint(stage.querySelector('.pass'));
      },
      spin,
      onStall: () => MenvaTrack('model_progress_stalled', { dish: dish.id }),
      onFallback: (t, reason) => setTier(t, reason),
    });

    // Let the sheet paint the dish first; the WebGL probe below is not free.
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r)));
    if (!viewer.isConnected) return;

    // Tiers 4–5 up front: no WebGL, a low-memory phone, or a forced tier. Nothing 3D is downloaded.
    const pre = MenvaCaps.preflight(!!spin);
    if (pre) {
      pass.fallback(pre, 'Swipe to turn the dish');
      setTier(pre, MenvaCaps.forced ? 'forced' : 'device');
      return;
    }

    // Download the model (and, on the first dish, model-viewer itself) in parallel, counting real
    // bytes for The Pass. model-viewer then reads both from cache.
    const glbUrl = MenvaViewer.absolute(a.glb);
    const parts = { glb: [0, a.glbBytes] };
    if (!MenvaViewer.isLoaded) parts.viewer = [0, MenvaViewer.MODEL_VIEWER_BYTES];
    const bytes = (key) => (loaded, total) => {
      parts[key] = [loaded, total];
      const [l, t] = Object.values(parts).reduce(([l, t], [a, b]) => [l + a, t + b], [0, 0]);
      if (t) pass.progress((l / t) * 0.95, parts.glb[0] / parts.glb[1]); // the last 5% is parsing and first render
    };

    // Too slow: show the 360° view now and keep loading; the full view takes over when it arrives.
    const slowTimer = setTimeout(() => {
      if (viewer.loaded || !viewer.isConnected) return;
      pass.fallback(4, 'Here it is in 360° while the full view loads');
      setTier(4, 'slow');
    }, LOAD_LIMIT_MS);

    const failed = (reason) => {
      clearTimeout(slowTimer);
      if (!viewer.isConnected) return;
      MenvaTrack('model_failed', { dish: dish.id, reason });
      pass.fallback(4, 'The 3D view couldn’t load here — this is the dish in 360°');
      setTier(spin ? 4 : 5, 'failed');
    };

    // Closing the sheet cancels this model's download, so flicking through dishes on slow wifi
    // doesn't pile up downloads ahead of the one the diner actually wants.
    const abort = new AbortController();
    dialog.addEventListener('close', () => abort.abort(), { once: true });
    const glbReady = MenvaViewer.download(glbUrl, a.glbBytes, bytes('glb'), abort.signal).then(() => true, () => false);
    try {
      await MenvaViewer.load(bytes('viewer')); // self-hosted, lazy: only when the first dish sheet opens
    } catch {
      return failed('viewer');
    }
    if (!(await glbReady)) return failed('download');
    if (!viewer.isConnected) return clearTimeout(slowTimer); // sheet closed while downloading

    // AR wiring goes on before src so no event is missed.
    MenvaViewer.setupAR(viewer, { usdz: MenvaViewer.absolute(a.usdz), dishId: dish.id, status, button: arButton, onExit: () => showSharePill(true) });
    viewer.addEventListener('error', () => failed('model'), { once: true });
    viewer.addEventListener('load', () => {
      clearTimeout(slowTimer);
      MenvaTrack('model_loaded', { dish: dish.id, ms: Math.round(performance.now() - openedAt), bytes: a.glbBytes });
      // The tier is decided now — after model-viewer and the model have loaded, never on a timer.
      const t = MenvaCaps.assign(viewer);
      setTier(t);
      resetBtn.hidden = false;
      if (t === 1 && a.usdz) {
        prepareIPhoneAR();
      } else if (t <= 2) {
        arButton.hidden = false;
        say('Ready — see it on your table.');
      } else {
        say(MenvaCaps.isMobile || MenvaCaps.inApp
          ? 'Drag to turn the dish · Pinch to zoom'
          : 'Drag to turn the dish. To see it on your table, open this menu on your phone.');
      }
    }, { once: true });
    viewer.src = glbUrl;

    // iPhone: Quick Look downloads the USDZ itself at the moment of the tap, which on a first visit
    // means a spinner. So the file comes down right after the 3D, with real progress on the button,
    // and Quick Look is handed the copy in memory — the first tap opens straight onto the table.
    function prepareIPhoneAR() {
      const label = arButton.querySelector('.ar-btn-label');
      const ready = () => {
        if (!stage.isConnected) return;
        arButton.disabled = false;
        arButton.classList.remove('is-preparing');
        label.textContent = 'See it on your table';
        say('Ready — see it on your table.');
      };
      arButton.hidden = false;
      arButton.disabled = true;
      arButton.classList.add('is-preparing');
      label.textContent = 'Preparing your table view… 0%';
      say(''); // the button itself says what's happening
      MenvaViewer.prepareQuickLook(viewer, MenvaViewer.absolute(a.usdz), a.usdzBytes, (l, total) => {
        const pct = total ? Math.min(99, Math.round((l / total) * 100)) : 0;
        arButton.style.setProperty('--prep', pct / 100);
        label.textContent = `Preparing your table view… ${pct}%`;
      }, abort.signal).then(ready, () => {
        if (!stage.isConnected) return;
        viewer.iosSrc = MenvaViewer.absolute(a.usdz); // fall back: Quick Look fetches it itself
        ready();
      });
    }

    resetBtn.addEventListener('click', () => {
      viewer.cameraOrbit = a.orbit || DEFAULT_ORBIT; // matches the poster framing
      viewer.cameraTarget = a.target || 'auto auto auto';
      viewer.fieldOfView = 'auto';
      viewer.jumpCameraToGoal?.();
      turner.resume(); // back to the dish's own angle, turning again
    });

    // The AR button's light sweep and icon only run while it is actually on screen.
    if ('IntersectionObserver' in window) {
      const seen = new IntersectionObserver(([e]) => arButton.classList.toggle('is-seen', e.isIntersecting), { threshold: 0.6 });
      seen.observe(arButton);
      dialog.addEventListener('close', () => seen.disconnect(), { once: true });
    }
  }

  // In-app browsers (Instagram, Facebook, TikTok…) can't open AR; help the diner move to a real browser.
  async function copyLink(e) {
    const btn = e.currentTarget;
    try {
      await navigator.clipboard.writeText(location.href);
      btn.textContent = 'Link copied';
    } catch {
      window.prompt('Copy this link, then open it in Chrome or Safari:', location.href);
    }
  }

  // ─── Table number ─────────────────────────────────────────────
  // Printed QR codes point at /g/<n>. Remember the table for this tab so /g keeps it.
  function rememberTable(restaurantId, table) {
    try { sessionStorage.setItem(TABLE_KEY, JSON.stringify({ restaurant: restaurantId, table })); } catch {}
  }
  function storedTable(restaurantId) {
    try {
      const saved = JSON.parse(sessionStorage.getItem(TABLE_KEY) || 'null');
      return saved && saved.restaurant === restaurantId ? saved.table : null;
    } catch { return null; }
  }
  const validTable = (t) => /^[1-9]\d{0,2}$/.test(t); // 1–999

  // ─── Router ───────────────────────────────────────────────────
  // Old hash URLs (#/, #/restaurant/<id>) are rewritten to their path equivalents.
  function legacyHashPath() {
    const hash = location.hash.replace(/^#/, '');
    if (!hash) return null;
    const m = hash.match(/^\/restaurant\/([\w-]+)/);
    if (m) { const r = data && findRestaurantBySlug(m[1]); return r ? `/${r.slug}` : '/'; }
    return '/';
  }

  let firstRoute = true;
  function route() {
    const parts = location.pathname.split('/').filter(Boolean).map(decodeURIComponent);

    if (parts[0] === 'for-restaurants') {
      // Reserved slug: the owner-facing page (js/for-restaurants.js). It works without menu data.
      if (parts.length === 1) {
        document.title = 'AR menus for restaurants in Lahore — MENVA';
        setTheme('default');
        MenvaForRestaurants.render(app, data, { header: header(), footer });
      } else {
        notFound('Page not found');
      }
    } else if (parts.length === 0) {
      brandPage();
    } else if (!data) {
      dataUnavailable();
    } else {
      const r = findRestaurantBySlug(parts[0]);
      const tablePart = parts[1];
      if (!r || parts.length > 2) {
        notFound(r ? 'Page not found' : 'Restaurant not found');
      } else if (tablePart !== undefined && !validTable(tablePart)) {
        // Mistyped table: keep the diner on the menu rather than showing an error.
        history.replaceState(null, '', `/${parts[0]}`);
        return route();
      } else {
        if (tablePart) rememberTable(r.id, tablePart);
        const table = tablePart || storedTable(r.id);
        MenvaTrack.setContext(r.id, table);
        if (firstRoute && tablePart) MenvaTrack('scan'); // arrived from a table QR code
        MenvaTrack('menu_view');
        window.MenvaShare?.recordVisit(r.id); // one day per visit, on this phone only (the "streak" mood)
        restaurantPage(r, table);
        openLinkedDish(r);
      }
    }

    firstRoute = false;
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  // /g?dish=<id> (e.g. from the home page) opens that dish's sheet over the menu. The parameter is
  // dropped afterwards so a reload shows the menu; ?tier= and ?slow= are kept.
  function openLinkedDish(r) {
    const params = new URLSearchParams(location.search);
    const id = params.get('dish');
    if (!id) return;
    params.delete('dish');
    history.replaceState(null, '', location.pathname + (params.size ? `?${params}` : ''));
    const dish = r.dishes.find(d => d.id === id);
    const card = app.querySelector(`[data-dish="${CSS.escape(id)}"]`);
    if (dish && card) openDish(dish, card);
  }

  function navigate(path) {
    if (path === location.pathname) return;
    history.pushState(null, '', path);
    route();
  }

  function notFound(msg) {
    document.title = 'Not found — MENVA';
    setTheme('default');
    app.innerHTML = header() + `<main class="brand-page">
      <h1>${esc(msg)}</h1>
      <p>Scan the code on your table again, or ask your server for the menu link.</p>
      <a href="/" data-link class="product-action">Go to MENVA ${arrow}</a>
    </main>` + footer;
  }

  // Menu data could not be fetched (offline on first visit, or a server problem).
  function dataUnavailable() {
    document.title = 'MENVA';
    setTheme('default');
    app.innerHTML = header() + `<main class="brand-page">
      <h1>The menu didn't load.</h1>
      <p>This usually means the connection dropped. Check the wifi or mobile data, then try again.</p>
      <button type="button" class="product-action" id="retry">Try again ${arrow}</button>
    </main>` + footer;
    document.getElementById('retry').addEventListener('click', start);
  }

  // ─── Init ────────────────────────────────────────────────────
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-link]');
    if (!link || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(link.getAttribute('href'));
  });
  window.addEventListener('popstate', route);

  async function start() {
    try { await loadData(); } catch { data = null; }
    const legacy = legacyHashPath();
    if (legacy) history.replaceState(null, '', legacy);
    route();
    // Probe WebGL while the diner reads the menu, so opening a dish never waits for it.
    (window.requestIdleCallback || setTimeout)(() => MenvaCaps.webgl());
  }
  start();

  // Service worker: caches vendor/CSS/JS/dish assets after first fetch (see /sw.js).
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }
})();
