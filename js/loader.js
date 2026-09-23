/**
 * MENVA — "The Pass": the dish comes into focus as its 3D model downloads (CLAUDE.md §6).
 * Progress is honest and monotonic: it only moves with real downloaded bytes. (model-viewer's own
 * progress event averages the model with its instant lighting setup, so it starts at 50%.)
 */
(function () {
  'use strict';

  const GENERIC = [
    { until: 33, text: 'Warming the plates' },
    { until: 66, text: 'Plating your dish' },
    { until: 100, text: 'Adding the final touch' },
    { loaded: true, text: 'Served.' },
  ];
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wisp = (x) => `<path pathLength="1" d="M${x} 38c-4-5 4-9 0-14s4-9 0-14"/>`;

  // Stage markup. `inner` is the <model-viewer> element (kept hidden until the model is served).
  function markup(dish, inner) {
    const a = dish.assets;
    return `<div class="pass" data-state="loading" style="--p:0;--r:0">
        <div class="pass-focus"><img class="pass-blur" src="${a.blur}" alt=""><img class="pass-poster" src="${a.poster}" alt="" decoding="async"></div>
        <svg class="pass-rim" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" pathLength="1"/></svg>
        <svg class="pass-steam" viewBox="0 0 60 40" aria-hidden="true">${wisp(20)}${wisp(30)}${wisp(40)}</svg>
        ${inner}
      </div>
      <p class="pass-line" aria-live="polite"></p>
      <p class="pass-slow" hidden>Slow connection — here it is in 360° meanwhile</p>`;
  }

  // Wire a stage to its model-viewer. opts: { lines, spin: { url, layout } }
  function start(root, viewer, opts) {
    const stage = root.querySelector('.pass');
    const line = root.querySelector('.pass-line');
    const slow = root.querySelector('.pass-slow');
    const poster = stage.querySelector('.pass-poster');
    const lines = opts.lines?.length ? opts.lines : GENERIC;
    // The 360° sprite replaces the stage (tier 4) until the model arrives.
    const spin = () => { spinner ??= window.MenvaSpin?.mount(stage, opts.spin); if (spinner) stage.dataset.spin = ''; return spinner; };
    let p = 0, model = 0, last = Date.now(), done = false, spinner = null, text = '', nudging = false;

    const showPoster = () => poster.classList.add('ready');
    poster.complete && poster.naturalWidth ? showPoster() : poster.addEventListener('load', showPoster, { once: true });

    function say(t) {
      if (t === text) return;
      text = t;
      line.classList.add('swap');
      setTimeout(() => { line.textContent = t; line.classList.remove('swap'); }, reduced() ? 0 : 180);
    }
    const lineFor = () => (done ? lines.find((l) => l.loaded) : lines.find((l) => !l.loaded && p * 100 < l.until) || lines.filter((l) => !l.loaded).pop()).text;

    function set(v) {
      if (v <= p) return; // never go backwards
      p = v;
      last = Date.now();
      stage.style.setProperty('--r', p);
      stage.style.setProperty('--p', reduced() ? Math.floor(p * 3) / 3 : p); // reduced motion: focus in 3 steps
      if (!nudging) say(lineFor());
    }

    function served() {
      if (done) return;
      done = true;
      set(1);
      say(lineFor());
      stage.dataset.state = 'served';
      spinner?.remove();
      delete stage.dataset.spin;
      slow.hidden = true;
      setTimeout(() => { stage.dataset.state = 'live'; opts.onLive?.(); }, 500);
    }

    // Tap while loading: never a dead tap.
    stage.addEventListener('click', () => {
      if (done || nudging) return;
      nudging = true;
      stage.classList.add('nudge');
      say('Almost ready');
      setTimeout(() => { nudging = false; stage.classList.remove('nudge'); say(lineFor()); }, 1200);
    });

    // Stalled > 6 s below 40%: show the 360° sprite until the model arrives.
    const timer = setInterval(() => {
      if (done || !root.isConnected) return clearInterval(timer);
      if (!spinner && opts.spin && model < 0.4 && Date.now() - last > 6000) {
        slow.hidden = !spin();
      }
    }, 500);

    say(lineFor());
    viewer.addEventListener('load', served);
    if (viewer.loaded) served();
    // progress(v, m): v = all bytes 0–1 (drives the visuals, held below 1 until the model is on screen);
    // m = the model's own share, which decides whether a stall shows the 360° view.
    return {
      stage,
      progress: (v, m) => { model = m ?? v; set(Math.min(v, 0.99)); },
      showSpinner: spin,
    };
  }

  window.MenvaLoader = { markup, start };
})();
