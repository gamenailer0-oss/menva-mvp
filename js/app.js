/**
 * MENVA — Main Application
 * Hash-based SPA. Native <dialog> for dish modal. Lazy model-viewer.
 * touch-action: pan-y on all model-viewer elements.
 */
(function () {
  'use strict';

  const app = document.getElementById('app');
  const arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h15M13 6l6 6-6 6"/></svg>';
  const closeIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 6 12 12M18 6 6 18"/></svg>';
  const resetIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/></svg>';
  const arIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10M7 8h10M7 16h6"/></svg>';

  let activeRestaurant = null;
  let lastTrigger = null;
  let modelViewerLoaded = false;

  // ─── Footer ──────────────────────────────────────────────────
  const footer = `<footer><span>menva<span class="wordmark-dot">.</span></span><p>See it before you order it.</p><small>Independent listings · 3D scans provided by restaurants</small></footer>`;

  // ─── Header ──────────────────────────────────────────────────
  function header(back) {
    const nav = back
      ? `<a href="#/">${arrow} All restaurants</a>`
      : `<a href="#restaurants">Discover</a>`;
    return `<header class="topbar"><a class="wordmark" href="#/" aria-label="MENVA home">menva<span class="wordmark-dot">.</span></a><nav>${nav}<div class="theme-toggle-wrap"><button data-mode-toggle aria-label="Switch theme"><span class="toggle-icon"><svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg><svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 14A8.5 8.5 0 0 1 10 3.5 8.5 8.5 0 1 0 20.5 14Z"/></svg></span></button></div></nav></header>`;
  }

  // ─── Cheffy cameo ─────────────────────────────────────────────
  function cheffy(pose, text) {
    return `<div class="cheffy-cameo"><img src="assets/cheffy/${pose}.webp" alt="Cheffy" width="42" height="52"><p><span>Cheffy</span>${text}</p></div>`;
  }

  // ─── Product Hero ─────────────────────────────────────────────
  function productHero() {
    return `<section class="product-hero" aria-label="MENVA product demo">
      <div class="product-proposition">
        <h1 class="hero-enter">See it.<br>Then <span>order it.</span></h1>
        <p class="hero-enter hero-enter-delay-1">Good food shouldn't be a guessing game. Take a closer look before you make your choice.</p>
        <a class="product-action hero-enter hero-enter-delay-2" href="#/restaurant/gauchos">Explore Gauchos ${arrow}</a>
        <a class="product-action ar-hero-cta hero-enter hero-enter-delay-2" href="#/restaurant/gauchos">${arIcon} View dishes in AR</a>
        <div class="hero-cheffy hero-enter hero-enter-delay-3"><img src="assets/cheffy/wave.webp" alt="Cheffy" width="42" height="52"><span>A little curiosity.<br>A better choice.</span></div>
      </div>
      <div class="food-experience hero-enter hero-enter-delay-1" id="food-preview" tabindex="-1">
        <div class="food-canvas">
          <model-viewer id="hero-viewer" camera-controls touch-action="pan-y" camera-orbit="0deg 65deg 0.55m" shadow-intensity="0.8" environment-image="neutral" interaction-prompt="auto" alt="Interactive 3D preview of a premium ribeye steak">
            <span slot="poster" class="model-poster">Preparing your preview…</span>
          </model-viewer>
        </div>
        <div class="preview-bottom">
          <div><h2>Premium Ribeye Steak</h2><p id="hero-status" role="status">Loading interactive 3D…</p></div>
          <button class="preview-reset" aria-label="Reset view">${resetIcon}</button>
        </div>
      </div>
    </section>`;
  }

  async function setupHero() {
    const viewer = document.getElementById('hero-viewer');
    if (!viewer) return;
    const status = document.getElementById('hero-status');
    const reset = document.querySelector('.preview-reset');

    // Lazy-load model-viewer
    if (!modelViewerLoaded) {
      await import('https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js');
      modelViewerLoaded = true;
    }

    viewer.src = 'models/gauchos-steak-main.glb';
    viewer.addEventListener('load', () => { if (status) status.textContent = 'Drag to rotate. Scroll or pinch to zoom.'; });
    viewer.addEventListener('error', () => { if (status) status.textContent = '3D preview unavailable on this device.'; });

    if (reset) {
      reset.addEventListener('click', () => {
        viewer.cameraOrbit = '0deg 65deg 0.55m';
        viewer.fieldOfView = '30deg';
        viewer.jumpCameraToGoal?.();
      });
    }
  }

  // ─── Discovery View ───────────────────────────────────────────
  function discovery() {
    document.title = 'MENVA — See it before you order it';
    document.body.dataset.theme = 'default';

    const restaurants = MENVA_DATA.restaurants;
    const cards = restaurants.map((r, i) => {
      const pilot = r.pilot ? '<span class="listing-badge">Pilot restaurant · 3D scans available</span>' : '';
      const collage = r.pilot ? `assets/restaurant/lahore-collage.jpg` : '';
      const photoStyle = collage ? `background-image:url('${collage}');background-size:cover;background-position:center` : 'background:linear-gradient(135deg,var(--surface-offset),var(--stage))';
      return `<a class="restaurant-card" href="#/restaurant/${r.id}" aria-label="Explore ${r.name}">
        <div class="restaurant-photo" style="${photoStyle};display:flex;align-items:flex-end">
          <span class="photo-caption">${r.location}</span>
          <span class="round-arrow">${arrow}</span>
        </div>
        <div class="restaurant-info">
          ${pilot}
          <h2>${r.name}</h2>
          <p>${r.cuisine} · ${r.area}, ${r.location}</p>
        </div>
      </a>`;
    }).join('');

    app.innerHTML = header() + `<main class="discovery">
      ${productHero()}
      <section id="restaurants" aria-label="Restaurant discovery" class="reveal">
        <div class="collection-heading">
          <h2>At the table.</h2>
          <span>Independent dining directory · Pilot restaurants feature real 3D dish scans</span>
        </div>
        <div class="restaurant-grid reveal-stagger">${cards}</div>
      </section>
    </main>` + footer;

    setupHero();
  }

  // ─── Restaurant Page ──────────────────────────────────────────
  function restaurantPage(r) {
    activeRestaurant = r;
    document.title = `${r.name} — MENVA`;
    document.body.dataset.theme = r.theme || 'default';

    // Group dishes by category
    const categories = [...new Set(r.dishes.map(d => d.category))];
    const menuHTML = categories.map(cat => {
      const items = r.dishes.filter(d => d.category === cat);
      if (!items.length) return '';
      const dishes = items.map(d => {
        const hasModel = Boolean(d.glb);
        const badge = hasModel
          ? `<span>3D Scan ${arrow}</span>`
          : `<span>View ${arrow}</span>`;
        if (hasModel) {
          const dishPhoto = d.id === 'steak-sandwich' ? 'assets/dishes/steak-sandwich.jpg' : d.id === 'steak-main' ? 'assets/dishes/ribeye-steak.jpg' : '';
          const photoBg = dishPhoto ? `style="background-image:url('${dishPhoto}');background-size:cover;background-position:center"` : 'style="background:linear-gradient(135deg,var(--surface-offset),var(--stage))"';
          return `<button class="dish-card" data-preview="true" data-dish="${d.id}" aria-label="Explore ${d.name}">
            <div class="dish-photo" ${photoBg}>${badge}</div>
            <div class="dish-line">
              <h4>${d.name}</h4>
              <span>${formatPrice(d.price)}</span>
            </div>
            <p>${d.description}</p>
          </button>`;
        } else {
          return `<button class="dish-row" data-preview="false" data-dish="${d.id}" aria-label="Explore ${d.name}">
            <div class="dish-line">
              <h4>${d.name}</h4>
              <span>${formatPrice(d.price)}</span>
            </div>
            <p>${d.description}</p>
          </button>`;
        }
      }).join('');
      return `<section class="menu-category"><h3>${cat}</h3><div class="dish-grid">${dishes}</div></section>`;
    }).join('');

    // Published menu (real data)
    const publishedMenu = r.id === 'gauchos' ? renderPublishedMenu(GAUCHOS_FULL_MENU) : '';

    const isGauchos = r.id === 'gauchos';
    const logoHTML = isGauchos ? '<img src="assets/restaurant/gauchos-logo.svg" alt="Gauchos Steak House" class="restaurant-logo-svg">' : '';
    const coverBg = isGauchos ? 'background:linear-gradient(135deg,#1a1410,#2a1810)' : 'background:linear-gradient(135deg,var(--surface-offset),var(--stage))';
    const taglineText = isGauchos ? 'Argentine-inspired · Oakwood-smoked · Lahore' : r.tagline;
    const menuTitle = isGauchos ? 'The Cuts' : 'At the table';
    const menuSubtitle = isGauchos ? 'Asado · Parrilla · Scan-ready dishes' : 'Choose a dish for a closer look';

    app.innerHTML = header(true) + `<main class="restaurant-page${isGauchos ? ' gauchos-page' : ''}">
      <div class="restaurant-identity">
        <span>${r.displayName || r.name}</span>
        <p>${r.pilot ? 'Pilot restaurant · 3D scans' : 'Independent listing'}<br>${r.area}, ${r.location}</p>
      </div>
      <section class="restaurant-cover${isGauchos ? ' gauchos-cover' : ''}" style="${coverBg}">
        ${logoHTML}
        <div class="cover-copy">
          <span class="overline">${r.area} · ${r.location.toUpperCase()}</span>
          <h1>${r.displayName || r.name}</h1>
          <p>${taglineText}</p>
        </div>
      </section>
      <section class="menu-intro">
        <span class="restaurant-seal">${(r.displayName || r.name).charAt(0)}</span>
        <p>${r.description}</p>
        <div><p>${r.cuisine}<br>Menu · PKR</p></div>
      </section>
      <section class="menu-section">
        <div class="menu-heading"><h2>${menuTitle}</h2>${cheffy('wave', menuSubtitle)}</div>
        ${menuHTML}
      </section>
      ${publishedMenu}
      <p class="menu-disclaimer">3D scans are of the actual dishes served at ${r.name}. Nutritional information is approximate and based on standard preparations. Please confirm ingredients and allergens with the restaurant before ordering.</p>
    </main>` + footer + `<dialog id="dish-dialog" aria-labelledby="dish-title"><button class="close-dialog" aria-label="Close">${closeIcon}</button><div id="dish-content"></div></dialog>`;

    // Attach dish card listeners
    app.querySelectorAll('[data-dish]').forEach(btn => {
      btn.addEventListener('click', () => openDish(findDish(r, btn.dataset.dish), btn));
    });

    // Dialog setup
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

  // ─── Published Menu (real restaurant data with search) ─────────
  function renderPublishedMenu(menu) {
    return `<section class="published-menu">
      <h2>Full menu</h2>
      <p><a href="${menu.source}" target="_blank" rel="noopener">${menu.sourceLabel}</a> · Retrieved ${menu.retrieved} · ${menu.items.length} dishes</p>
      <p>${menu.notice}</p>
      <div class="published-controls">
        <label>Find a dish<input type="search" id="pub-search" aria-label="Search dishes" placeholder="Dish name"></label>
        <label>Category<select id="pub-category" aria-label="Filter by category"><option value="">All categories</option>${[...new Set(menu.items.map(x => x.category))].map(c => `<option>${c}</option>`).join('')}</select></label>
      </div>
      <div class="published-results" id="pub-results"></div>
    </section>`;
  }

  function setupPublishedMenu(menu) {
    const search = document.getElementById('pub-search');
    const category = document.getElementById('pub-category');
    const results = document.getElementById('pub-results');
    if (!search || !results) return;

    function update() {
      const q = search.value.trim().toLowerCase();
      const cat = category.value;
      const items = menu.items.filter(x => (!cat || x.category === cat) && `${x.name} ${x.description}`.toLowerCase().includes(q));
      results.innerHTML = items.length ? [...new Set(items.map(x => x.category))].map(c => {
        const catItems = items.filter(x => x.category === c);
        return `<section class="published-category"><h3>${c}</h3>${catItems.map(x => `<article class="published-item"><div><h4>${x.name}</h4><p>${x.description}</p></div><span>${formatPrice(x.price)}</span></article>`).join('')}</section>`;
      }).join('') : '<p style="color:var(--muted);font-size:var(--text-sm);padding:16px 0">No dishes match your search.</p>';
    }
    search.addEventListener('input', update);
    category.addEventListener('change', update);
    update();
  }

  // ─── Dish Modal ──────────────────────────────────────────────
  async function openDish(dish, trigger) {
    lastTrigger = trigger;
    const dialog = app.querySelector('dialog');
    const content = app.querySelector('#dish-content');
    const hasModel = Boolean(dish.glb);

    // Build nutrition grid
    const n = dish.nutrition || {};
    const nutritionHTML = n.calories ? `
      <h3>Nutrition</h3>
      <div class="nutrition-grid">
        <div class="nutrition-item"><div class="value">${n.calories}</div><div class="label">kcal</div></div>
        <div class="nutrition-item"><div class="value">${n.protein || '—'}</div><div class="label">Protein</div></div>
        <div class="nutrition-item"><div class="value">${n.fat || '—'}</div><div class="label">Fat</div></div>
        <div class="nutrition-item"><div class="value">${n.carbs || '—'}</div><div class="label">Carbs</div></div>
      </div>
      <div class="nutrition-meta">
        ${n.serving ? `<span><strong>Serving:</strong> ${n.serving}</span>` : ''}
        ${n.cut ? `<span><strong>Cut:</strong> ${n.cut}</span>` : ''}
        ${n.weight ? `<span><strong>Weight:</strong> ${n.weight}</span>` : ''}
      </div>
    ` : '';

    content.innerHTML = `
      <div class="dish-stage">
        ${hasModel ? `
          <model-viewer id="dish-viewer" camera-controls touch-action="pan-y" camera-orbit="0deg 65deg 0.4m" shadow-intensity="0.8" environment-image="neutral" interaction-prompt="auto" alt="${dish.name} — 3D scan">
            <span slot="poster" class="model-poster">Preparing your dish…</span>
            ${dish.usdz ? `<button slot="ar-button" class="ar-btn">${arIcon} View in AR</button>` : ''}
          </model-viewer>
          <div class="viewer-tools">
            <span id="viewer-status" role="status">Loading 3D scan…</span>
            <button id="reset-view">${resetIcon} Reset</button>
          </div>
          <p class="stage-note">Drag to rotate · Pinch or scroll to zoom · Tap "View in AR" to see it on your table</p>
          <div class="ar-fallback" id="ar-fallback">
            <p><strong>AR isn't available on this device.</strong><br>Explore the dish in 3D above — rotate, zoom, and inspect every detail.</p>
          </div>
        ` : `
          <div class="dish-photo" style="height:460px;display:grid;place-items:center;background:var(--stage)"><p style="color:var(--muted);font-size:var(--text-sm)">3D scan not yet available for this dish</p></div>
          <p class="stage-note">A restaurant-owned 3D scan is needed for this dish.</p>
        `}
      </div>
      <section class="dish-detail">
        <p class="overline">${activeRestaurant.name} / ${dish.category}</p>
        <h2 id="dish-title">${dish.name}</h2>
        <p class="detail-price">${formatPrice(dish.price)}</p>
        <p>${dish.description}</p>
        ${nutritionHTML}
        <h3>Dish details</h3>
        <div class="nutrition-meta">
          ${dish.tags?.map(t => `<span><strong>${t}</strong></span>`).join('') || ''}
        </div>
        ${dish.scanNote ? `<div class="sample-note">${dish.scanNote}</div>` : ''}
        ${cheffy('thinking', hasModel ? 'Take a closer look. Drag to turn the dish.' : 'A closer look at what goes into your dish.')}
        <button class="back-menu">Back to menu ${arrow}</button>
      </section>
    `;

    content.querySelector('.back-menu').addEventListener('click', () => dialog.close());
    document.body.classList.add('modal-open');
    dialog.showModal();

    if (!hasModel) return;

    // Setup 3D viewer
    const viewer = document.getElementById('dish-viewer');
    const status = document.getElementById('viewer-status');
    const resetBtn = document.getElementById('reset-view');
    const fallback = document.getElementById('ar-fallback');

    // Lazy-load model-viewer
    if (!modelViewerLoaded) {
      await import('https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js');
      modelViewerLoaded = true;
    }

    viewer.src = dish.glb;
    viewer.iosSrc = dish.usdz || '';
    viewer.ar = true;
    viewer.arModes = 'webxr scene-viewer quick-look';

    viewer.addEventListener('load', () => { if (status) status.textContent = '3D scan ready — drag to rotate'; });
    viewer.addEventListener('error', () => { if (status) status.textContent = '3D could not load'; });

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        viewer.cameraOrbit = '0deg 65deg 0.4m';
        viewer.fieldOfView = '30deg';
        viewer.jumpCameraToGoal?.();
      });
    }

    // AR availability check
    function checkAR() {
      if (viewer.canActivateAR === false) {
        if (fallback) fallback.classList.add('visible');
      }
    }
    setTimeout(checkAR, 1500);
    viewer.addEventListener('load', () => setTimeout(checkAR, 500));
    viewer.addEventListener('ar-status', (e) => {
      if (e.detail.status === 'failed' || e.detail.status === 'not-features-on') {
        if (fallback) fallback.classList.add('visible');
      }
    });
  }

  // ─── Router ───────────────────────────────────────────────────
  function route() {
    const hash = location.hash.replace(/^#/, '') || '/';
    const parts = hash.split('/').filter(Boolean);

    if (parts.length === 0) {
      discovery();
    } else if (parts.length >= 2 && parts[0] === 'restaurant') {
      const r = findRestaurant(parts[1]);
      if (r) {
        restaurantPage(r);
        if (r.id === 'gauchos') {
          setTimeout(() => setupPublishedMenu(GAUCHOS_FULL_MENU), 100);
        }
      } else {
        notFound('Restaurant not found');
      }
    } else {
      notFound('Page not found');
    }

    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function notFound(msg) {
    document.body.dataset.theme = 'default';
    app.innerHTML = header() + `<main style="max-width:600px;margin:0 auto;padding:80px 6%;text-align:center">
      <h1 style="font-size:var(--text-2xl)">${msg}</h1>
      <p style="color:var(--muted);margin:16px 0 32px">Let's get you back on track.</p>
      <a href="#/" class="product-action" style="display:inline-flex">Back to MENVA ${arrow}</a>
    </main>` + footer;
  }

  // ─── Scroll Reveal ───────────────────────────────────────────
  let revealObserver = null;
  function setupScrollReveal() {
    if (revealObserver) revealObserver.disconnect();
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.reveal, .reveal-stagger').forEach(el => {
      el.classList.remove('visible');
      revealObserver.observe(el);
    });
  }

  // ─── Init ────────────────────────────────────────────────────
  window.addEventListener('hashchange', () => {
    if (['#restaurants', '#food-preview'].includes(location.hash)) return;
    route();
    setTimeout(setupScrollReveal, 100);
  });

  route();
  setTimeout(setupScrollReveal, 200);
})();
