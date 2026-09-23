/**
 * MENVA — Main Application
 * Path-routed SPA (History API): /  ·  /g  ·  /g/:table  ·  /:restaurant/:table
 * Menu data comes only from /data/build/dishes.json (built from data/dishes.csv).
 * Native <dialog> for the dish sheet. model-viewer is loaded lazily from /vendor (js/viewer.js).
 * touch-action: pan-y on all model-viewer elements.
 */
(function () {
  'use strict';

  const app = document.getElementById('app');
  const arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h15M13 6l6 6-6 6"/></svg>';
  const closeIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 6 12 12M18 6 6 18"/></svg>';
  const resetIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/></svg>';
  const arIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10M7 8h10M7 16h6"/></svg>';

  const TABLE_KEY = 'menva.table';
  const DATA_URL = '/data/build/dishes.json';

  let data = null;
  let activeRestaurant = null;
  let lastTrigger = null;

  // ─── Formatting ───────────────────────────────────────────────
  const CONFIRM = 'Please confirm with your server';
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const formatPrice = (value) => (value == null ? CONFIRM : `PKR ${new Intl.NumberFormat('en-PK').format(value)}`);
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const SPICE = ['Not spicy', 'Mild', 'Medium', 'Hot'];

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
  function header(homeLink) {
    const wordmark = homeLink
      ? `<a class="wordmark" href="/" data-link aria-label="MENVA home">menva<span class="wordmark-dot">.</span></a>`
      : `<span class="wordmark">menva<span class="wordmark-dot">.</span></span>`;
    return `<header class="topbar">${wordmark}<nav><div class="theme-toggle-wrap"><button data-mode-toggle aria-label="Switch theme"><span class="toggle-icon"><svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg><svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 14A8.5 8.5 0 0 1 10 3.5 8.5 8.5 0 1 0 20.5 14Z"/></svg></span></button></div></nav></header>`;
  }

  // ─── Cheffy cameo (only when the restaurant config enables it) ─
  function cheffy(pose, text) {
    return `<div class="cheffy-cameo"><img src="/assets/cheffy/${pose}.webp" alt="Cheffy" width="42" height="52"><p><span>Cheffy</span>${text}</p></div>`;
  }

  // ─── Brand page (/) — no 3D ───────────────────────────────────
  function brandPage() {
    document.title = 'MENVA — See it before you order it';
    document.body.dataset.theme = 'default';
    const pilot = data?.restaurants.find(r => r.pilot);
    app.innerHTML = header(false) + `<main class="brand-page">
      <p class="overline">MENVA</p>
      <h1>See it. Then <em>order it.</em></h1>
      <p>Scan the code on your table to see a real dish, then place it on your table in AR.</p>
      ${pilot ? `<a class="product-action" href="/${esc(pilot.slug)}" data-link>See the ${esc(pilot.name)} menu ${arrow}</a>
      <p class="brand-note">Now piloting at ${esc(pilot.name)}, ${esc(pilot.area)}, ${esc(pilot.location)}.</p>` : ''}
    </main>` + footer;
  }

  // ─── Restaurant Page ──────────────────────────────────────────
  function restaurantPage(r, table) {
    activeRestaurant = r;
    document.title = `${r.name} — MENVA`;
    document.body.dataset.theme = r.theme || 'default';

    // Categories in CSV order. Dishes with 3D get a poster card; others a clean text row.
    const catId = (cat, i) => `cat-${i}-${cat.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x'}`;
    const menuHTML = r.categories.map((cat, i) => {
      const dishes = r.dishes.filter(d => d.category === cat).map(d => {
        const line = `<div class="dish-line"><h4>${esc(d.name)}</h4><span>${esc(formatPrice(d.price_pkr))}</span></div>`;
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
      return `<section class="menu-category" id="${catId(cat, i)}"><h3>${esc(cat)}</h3><div class="dish-grid">${dishes}</div></section>`;
    }).join('');
    const catNav = r.categories.length > 1 ? `<nav class="cat-nav" aria-label="Menu categories"><div class="cat-nav-scroll">${r.categories.map((cat, i) => `<a href="#${catId(cat, i)}" class="cat-link">${esc(cat)}</a>`).join('')}</div></nav>` : '';

    // One identity block: the restaurant's own logo is the page heading (no name repeated four times),
    // the table number sits with it, and the first dish is in view sooner.
    const isGauchos = r.id === 'gauchos';
    const name = esc(r.displayName || r.name);
    const heading = r.logo ? `<img src="${esc(r.logo)}" alt="${name}" class="restaurant-logo-svg" width="200" height="80">` : name;
    const subtitle = r.showCheffy ? cheffy('wave', esc(r.menuSubtitle)) : `<span>${esc(r.menuSubtitle || '')}</span>`;

    app.innerHTML = header(false) + `<main class="restaurant-page${isGauchos ? ' gauchos-page' : ''}">
      <section class="restaurant-cover${isGauchos ? ' gauchos-cover' : ''}">
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
      </section>
      ${catNav}
      <p class="menu-intro">${esc(r.description)}</p>
      <section class="menu-section">
        <div class="menu-heading"><h2>${esc(r.menuTitle || 'Menu')}</h2>${subtitle}</div>
        ${menuHTML}
      </section>
      <p class="menu-disclaimer">3D views are scans of the actual dishes served at ${esc(r.name)}. Allergen, halal and nutrition details come from the restaurant — where it says "${CONFIRM}", please ask before ordering.</p>
    </main>` + footer + `<dialog id="dish-dialog" aria-labelledby="dish-title"><div class="sheet-handle" aria-hidden="true"></div><button class="close-dialog" aria-label="Close">${closeIcon}</button><div id="dish-content"></div></dialog>`;

    app.querySelectorAll('[data-dish]').forEach(btn => {
      btn.addEventListener('click', () => openDish(r.dishes.find(d => d.id === btn.dataset.dish), btn));
    });

    // Highlight the category currently in view in the sticky nav.
    const navLinks = app.querySelectorAll('.cat-link');
    if (navLinks.length) {
      const byId = new Map();
      navLinks.forEach(a => byId.set(a.getAttribute('href').slice(1), a));
      const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const link = byId.get(entry.target.id);
          if (!link) return;
          if (entry.isIntersecting) {
            navLinks.forEach(a => a.classList.remove('active'));
            link.classList.add('active');
            link.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'instant' });
          }
        });
      }, { rootMargin: '-40% 0px -55% 0px' });
      app.querySelectorAll('.menu-category').forEach(sec => io.observe(sec));
    }

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

  // ─── Dish Sheet ──────────────────────────────────────────────
  // Order: price → description → halal → allergens → spice → dietary → ingredients → nutrition.
  const LOAD_LIMIT_MS = 12000; // past this, show the 360° view while the full view keeps loading

  async function openDish(dish, trigger) {
    lastTrigger = trigger;
    const dialog = app.querySelector('dialog');
    const content = app.querySelector('#dish-content');
    const a = dish.assets;
    MenvaTrack('dish_open', { dish: dish.id });

    // The Pass: blur-up poster paints instantly (inline base64, zero network), then focuses as the GLB loads.
    // model-viewer's own AR button is replaced by an empty slot; ours sits below the stage (thumb reach).
    const modelViewer = dish.has3d ? `<model-viewer id="dish-viewer" camera-controls touch-action="pan-y" camera-orbit="-25deg 55deg 85%" shadow-intensity="1" shadow-softness="0.6" environment-image="neutral" interaction-prompt="auto" alt="${esc(dish.name)} — 3D scan">
            <span slot="ar-button" hidden></span>
            <div slot="ar-prompt" class="ar-prompt">
              <svg viewBox="0 0 120 80" aria-hidden="true"><ellipse cx="60" cy="62" rx="44" ry="12"/><g class="ar-prompt-phone"><rect x="50" y="8" width="20" height="34" rx="4"/><line x1="57" y1="13" x2="63" y2="13"/></g></svg>
              <p>Move your phone slowly over the table.</p>
            </div>
          </model-viewer>` : '';

    content.innerHTML = `
      ${dish.has3d ? `<div class="dish-stage">
          ${MenvaLoader.markup(dish, modelViewer)}
          <button id="reset-view" class="reset-view" hidden aria-label="Reset the view">${resetIcon}</button>
          <div class="stage-actions">
            <button type="button" class="ar-btn" hidden>${arIcon} See it on your table</button>
            <p id="viewer-status" class="stage-status" role="status"></p>
            ${MenvaCaps.inApp ? `<p class="inapp-note">For the table view, open this page in Chrome or Safari. <button type="button" class="copy-link">Copy link</button></p>` : ''}
          </div>
        </div>` : ''}
      <section class="dish-detail">
        <p class="overline">${esc(activeRestaurant.name)} / ${esc(dish.category)}</p>
        <h2 id="dish-title">${esc(dish.name)}</h2>
        <p class="detail-price${dish.price_pkr == null ? ' fact-unconfirmed' : ''}">${esc(formatPrice(dish.price_pkr))}</p>
        ${dish.description ? `<p>${esc(dish.description)}</p>` : ''}
        ${dishFacts(dish)}
        <button class="back-menu">Back to menu ${arrow}</button>
      </section>
    `;

    content.querySelector('.back-menu').addEventListener('click', () => dialog.close());
    content.querySelector('.copy-link')?.addEventListener('click', copyLink);
    document.body.classList.add('modal-open');
    dialog.showModal();

    if (!dish.has3d) return;

    const viewer = document.getElementById('dish-viewer');
    const status = document.getElementById('viewer-status');
    const arButton = content.querySelector('.ar-btn');
    const resetBtn = document.getElementById('reset-view');
    const say = (text) => { status.textContent = text; };
    const spin = a.spin ? { url: a.spin, layout: a.spinLayout } : null;
    const openedAt = performance.now();
    let tier = null;
    const setTier = (t, reason) => {
      if (t === tier) return;
      tier = t;
      content.querySelector('.dish-stage').dataset.tier = t;
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

    const glbReady = MenvaViewer.download(glbUrl, a.glbBytes, bytes('glb')).then(() => true, () => false);
    try {
      await MenvaViewer.load(bytes('viewer')); // self-hosted, lazy: only when the first dish sheet opens
    } catch {
      return failed('viewer');
    }
    if (!(await glbReady)) return failed('download');
    if (!viewer.isConnected) return clearTimeout(slowTimer); // sheet closed while downloading

    // AR wiring goes on before src so no event is missed.
    MenvaViewer.setupAR(viewer, { usdz: MenvaViewer.absolute(a.usdz), dishId: dish.id, status, button: arButton });
    viewer.addEventListener('error', () => failed('model'), { once: true });
    viewer.addEventListener('load', () => {
      clearTimeout(slowTimer);
      MenvaTrack('model_loaded', { dish: dish.id, ms: Math.round(performance.now() - openedAt), bytes: a.glbBytes });
      // The tier is decided now — after model-viewer and the model have loaded, never on a timer.
      const t = MenvaCaps.assign(viewer);
      setTier(t);
      resetBtn.hidden = false;
      if (t <= 2) {
        arButton.hidden = false;
        say('Ready — see it on your table.');
        if (t === 1) MenvaViewer.prewarmQuickLook(MenvaViewer.absolute(a.usdz));
      } else {
        say(MenvaCaps.isMobile || MenvaCaps.inApp
          ? 'Drag to turn the dish · Pinch to zoom'
          : 'Drag to turn the dish. To see it on your table, open this menu on your phone.');
      }
    }, { once: true });
    viewer.src = glbUrl;

    resetBtn.addEventListener('click', () => {
      viewer.cameraOrbit = '-25deg 55deg 85%'; // matches the poster framing
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
        restaurantPage(r, tablePart || storedTable(r.id));
      }
    }

    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function navigate(path) {
    if (path === location.pathname) return;
    history.pushState(null, '', path);
    route();
  }

  function notFound(msg) {
    document.title = 'Not found — MENVA';
    document.body.dataset.theme = 'default';
    app.innerHTML = header(true) + `<main class="brand-page">
      <h1>${esc(msg)}</h1>
      <p>Scan the code on your table again, or ask your server for the menu link.</p>
      <a href="/" data-link class="product-action">Go to MENVA ${arrow}</a>
    </main>` + footer;
  }

  // Menu data could not be fetched (offline on first visit, or a server problem).
  function dataUnavailable() {
    document.title = 'MENVA';
    document.body.dataset.theme = 'default';
    app.innerHTML = header(false) + `<main class="brand-page">
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
