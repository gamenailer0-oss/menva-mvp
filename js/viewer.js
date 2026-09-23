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

  window.MenvaViewer = {
    load,
    download,
    absolute,
    get isLoaded() { return defined; },
    MODEL_VIEWER_BYTES,
  };
})();
