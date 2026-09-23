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
      <h1>See it.<br>Then <span>order it.</span></h1>
      <p>Scan the code on your table to see real dishes — then place them on your table in AR.</p>
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
    const menuHTML = r.categories.map(cat => {
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
      return `<section class="menu-category"><h3>${esc(cat)}</h3><div class="dish-grid">${dishes}</div></section>`;
    }).join('');

    const isGauchos = r.id === 'gauchos';
    const logoHTML = r.logo ? `<img src="${esc(r.logo)}" alt="${esc(r.name)}" class="restaurant-logo-svg" width="200" height="80">` : '';
    const coverBg = isGauchos ? 'background:linear-gradient(135deg,#1a1410,#2a1810)' : 'background:linear-gradient(135deg,var(--surface-offset),var(--stage))';
    const subtitle = r.showCheffy ? cheffy('wave', esc(r.menuSubtitle)) : `<span>${esc(r.menuSubtitle || '')}</span>`;
    const tableChip = table ? `<br><span class="table-chip">Table ${esc(table)}</span>` : '';

    app.innerHTML = header(false) + `<main class="restaurant-page${isGauchos ? ' gauchos-page' : ''}">
      <div class="restaurant-identity">
        <span>${esc(r.displayName || r.name)}</span>
        <p>${esc(r.area)}, ${esc(r.location)}${tableChip}</p>
      </div>
      <section class="restaurant-cover${isGauchos ? ' gauchos-cover' : ''}" style="${coverBg}">
        ${logoHTML}
        <div class="cover-copy">
          <span class="overline">${esc(r.area)} · ${esc(r.location.toUpperCase())}</span>
          <h1>${esc(r.displayName || r.name)}</h1>
          <p>${esc(r.tagline)}</p>
        </div>
      </section>
      <section class="menu-intro">
        <span class="restaurant-seal">${esc((r.displayName || r.name).charAt(0))}</span>
        <p>${esc(r.description)}</p>
        <div><p>${esc(r.cuisine)}<br>Menu · PKR</p></div>
      </section>
      <section class="menu-section">
        <div class="menu-heading"><h2>${esc(r.menuTitle || 'Menu')}</h2>${subtitle}</div>
        ${menuHTML}
      </section>
      <p class="menu-disclaimer">3D views are scans of the actual dishes served at ${esc(r.name)}. Allergen, halal and nutrition details come from the restaurant — where it says "${CONFIRM}", please ask before ordering.</p>
    </main>` + footer + `<dialog id="dish-dialog" aria-labelledby="dish-title"><button class="close-dialog" aria-label="Close">${closeIcon}</button><div id="dish-content"></div></dialog>`;

    app.querySelectorAll('[data-dish]').forEach(btn => {
      btn.addEventListener('click', () => openDish(r.dishes.find(d => d.id === btn.dataset.dish), btn));
    });

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
  async function openDish(dish, trigger) {
    lastTrigger = trigger;
    const dialog = app.querySelector('dialog');
    const content = app.querySelector('#dish-content');
    const a = dish.assets;

    content.innerHTML = `
      ${dish.has3d ? `<div class="dish-stage">
          <model-viewer id="dish-viewer" camera-controls touch-action="pan-y" camera-orbit="-25deg 55deg auto" shadow-intensity="1" shadow-softness="0.6" environment-image="neutral" interaction-prompt="auto" poster="${esc(a.poster)}" alt="${esc(dish.name)} — 3D scan" style="background-image:url('${a.blur}')">
            <button slot="ar-button" class="ar-btn">${arIcon} See it on your table</button>
          </model-viewer>
          <div class="viewer-tools">
            <span id="viewer-status" role="status">Loading the 3D view…</span>
            <button id="reset-view">${resetIcon} Reset</button>
          </div>
          <p class="stage-note">Drag to turn the dish · Pinch to zoom</p>
          <div class="ar-fallback" id="ar-fallback">
            <p><strong>AR isn't available on this phone.</strong><br>You can still turn the dish here.</p>
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
    document.body.classList.add('modal-open');
    dialog.showModal();

    if (!dish.has3d) return;

    const viewer = document.getElementById('dish-viewer');
    const status = document.getElementById('viewer-status');
    const resetBtn = document.getElementById('reset-view');
    const fallback = document.getElementById('ar-fallback');

    // Lazy-load model-viewer (self-hosted) on the first dish sheet
    try {
      await MenvaViewer.load();
    } catch {
      if (status) status.textContent = 'The 3D view could not load — check your connection and open the dish again.';
      return;
    }

    viewer.src = MenvaViewer.absolute(a.glb);
    viewer.iosSrc = MenvaViewer.absolute(a.usdz); // empty → model-viewer builds a USDZ on the fly
    viewer.ar = true;
    viewer.arModes = 'webxr scene-viewer quick-look';

    viewer.addEventListener('load', () => {
      viewer.style.backgroundImage = 'none'; // the blur placeholder would show around the transparent 3D view
      if (status) status.textContent = 'Ready — drag to turn the dish';
    });
    viewer.addEventListener('error', () => { if (status) status.textContent = 'The 3D view could not load — the picture above is the real dish.'; });

    resetBtn?.addEventListener('click', () => {
      viewer.cameraOrbit = '-25deg 55deg auto';
      viewer.fieldOfView = 'auto';
      viewer.jumpCameraToGoal?.();
    });

    // AR availability (replaced by the capability ladder in Phase 6)
    viewer.addEventListener('load', () => { if (viewer.canActivateAR === false) fallback?.classList.add('visible'); });
    viewer.addEventListener('ar-status', (e) => {
      if (e.detail.status === 'failed') fallback?.classList.add('visible');
    });
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
  }
  start();

  // Service worker: caches vendor/CSS/JS/dish assets after first fetch (see /sw.js).
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }
})();
