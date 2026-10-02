/**
 * MENVA — model-viewer setup.
 * Loads the self-hosted model-viewer only when the first dish sheet opens, and
 * points every decoder it might need at /vendor so nothing hits a third-party origin.
 *
 * Downloads report real bytes (see download()). The files are then handed to model-viewer by
 * URL and come straight from the HTTP / service-worker cache, so nothing downloads twice.
 */
(function () {
  'use strict';

  // Keep ?v= and the byte size in sync with vendor/ (scripts/vendor.mjs checks both).
  // /vendor is cached as immutable, so the version in the URL is what busts the cache.
  const MODEL_VIEWER_SRC = '/vendor/model-viewer.min.js?v=4.3.1';
  const MODEL_VIEWER_BYTES = 1068903;

  let ready = null;
  let defined = false;

  // Fetch a file to warm the cache, reporting (loadedBytes, totalBytes). `size` is the known
  // uncompressed size — Content-Length is the compressed size when the host gzips.
  // signal: an AbortSignal — the dish sheet cancels its model download when the diner closes it.
  // keep: also return the bytes as a Blob (used to hand Quick Look a file it doesn't have to download).
  async function download(url, size, onBytes, signal, keep = false) {
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`${url}: ${res.status}`);
    const type = res.headers.get('content-type') || '';
    const total = size || (!res.headers.get('content-encoding') && +res.headers.get('content-length')) || 0;
    if (!res.body) {
      const buf = await res.arrayBuffer();
      onBytes?.(total, total);
      return keep ? new Blob([buf], { type }) : undefined;
    }
    const reader = res.body.getReader();
    const throttle = window.MenvaCaps?.slow; // ?slow=1: ~1 Mbps, for demos and testing
    const chunks = [];
    let loaded = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (throttle) await new Promise((r) => setTimeout(r, value.length / 128));
      if (keep) chunks.push(value);
      loaded += value.length;
      onBytes?.(Math.min(loaded, total || loaded), total || loaded);
    }
    onBytes?.(total || loaded, total || loaded);
    return keep ? new Blob(chunks, { type }) : undefined;
  }

  function inject() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = MODEL_VIEWER_SRC;
      script.onload = () => {
        customElements.whenDefined('model-viewer').then(() => {
          const ModelViewer = customElements.get('model-viewer');
          ModelViewer.dracoDecoderLocation = '/vendor/draco/';
          ModelViewer.ktx2TranscoderLocation = '/vendor/basis/';
          // meshoptDecoderLocation is left unset on purpose: our models use Draco, and setting it makes
          // model-viewer load the decoder at once (as a classic script, which breaks on three's module build).
          ModelViewer.lottieLoaderLocation = '/vendor/lottie_canvas.module.js';
          defined = true;
          resolve(ModelViewer);
        });
      };
      script.onerror = () => { script.remove(); reject(new Error('model-viewer failed to load')); };
      document.head.append(script);
    });
  }

  // onBytes is called while the script downloads (first dish only).
  function load(onBytes) {
    if (ready) return ready;
    ready = download(MODEL_VIEWER_SRC, MODEL_VIEWER_BYTES, onBytes)
      .catch(() => {}) // the script tag below is the real load; the fetch only measures progress
      .then(inject)
      .catch((err) => { ready = null; throw err; }); // allow a retry on the next dish open
    return ready;
  }

  // Scene Viewer fetches the model itself, so model URLs must be absolute.
  function absolute(path) {
    return path ? new URL(path, location.origin).href : '';
  }

  // ─── AR (CLAUDE.md §7) ─────────────────────────────────────────
  // True scale, locked (no pinch in AR — model-viewer passes allowsContentScaling=0 to Quick Look
  // and resizable=false to Scene Viewer), placed on the table with a contact shadow. `button` is our
  // own "See it on your table" button, outside model-viewer, so the capability tier alone decides
  // whether it shows (js/app.js). Timings go to analytics.
  function setupAR(viewer, { usdz, dishId, status, button, onExit }) {
    const track = (event, props) => window.MenvaTrack?.(event, { dish: dishId, ...props });
    const say = (text) => { if (status) status.textContent = text; };
    const prompt = viewer.querySelector('.ar-prompt p');
    let launchedAt = 0, surfaceTimer = 0;

    viewer.setAttribute('ar', '');
    viewer.setAttribute('ar-modes', 'webxr scene-viewer quick-look');
    viewer.setAttribute('ar-scale', 'fixed');
    viewer.setAttribute('ar-placement', 'floor');
    viewer.setAttribute('xr-environment', '');
    if (usdz) viewer.setAttribute('ios-src', usdz); // otherwise model-viewer builds one on the fly

    button?.addEventListener('click', () => {
      launchedAt = performance.now();
      track('ar_launch');
      viewer.activateAR(); // synchronous in the tap, so Quick Look / Scene Viewer keep the user gesture
    });

    const since = () => Math.round(performance.now() - launchedAt);
    let inPageSession = false; // WebXR stays in the page; Quick Look / Scene Viewer leave it
    viewer.addEventListener('ar-status', (e) => {
      const s = e.detail.status;
      if (s === 'session-started') {
        inPageSession = true;
        track('ar_session_started', { ms: since() });
        clearTimeout(surfaceTimer);
        surfaceTimer = setTimeout(() => {
          if (prompt) prompt.textContent = 'Try over the tablecloth or a napkin — patterned surfaces work best.';
        }, 5000);
      } else if (s === 'object-placed') {
        clearTimeout(surfaceTimer);
        navigator.vibrate?.(12);
        track('ar_object_placed', { ms: since() });
      } else if (s === 'failed') {
        clearTimeout(surfaceTimer);
        say("AR couldn't start on this phone — you can still turn the dish here.");
        track('ar_failed');
      } else if (s === 'not-presenting' && launchedAt) {
        clearTimeout(surfaceTimer);
        if (prompt) prompt.textContent = 'Move your phone slowly over the table.';
        track('ar_exit', { duration_ms: since() });
        launchedAt = 0;
        inPageSession = false;
        onExit?.();
      }
    });

    // Quick Look and Scene Viewer leave the page; note when the diner comes back.
    const onVisible = () => {
      if (!viewer.isConnected) return document.removeEventListener('visibilitychange', onVisible);
      if (document.visibilityState === 'visible' && launchedAt && !inPageSession) {
        track('ar_exit', { duration_ms: since() });
        launchedAt = 0;
        onExit?.();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
  }

  // iOS: after the GLB has loaded, download the USDZ into memory and hand Quick Look a blob: URL
  // (the same hand-off model-viewer uses for USDZ files it generates). Quick Look then opens from
  // memory on the very first tap instead of starting its own download and sitting on a spinner.
  // Prepared files are kept for the session, so reopening a dish is instant.
  const quickLookFiles = new Map();
  async function prepareQuickLook(viewer, usdz, size, onBytes, signal) {
    if (!usdz) return false;
    if (!quickLookFiles.has(usdz)) {
      const blob = await download(usdz, size, onBytes, signal, true);
      quickLookFiles.set(usdz, URL.createObjectURL(new Blob([blob], { type: 'model/vnd.usdz+zip' })));
    } else {
      onBytes?.(1, 1);
    }
    viewer.iosSrc = quickLookFiles.get(usdz);
    return true;
  }

  // ─── "It's not a picture": the dish turns by itself ──────────────
  // From the dish's own best angle, about one turn every 12 s (model-viewer's auto-rotate, 30deg/s),
  // until the diner touches it. Their hands win at once; after ~5 s without a touch it turns again.
  // Never under prefers-reduced-motion. start() once the live 3D is on screen; resume() = back to the
  // dish's own angle (the reset button). onTouch fires on the diner's first touch.
  function autoTurn(viewer, { idleMs = 5000, onTouch } = {}) {
    const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
    let timer = 0, held = false, live = false;
    const turn = (on) => { if (viewer.isConnected) viewer.autoRotate = on; };
    const later = () => { clearTimeout(timer); timer = setTimeout(() => { if (live && !held && !reduced()) turn(true); }, idleMs); };
    const touched = () => { turn(false); onTouch?.(); };

    viewer.addEventListener('pointerdown', () => {
      held = true;
      clearTimeout(timer);
      touched();
      const release = () => { held = false; later(); };
      window.addEventListener('pointerup', release, { once: true });
      window.addEventListener('pointercancel', release, { once: true });
    });
    // Wheel, keyboard and pinch also arrive as camera changes from the diner.
    viewer.addEventListener('camera-change', (e) => {
      if (e.detail?.source !== 'user-interaction') return;
      touched();
      if (!held) later();
    });
    const hide = () => { if (!viewer.isConnected) return document.removeEventListener('visibilitychange', hide); if (document.hidden) { clearTimeout(timer); turn(false); } else if (live && !held && !reduced()) later(); };
    document.addEventListener('visibilitychange', hide);

    return {
      start() { live = true; if (!reduced()) turn(true); },
      resume() { clearTimeout(timer); held = false; if (live && !reduced()) turn(true); },
    };
  }

  // One-time "Drag to turn" hint: a finger glides across the stage, then fades. First 3D dish of a
  // visit only (sessionStorage; if that is blocked it shows once per sheet open at worst — never nags).
  // Under reduced motion it stays still and simply fades. Returns { dismiss } or null if already shown.
  const HINT_KEY = 'menva.turnHint';
  function dragHint(stage) {
    try { if (sessionStorage.getItem(HINT_KEY)) return null; sessionStorage.setItem(HINT_KEY, '1'); } catch {}
    if (!stage?.isConnected) return null;
    const el = document.createElement('div');
    el.className = 'turn-hint';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<span class="turn-hint-hand"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12.5V5.5a1.6 1.6 0 0 1 3.2 0v5l3.1.6a2.4 2.4 0 0 1 1.9 2.8l-.7 3.6A4 4 0 0 1 12.6 21H11a4.5 4.5 0 0 1-3.4-1.6L4.3 15.6a1.5 1.5 0 0 1 2.3-1.9Z"/></svg></span><span class="turn-hint-text">Drag to turn</span>';
    stage.append(el);
    const gone = () => el.remove();
    el.addEventListener('animationend', (e) => { if (e.animationName === 'turn-hint-out') gone(); });
    setTimeout(gone, 6000); // safety net where animations don't run
    return { dismiss() { el.classList.add('is-done'); setTimeout(gone, 250); } };
  }

  window.MenvaViewer = {
    autoTurn,
    dragHint,
    load,
    download,
    absolute,
    setupAR,
    prepareQuickLook,
    get isLoaded() { return defined; },
    MODEL_VIEWER_BYTES,
  };
})();
