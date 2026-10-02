/**
 * MENVA — "For restaurants" page (/for-restaurants).
 * window.MenvaForRestaurants.render(app, data, chrome) draws the whole page into #app.
 *   data   — the menu data (data/menu.json) or null; only the "Live examples" row and the hero
 *            photos read it, and the page still works without it.
 *   chrome — { header, footer }: the site header/footer markup, passed in by the router so this
 *            page wears the same chrome as every other page.
 * Everything owner-facing lives here; the diner home page carries none of it.
 * Copy rules: no prices, no invented numbers (the two studies are published, named and labelled),
 * no personal-data claims beyond what the product really does.
 */
(function () {
  'use strict';

  const PHONE_E164 = '923327270188';
  const PHONE_DISPLAY = '+92 332 7270188';
  const PILOT_MESSAGE = "Hi MENVA — I'd like a free pilot for my restaurant.";
  const WHATSAPP_URL = `https://wa.me/${PHONE_E164}?text=${encodeURIComponent(PILOT_MESSAGE)}`;

  // Order the examples appear in when the menu data carries no `homeOrder`.
  const DEFAULT_ORDER = ['haute-dolci', 'baraza', 'g'];
  // If the menu data could not be loaded the page still names the three live menus.
  const FALLBACK_RESTAURANTS = [
    { slug: 'haute-dolci', name: 'Haute Dolci', theme: 'haute-dolci' },
    { slug: 'baraza', name: 'Baraza Coffee', theme: 'baraza' },
    { slug: 'g', name: 'Gauchos', theme: 'gauchos' },
  ];

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const svg = (inner, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"${extra}>${inner}</svg>`;

  const ICON = {
    arrow: svg('<path d="M4 12h15M13 6l6 6-6 6"/>'),
    cube: svg('<path d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>'),
    brand: svg('<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 9h18M7 14h6M7 17h3"/>'),
    qr: svg('<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2.5v2.5M20 14v.01M14 20h.01M17 17h3v3h-3zM7 7h.01M17 7h.01M7 17h.01"/>'),
    chart: svg('<path d="M4 20V11M10 20V5M16 20v-6M3 20.5h18"/>'),
    card: svg('<path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/><path d="M4 13h16M8 6V4m8 2V4"/>'),
    tick: svg('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  };

  const FEATURES = [
    { icon: 'cube', title: 'Your dishes, scanned in 3D', text: 'Your signature dishes captured as real 3D scans, so guests see the dish you actually serve.' },
    { icon: 'brand', title: 'A menu page in your own brand', text: 'Your colours, your logo, your words. Guests land on a menu that looks like your restaurant.' },
    { icon: 'qr', title: 'Table QR codes', text: 'One for every table, ready to print. Guests scan and the menu opens in their phone’s browser.' },
    { icon: 'chart', title: 'A private results page', text: 'See which dishes guests view, how many place them in AR, and how many Table Cards are shared.' },
    { icon: 'card', title: 'Table Cards guests share', text: 'Guests share a branded Table Card of the dish they chose. Free posts with your name on them.' },
  ];

  const STEPS = [
    { when: 'Day 0', title: 'We scan 3–4 signature dishes', text: 'About an hour in your restaurant.' },
    { when: 'Days 1–7', title: 'QR codes go live on your tables', text: 'Guests start using your AR menu.' },
    { when: 'Day 8', title: 'We review the real numbers together', text: 'Views, AR placements and Table Cards shared.' },
  ];

  const GOOD_TO_KNOW = [
    { title: 'No app for guests', text: 'They scan the QR and the menu opens in their phone’s browser.' },
    { title: 'Your waiter still takes the order', text: 'No POS change and no online ordering. Guests simply show the waiter their list.' },
    { title: 'No personal data collected', text: 'No accounts, and nothing is uploaded from guests’ phones.' },
    { title: 'Halal and allergen details, as you confirm them', text: 'We show them only once you have confirmed them. Otherwise guests see “Please confirm with your server”.' },
  ];

  function orderedRestaurants(data) {
    const listed = (data?.restaurants || []).filter((r) => r.listed);
    if (!listed.length) return FALLBACK_RESTAURANTS;
    const rank = (r) => (typeof r.homeOrder === 'number' ? r.homeOrder : 100 + (DEFAULT_ORDER.indexOf(r.slug) >= 0 ? DEFAULT_ORDER.indexOf(r.slug) : DEFAULT_ORDER.length));
    return [...listed].sort((a, b) => rank(a) - rank(b));
  }

  // Hero mosaic: one real scanned dish from each live restaurant. Decorative — the caption names it.
  function heroPhotos(restaurants) {
    const tiles = restaurants.map((r) => {
      const dish = (r.dishes || []).find((d) => d.has3d && d.assets?.poster);
      return dish ? { r, dish } : null;
    }).filter(Boolean).slice(0, 3);
    if (tiles.length < 3) return '';
    return `<div class="fr-photos" aria-label="Real dishes scanned for MENVA menus">${tiles.map(({ r, dish }, i) => `
      <figure class="fr-photo fr-photo-${i + 1}" style="background-image:url('${dish.assets.blur || ''}')">
        <img src="${esc(dish.assets.poster)}" alt="" width="1200" height="900" decoding="async"${i === 0 ? ' fetchpriority="high"' : ' loading="lazy"'}>
        <figcaption><strong>${esc(dish.name)}</strong><span>${esc(r.displayName || r.name)}</span></figcaption>
      </figure>`).join('')}</div>`;
  }

  function examples(restaurants) {
    return `<ul class="fr-examples">${restaurants.map((r) => {
      const where = [r.cuisine, r.area || r.location].filter(Boolean).map(esc).join(' · ');
      return `<li><a class="fr-example" href="/${esc(r.slug)}" data-link>
        <span class="fr-example-dot" data-theme="${esc(r.theme || 'default')}" aria-hidden="true"></span>
        <span class="fr-example-copy"><span class="fr-example-name">${esc(r.name)}</span>${where ? `<span class="fr-example-where">${where}</span>` : ''}</span>
        <span class="fr-example-go">${ICON.arrow}</span>
      </a></li>`;
    }).join('')}</ul>`;
  }

  const head = (eyebrow, id, title) => `<header class="fr-head"><p class="overline">${eyebrow}</p><h2 id="${id}">${title}</h2></header>`;

  function render(app, data, chrome = {}) {
    const restaurants = orderedRestaurants(data);
    const wa = (label, cls = 'product-action') => `<a class="${cls}" href="${WHATSAPP_URL}" target="_blank" rel="noopener">${label} ${ICON.arrow}</a>`;

    app.innerHTML = (chrome.header || '') + `<main class="fr">
      <section class="fr-hero" aria-labelledby="fr-title">
        <div class="fr-hero-copy">
          <p class="overline">For restaurants</p>
          <h1 id="fr-title">Your dishes on every table — <em>before the order.</em></h1>
          <p class="fr-lede">MENVA is an AR menu. Guests scan the QR on their table and see your real dishes at true size, on their own table.</p>
          <p class="fr-lede">No app to install. It opens in the phone’s browser.</p>
          <div class="fr-actions">
            ${wa('Book a free pilot')}
            <a class="fr-link" href="/haute-dolci" data-link>See a live menu ${ICON.arrow}</a>
          </div>
          <p class="fr-note">Free for 7 days. No commitment.</p>
        </div>
        ${heroPhotos(restaurants)}
      </section>

      <section class="fr-sec" aria-labelledby="fr-proof-h">
        ${head('Published studies, not MENVA results', 'fr-proof-h', 'What the studies found')}
        <ul class="fr-proof">
          <li class="fr-card fr-stat"><p class="fr-stat-num">Up to 30%</p><p class="fr-stat-text">more sales for dishes once a photo is added</p><cite>Grubhub</cite></li>
          <li class="fr-card fr-stat"><p class="fr-stat-num">25%</p><p class="fr-stat-text">more dessert sales when guests viewed desserts in AR</p><cite>Kabaq × Bareburger study</cite></li>
        </ul>
        <p class="fr-fine">Figures come from published studies abroad. Your own numbers are what the pilot measures.</p>
      </section>

      <section class="fr-sec" aria-labelledby="fr-get-h">
        ${head('What you get', 'fr-get-h', 'Everything your restaurant needs to go live')}
        <ul class="fr-features">${FEATURES.map((f) => `<li class="fr-card fr-feature">
          <span class="fr-icon">${ICON[f.icon]}</span>
          <h3>${f.title}</h3>
          <p>${f.text}</p>
        </li>`).join('')}</ul>
      </section>

      <section class="fr-sec" aria-labelledby="fr-pilot-h">
        ${head('Free pilot', 'fr-pilot-h', 'How a pilot works')}
        <ol class="fr-steps">${STEPS.map((s) => `<li>
          <span class="fr-step-when">${s.when}</span>
          <h3>${s.title}</h3>
          <p>${s.text}</p>
        </li>`).join('')}</ol>
        <p class="fr-free">Free for 7 days — can run up to 30. No commitment.</p>
      </section>

      <section class="fr-sec" aria-labelledby="fr-live-h">
        ${head('Live examples', 'fr-live-h', 'See it on real menus')}
        ${examples(restaurants)}
      </section>

      <section class="fr-sec" aria-labelledby="fr-know-h">
        ${head('Good to know', 'fr-know-h', 'The honest details')}
        <ul class="fr-know">${GOOD_TO_KNOW.map((g) => `<li>
          <span class="fr-tick">${ICON.tick}</span>
          <div><h3>${g.title}</h3><p>${g.text}</p></div>
        </li>`).join('')}</ul>
      </section>

      <section class="fr-sec" aria-labelledby="fr-book-h">
        <div class="fr-cta">
          <div class="fr-cta-copy">
            <p class="overline">Free pilot</p>
            <h2 id="fr-book-h">See it on your own tables.</h2>
            <p>Message us on WhatsApp and we will plan the scan day with you.</p>
            <p class="fr-contact">Abdullah · MENVA · <a href="tel:+${PHONE_E164}">${PHONE_DISPLAY}</a></p>
          </div>
          ${wa('Book a free pilot')}
        </div>
      </section>
    </main>` + (chrome.footer || '');
  }

  window.MenvaForRestaurants = { render, whatsappUrl: WHATSAPP_URL };
})();
