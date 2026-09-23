/**
 * MENVA — model-viewer setup.
 * Loads the self-hosted model-viewer only when the first dish sheet opens, and
 * points every decoder it might need at /vendor so nothing hits a third-party origin.
 */
(function () {
  'use strict';

  // Keep ?v= in sync with @google/model-viewer in package.json (scripts/vendor.mjs checks it).
  // /vendor is cached as immutable, so the version in the URL is what busts the cache.
  const MODEL_VIEWER_SRC = '/vendor/model-viewer.min.js?v=4.3.1';

  let ready = null;

  function load() {
    if (ready) return ready;
    ready = new Promise((resolve, reject) => {
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
          resolve(ModelViewer);
        });
      };
      script.onerror = () => {
        ready = null; // allow a retry on the next dish open
        script.remove();
        reject(new Error('model-viewer failed to load'));
      };
      document.head.append(script);
    });
    return ready;
  }

  // Scene Viewer fetches the model itself, so model URLs must be absolute.
  function absolute(path) {
    return path ? new URL(path, location.origin).href : '';
  }

  window.MenvaViewer = { load, absolute };
})();
