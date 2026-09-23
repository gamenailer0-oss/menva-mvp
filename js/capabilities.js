/**
 * MENVA — capability ladder (CLAUDE.md Phase 6). Every device gets the best experience it can run:
 *   1 Quick Look AR (iOS) · 2 WebXR / Scene Viewer AR (Android) · 3 in-page 3D · 4 360° sprite · 5 poster
 * The poster is always the first paint. AR tiers are assigned only after model-viewer has loaded the
 * model and reports canActivateAR — never on a timer.
 * Debug: ?tier=1..5 forces a tier; ?slow=1 throttles model downloads to ~1 Mbps.
 */
(function () {
  'use strict';

  const params = new URLSearchParams(location.search);
  const forced = /^[1-5]$/.test(params.get('tier') || '') ? Number(params.get('tier')) : null;
  const slow = params.get('slow') === '1';
  const ua = navigator.userAgent;

  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const isMobile = isIOS || isAndroid || matchMedia('(pointer: coarse)').matches;
  // In-app browsers can't launch AR reliably (no Quick Look / Scene Viewer handoff).
  const inApp = /Instagram|FBAN|FBAV|FB_IAB|FBIOS|TikTok|musical_ly|Bytedance|Snapchat|Line\/|WhatsApp/i.test(ua);
  const lowMemory = typeof navigator.deviceMemory === 'number' && navigator.deviceMemory <= 2;

  // Creating a WebGL context is expensive, so it's probed once, after the sheet has painted, and
  // released straight away (phones allow only a handful of live contexts).
  let webglCache = null;
  function webgl() {
    if (webglCache === null) {
      try {
        const c = document.createElement('canvas');
        const gl = c.getContext('webgl2') || c.getContext('webgl');
        webglCache = !!gl;
        gl?.getExtension('WEBGL_lose_context')?.loseContext();
      } catch { webglCache = false; }
    }
    return webglCache;
  }

  // Before any 3D download: devices that shouldn't even try get tier 4 (or 5 without a sprite).
  function preflight(hasSpin) {
    const fallback = hasSpin ? 4 : 5;
    if (forced === 4 || forced === 5) return forced === 4 && !hasSpin ? 5 : forced;
    if (forced) return null;
    if (!webgl() || lowMemory) return fallback;
    return null;
  }

  // After the model has loaded.
  function assign(viewer) {
    if (forced && forced <= 3) return forced;
    if (inApp) return 3;
    if (viewer.canActivateAR) return isIOS ? 1 : 2;
    return 3;
  }

  window.MenvaCaps = { forced, slow, isIOS, isAndroid, isMobile, inApp, lowMemory, webgl, preflight, assign };
})();
