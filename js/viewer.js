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
  async function download(url, size, onBytes) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: ${res.status}`);
    const total = size || (!res.headers.get('content-encoding') && +res.headers.get('content-length')) || 0;
    if (!res.body) { await res.arrayBuffer(); onBytes?.(total, total); return; }
    const reader = res.body.getReader();
    let loaded = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      loaded += value.length;
      onBytes?.(Math.min(loaded, total || loaded), total || loaded);
    }
    onBytes?.(total || loaded, total || loaded);
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
          ModelViewer.meshoptDecoderLocation = '/vendor/meshopt_decoder.module.js';
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

  const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  // ─── AR (CLAUDE.md §7) ─────────────────────────────────────────
  // Offered only after the model has loaded and the phone can do AR. True scale, locked (no pinch
  // in AR — model-viewer passes allowsContentScaling=0 to Quick Look and resizable=false to Scene
  // Viewer). Placed on the table with a contact shadow. Timings go to analytics.
  function setupAR(viewer, { usdz, dishId, status }) {
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

    viewer.addEventListener('load', () => {
      if (!viewer.canActivateAR) return;
      viewer.classList.add('ar-ready');
      say('Ready — see it on your table.');
      // iOS: warm the cache so Quick Look opens without a second download.
      if (isIOS() && usdz) fetch(usdz, { priority: 'low' }).catch(() => {});
    });

    viewer.querySelector('[slot="ar-button"]')?.addEventListener('click', () => {
      launchedAt = performance.now();
      track('ar_launch');
    }, true);

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
      }
    });

    // Quick Look and Scene Viewer leave the page; note when the diner comes back.
    const onVisible = () => {
      if (!viewer.isConnected) return document.removeEventListener('visibilitychange', onVisible);
      if (document.visibilityState === 'visible' && launchedAt && !inPageSession) {
        track('ar_exit', { duration_ms: since() });
        launchedAt = 0;
      }
    };
    document.addEventListener('visibilitychange', onVisible);
  }

  window.MenvaViewer = {
    load,
    download,
    absolute,
    setupAR,
    get isLoaded() { return defined; },
    MODEL_VIEWER_BYTES,
  };
})();
