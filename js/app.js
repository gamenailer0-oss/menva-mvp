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
  const shareIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/><path d="M4 13h16M8 6V4m8 2V4"/></svg>';
  const arIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10M7 8h10M7 16h6"/></svg>';

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
  const footer = `<footer><span>menva<span class="wordmark-dot">.</span></span><p>See it before you order it.</p><small>3D scans provided by restaurants</small></footer>`;

  // ─── Header ──────────────────────────────────────────────────
  // No directory to go back to: on a restaurant page the diner stays on that menu.
  function header() {
    const wordmark = `<a class="wordmark" href="/" data-link aria-label="MENVA home">menva<span class="wordmark-dot">.</span></a>`;
    return `<header class="topbar">${wordmark}<nav><div class="theme-toggle-wrap"><button data-mode-toggle aria-label="Switch theme"><span class="toggle-icon"><svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg><svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 14A8.5 8.5 0 0 1 10 3.5 8.5 8.5 0 1 0 20.5 14Z"/></svg></span></button></div></nav></header>`;
  }

  // ─── Cheffy cameo (only when the restaurant config enables it) ─
  function cheffy(pose, text) {
    return `<div class="cheffy-cameo"><img src="/assets/cheffy/${pose}.webp" alt="Cheffy" width="42" height="52"><p><span>Cheffy</span>${text}</p></div>`;
  }

  // ─── Home hero: the AR story in a phone (css/hero.css) ────────
  // The pilot's first 3D dish drops onto a table and is measured at its real size. Pure CSS
  // animation; the loop pauses when the hero is scrolled out of view.
  function arDemo(dish) {
    const src = dish?.assets?.poster || '/assets/dishes/steak-main/poster.webp';
    const d = dish?.dimensions_cm;
    const size = d ? `True size · ${Math.round(Math.max(d.width, d.depth))} cm` : 'True size';
    return `<figure class="ar-demo" role="img" aria-label="A phone camera pointed at a table: the ${esc(dish?.name || 'dish')} appears on it at its true size.">
      <div class="ar-phone" aria-hidden="true">
        <div class="ar-screen">
          <div class="ar-table"></div>
          <div class="ar-dots"></div>
          <div class="ar-reticle"></div>
          <div class="ar-shadow"></div>
          <img class="ar-dish" src="${esc(src)}" alt="" width="1200" height="900" decoding="async">
          <div class="ar-measure"><span class="ar-tick"></span><span class="ar-tick"></span><span class="ar-rule"></span></div>
          <span class="ar-label">${esc(size)}</span>
          <span class="ar-hint ar-hint-scan">Move your phone slowly over the table</span>
          <span class="ar-hint ar-hint-placed">Placed on your table</span>
        </div>
      </div>
    </figure>`;
  }

  function pauseDemoOffscreen() {
    const demo = app.querySelector('.ar-demo');
    if (!demo || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(([e]) => demo.classList.toggle('is-offscreen', !e.isIntersecting)).observe(demo);
  }

  // ─── Motion: scroll reveal ──────────────────────────────────────
  // Section/card arrival: fade + rise, staggered, once per element. Content is visible even if this
  // never runs (the opacity:0 start only applies under html.js-motion). Reduced motion: skip entirely.
  const REVEAL_SELECTOR = '.dish-card, .dish-row, .home-pilot, .home-how, .menu-heading';
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
    root.querySelectorAll('.dish-card .dish-photo, .pilot-dishes .pilot-dish-photo').forEach(el => {
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

  // A restaurant card for the home page's "Our restaurants" row: logo/name, up to 3 dish photos,
  // and a link to its menu. Used for every restaurant with `listed: true` (pilot first). The whole
  // row item is scoped with the restaurant's own `data-theme` so --accent etc. resolve to its own
  // palette (Gauchos' card is unaffected — none of its rules read a themed variable). A restaurant
  // with a `logoRound` (e.g. Baraza) gets the richer brand layout: round crop, name, tagline and a
  // sage-band accent stripe; one without it keeps the original wide-logo card unchanged.
  function restaurantRowItem(r) {
    const rslug = esc(r.slug);
    const rname = esc(r.displayName || r.name);
    const rtheme = esc(r.theme || 'default');
    const rdishes = (r.dishes || []).filter(d => d.has3d).slice(0, 3);
    const hasBrand = !!r.logoRound;
    // The brand layout has room for the full name (e.g. "Baraza Coffee"), unlike the compact
    // wide-logo card, which already carries the name in its logo art.
    const rfullname = esc(r.name || r.displayName);
    const cardInner = hasBrand
      ? `<img src="${esc(r.logoRound)}" alt="${rfullname}" width="56" height="56" class="pilot-logo-round">
        <span class="pilot-copy">
          <span class="pilot-name">${rfullname}</span>
          ${r.tagline ? `<span class="pilot-tagline">${esc(r.tagline)}</span>` : ''}
          <span class="pilot-where">${esc(r.area || 'Gulberg III')} · ${esc(r.location || 'Lahore')}</span>
        </span>`
      : `${r.logo ? `<img src="${esc(r.logo)}" alt="${rname}" width="200" height="80" class="pilot-logo">` : `<span class="pilot-name">${rname}</span>`}
        <span class="pilot-where">${esc(r.area || 'Gulberg III')} · ${esc(r.location || 'Lahore')}</span>`;
    return `<div class="restaurant-row-item" data-theme="${rtheme}">
      <a class="pilot-card${hasBrand ? ' pilot-card--brand' : ''}" href="/${rslug}" data-link>${cardInner}</a>
      ${rdishes.length ? `<ul class="pilot-dishes">${rdishes.map(d => `
        <li><a href="/${rslug}?dish=${esc(d.id)}" data-link>
          <span class="pilot-dish-photo" style="background-image:url('${d.assets.blur}')"><img src="${esc(d.assets.poster)}" alt="" width="1200" height="900" loading="lazy" decoding="async"></span>
          <span class="pilot-dish-name">${esc(d.name)}</span>
        </a></li>`).join('')}
      </ul>` : ''}
      <a class="pilot-more" href="/${rslug}" data-link>See the full menu ${arrow}</a>
    </div>`;
  }

  // ─── Brand page (/) — no 3D ───────────────────────────────────
  function brandPage() {
    document.title = 'MENVA — See it before you order it';
    setTheme('default');
    // The pilot's link never depends on the menu data loading: /g is the Gauchos menu.
    const pilot = data?.restaurants.find(r => r.pilot);
    const slug = esc(pilot?.slug || 'g');
    const name = esc(pilot?.name || 'Gauchos');
    const dishes = (pilot?.dishes || []).filter(d => d.has3d).slice(0, 3);
    const hero = dishes[0];

    // A small row of partner restaurants (not a searchable directory, CLAUDE.md §9) — every
    // `listed: true` restaurant, pilot first. Today only Gauchos is listed, so this renders exactly
    // one card. If the menu data hasn't loaded, fall back to the pilot's known defaults.
    const listed = (data?.restaurants || []).filter(r => r.listed).sort((a, b) => (a.pilot === b.pilot ? 0 : a.pilot ? -1 : 1));
    const restaurantRows = listed.length
      ? listed.map(restaurantRowItem).join('')
      : restaurantRowItem({ slug: 'g', name: 'Gauchos', displayName: 'Gauchos', area: 'Gulberg III', location: 'Lahore' });

    app.innerHTML = header() + `<main class="home">
      <section class="home-hero">
        <div class="hero-copy">
          <p class="overline">AR menus · Lahore</p>
          <h1>See it on your table. Then <em>order it.</em></h1>
          <p>Scan the code at your table and the real dish appears in front of you — true to size, before you decide.</p>
          <a class="product-action" href="/${slug}" data-link>Open the ${name} menu ${arrow}</a>
          <p class="hero-trust">Works in Safari and Chrome · No app to install</p>
        </div>
        ${arDemo(hero)}
      </section>

      <section class="home-pilot" aria-labelledby="pilot-heading">
        <p class="overline" id="pilot-heading">Our restaurants</p>
        <div class="restaurant-row">${restaurantRows}</div>
      </section>

      <section class="home-how" aria-labelledby="how-heading">
        <h2 id="how-heading">How it works</h2>
        <ol>
          <li><strong>Scan the code on your table.</strong> The menu opens on your phone — no app to install.</li>
          <li><strong>Tap a dish.</strong> The real dish comes into focus; turn it around with a finger.</li>
          <li><strong>See it on your table.</strong> Place it in front of you at its true size, then decide.</li>
        </ol>
      </section>
    </main>` + footer;
    pauseDemoOffscreen();
    initMotion(app);
    initTilt(app);
  }

  // ─── Restaurant Page ──────────────────────────────────────────
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

    // One identity block: the restaurant's own logo is the page heading (no name repeated four times),
    // the table number sits with it, and the first dish is in view sooner.
    // Restaurants with an `hours` field (e.g. Baraza) get a full-width brand band with a round logo
    // and pills instead of the printed cover card — Gauchos has no `hours` and keeps its card unchanged.
    const themeClass = `theme-${esc(r.theme || 'default')}`;
    const hasBand = !!r.hours;
    const name = esc(r.displayName || r.name);
    const heading = r.logo ? `<img src="${esc(r.logo)}" alt="${name}" class="restaurant-logo-svg" width="200" height="80">` : name;
    const subtitle = r.showCheffy ? cheffy('wave', esc(r.menuSubtitle)) : `<span>${esc(r.menuSubtitle || '')}</span>`;

    const bandHTML = hasBand ? `<section class="restaurant-band ${themeClass}">
      <div class="band-inner">
        ${r.logoRound ? `<img src="${esc(r.logoRound)}" alt="${name}" class="band-logo" width="88" height="88">`
          : r.logo ? `<img src="${esc(r.logo)}" alt="${name}" class="band-logo-wide" width="220" height="27">` : ''}
        <div class="band-copy">
          <h1 class="sr-only">${name}</h1>
          ${r.tagline ? `<p class="band-tagline">${esc(r.tagline)}</p>` : ''}
          <div class="band-pills">
            ${r.hours ? `<span class="pill">${esc(r.hours)}</span>` : ''}
            ${r.area ? `<span class="pill">${esc(r.area)}</span>` : ''}
            ${table ? `<span class="table-chip">Table ${esc(table)}</span>` : ''}
          </div>
        </div>
      </div>
    </section>` : '';
    const coverHTML = hasBand ? '' : `<section class="restaurant-cover">
        <div class="cover-card">
          <h1 class="cover-heading">${heading}</h1>
          <div class="cover-copy">
            <div class="cover-meta">
              <span class="overline">${esc(r.area)} · ${esc(r.location)}</span>
              ${table ? `<span class="table-chip">Table ${esc(table)}</span>` : ''}
            </div>
            <p>${esc(r.tagline)}</p>
          </div>
        </div>
      </section>`;

    app.innerHTML = header() + bandHTML + `<main class="restaurant-page ${themeClass}">
      ${coverHTML}
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
    let clearArmed = false;
    let clearTimer = 0;

    function renderPill() {
      const n = MenvaTray.count(r.id, table);
      pill.hidden = n === 0;
      if (n > 0) pill.textContent = `Show the waiter · ${n}`;
    }

    function renderWaiter() {
      const items = MenvaTray.get(r.id, table);
      const content = waiterDialog.querySelector('.waiter-content');
      const tableLabel = table ? `Table ${esc(table)}` : 'Your order';
      const rows = items.map((it) => {
        const dish = r.dishes.find((d) => d.id === it.id);
        if (!dish) return '';
        const price = dish.price_pkr != null ? `<span class="waiter-item-price">${esc(formatPrice(dish.price_pkr))}</span>` : '';
        return `<li class="waiter-item" data-item="${esc(it.id)}">
            <div class="waiter-item-row">
              <span class="waiter-item-qty">${it.qty} ×</span>
              <span class="waiter-item-name">${esc(dish.name)}</span>
              ${price}
            </div>
            ${it.note ? `<p class="waiter-item-note">${esc(it.note)}</p>` : ''}
            <div class="waiter-item-edit">
              <button type="button" class="waiter-edit-btn waiter-edit-minus" aria-label="Fewer ${esc(dish.name)}">−</button>
              <button type="button" class="waiter-edit-btn waiter-edit-plus" aria-label="More ${esc(dish.name)}">+</button>
              <button type="button" class="waiter-edit-btn waiter-edit-remove" aria-label="Remove ${esc(dish.name)}">Remove</button>
            </div>
          </li>`;
      }).join('');
      content.innerHTML = `
        <button type="button" class="waiter-done">Done</button>
        <h2 id="waiter-title">${esc(tableLabel)}</h2>
        <p class="waiter-hint">Turn your screen toward your server.</p>
        <ul class="waiter-list">${rows || '<li class="waiter-empty">Nothing on the table yet.</li>'}</ul>
        ${items.length ? `<button type="button" class="waiter-clear">Clear the list</button>` : ''}
      `;

      content.querySelector('.waiter-done').addEventListener('click', () => waiterDialog.close());
      content.querySelectorAll('.waiter-item').forEach((li) => {
        const id = li.dataset.item;
        li.querySelector('.waiter-edit-minus').addEventListener('click', () => {
          const item = MenvaTray.get(r.id, table).find((x) => x.id === id);
          if (!item) return;
          if (item.qty <= 1) MenvaTray.remove(r.id, table, id);
          else MenvaTray.setQty(r.id, table, id, item.qty - 1);
        });
        li.querySelector('.waiter-edit-plus').addEventListener('click', () => {
          const item = MenvaTray.get(r.id, table).find((x) => x.id === id);
          if (item) MenvaTray.setQty(r.id, table, id, item.qty + 1);
        });
        li.querySelector('.waiter-edit-remove').addEventListener('click', () => {
          MenvaTray.remove(r.id, table, id);
        });
      });
      content.querySelector('.waiter-clear')?.addEventListener('click', (e) => {
        const btn = e.currentTarget;
        if (!clearArmed) {
          clearArmed = true;
          btn.textContent = 'Tap again to clear';
          clearTimer = setTimeout(() => { clearArmed = false; if (btn.isConnected) btn.textContent = 'Clear the list'; }, 3000);
          return;
        }
        clearTimeout(clearTimer);
        clearArmed = false;
        MenvaTray.clear(r.id, table);
        waiterDialog.close();
      });
    }

    pill.addEventListener('click', () => {
      lastWaiterTrigger = pill;
      MenvaTrack('waiter_view');
      renderWaiter();
      document.body.classList.add('modal-open');
      waiterDialog.showModal();
    });
    waiterDialog.addEventListener('close', () => {
      document.body.classList.remove('modal-open');
      waiterDialog.querySelector('.waiter-content').innerHTML = '';
      clearArmed = false;
      clearTimeout(clearTimer);
      lastWaiterTrigger?.focus();
    });

    trayUnsubscribe?.();
    trayUnsubscribe = MenvaTray.onChange(() => {
      renderPill();
      if (waiterDialog.open) renderWaiter();
    });
    renderPill();
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
    const modelViewer = dish.has3d ? `<model-viewer id="dish-viewer" camera-controls touch-action="pan-y" camera-orbit="${esc(a.orbit || DEFAULT_ORBIT)}"${a.target ? ` camera-target="${esc(a.target)}"` : ''} shadow-intensity="1" shadow-softness="0.6" environment-image="neutral" interaction-prompt="auto" alt="${esc(dish.name)} — 3D scan">
            <span slot="ar-button" hidden></span>
            <div slot="ar-prompt" class="ar-prompt">
              <svg viewBox="0 0 120 80" aria-hidden="true"><ellipse cx="60" cy="62" rx="44" ry="12"/><g class="ar-prompt-phone"><rect x="50" y="8" width="20" height="34" rx="4"/><line x1="57" y1="13" x2="63" y2="13"/></g></svg>
              <p>Move your phone slowly over the table.</p>
            </div>
          </model-viewer>` : '';

    content.innerHTML = `
      ${dish.has3d ? `<div class="dish-stage${dish.serve === 'iced' ? ' iced' : ''}">
          ${MenvaLoader.markup(dish, modelViewer)}
          <button id="reset-view" class="reset-view" hidden aria-label="Reset the view">${resetIcon}</button>
          <div class="stage-actions">
            <button type="button" class="ar-btn" hidden>${arIcon} <span class="ar-btn-label">See it on your table</span></button>
            <button type="button" class="share-pill" hidden>${shareIcon} Share my table card</button>
            <p id="viewer-status" class="stage-status" role="status"></p>
            ${MenvaCaps.inApp ? `<p class="inapp-note">For the table view, open this page in Chrome or Safari. <button type="button" class="copy-link">Copy link</button></p>` : ''}
          </div>
        </div>` : ''}
      <section class="dish-detail">
        <p class="overline">${esc(activeRestaurant.name)} / ${esc(dish.category)}</p>
        <h2 id="dish-title">${esc(dish.name)}${serveTag(dish.serve)}</h2>
        <p class="detail-price${dish.price_pkr == null ? ' fact-unconfirmed' : ''}">${esc(formatPrice(dish.price_pkr))}</p>
        ${dish.description ? `<p>${esc(dish.description)}</p>` : ''}
        ${beanFacts(dish)}
        ${dishFacts(dish)}
        <div class="tray-add">
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
      showSharePill(false);
      MenvaTrack('tier_assigned', { dish: dish.id, tier: t, ...(reason && { reason }) });
    };

    // Start The Pass before model-viewer's script arrives so the diner sees progress copy at once.
    const pass = MenvaLoader.start(content, viewer, {
      lines: activeRestaurant.loaderLines,
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
    });
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

    if (parts.length === 0) {
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
