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
    let p = 0, model = 0, last = Date.now(), done = false, spinner = null, text = '', nudging = false;

    // Tier 5: the poster alone, sharp and still — nothing that looks like it's still loading.
    function still() {
      spinner?.remove();
      spinner = null;
      delete stage.dataset.spin;
      stage.dataset.state = 'still';
      stage.style.setProperty('--p', 1);
      line.hidden = true;
      slow.hidden = true;
    }

    // Tier 4: the 360° sprite replaces the stage (until the model arrives, if it's still coming).
    // If the sprite itself can't load, drop to the poster.
    function spin(message) {
      if (!spinner) spinner = window.MenvaSpin?.mount(stage, opts.spin, still);
      if (!spinner) { still(); return null; }
      stage.dataset.spin = '';
      slow.textContent = message || 'Slow connection — here it is in 360° meanwhile';
      slow.hidden = false;
      return spinner;
    }

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
      if (done || stage.dataset.state === 'still') return;
      done = true;
      line.hidden = false;
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

    // No progress for 4 s: keep the steam moving, never fake progress (reported once).
    // Stalled > 6 s below 40%: show the 360° sprite until the model arrives.
    let reported = false;
    const timer = setInterval(() => {
      if (done || !root.isConnected || stage.dataset.state === 'still') return clearInterval(timer);
      const idle = Date.now() - last;
      const downloading = p < 0.95; // after that it's parsing, not a network stall
      if (!reported && downloading && idle > 4000) { reported = true; opts.onStall?.(); }
      if (!spinner && opts.spin && model < 0.4 && idle > 6000 && spin()) opts.onFallback?.(4, 'stalled');
    }, 500);

    say(lineFor());
    viewer.addEventListener('load', served);
    if (viewer.loaded) served();
    // progress(v, m): v = all bytes 0–1 (drives the visuals, held below 1 until the model is on screen);
    // m = the model's own share, which decides whether a stall shows the 360° view.
    return {
      stage,
      progress: (v, m) => { model = m ?? v; set(Math.min(v, 0.99)); },
      // Tier 4 or 5 without (or instead of) the 3D. message is shown under the 360° view.
      fallback(tier, message) {
        if (tier === 4) { if (spin(message)) line.hidden = true; }
        else still();
      },
      get state() { return stage.dataset.state; },
    };
  }

  window.MenvaLoader = { markup, start };
})();
