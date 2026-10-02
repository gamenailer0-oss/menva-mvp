// Copies the public site into dist/ — the only folder Netlify publishes.
// Nothing is bundled or transformed: files are copied as-is, except the service
// worker, which gets a build id so each deploy refreshes its CSS/JS cache.
//
// Usage: npm run build

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

// Everything public. Anything not listed here (CLAUDE.md, scripts/, incoming-models/, data/dishes.csv, …) stays private.
// robots.txt is not copied — it's generated fresh below (needs the site origin for the Sitemap line).
const PUBLIC = ['index.html', 'sw.js', 'css', 'js', 'assets', 'vendor', 'stats'];
// Published under a different path than the source: Netlify's drag-and-drop upload skipped the
// data/build/ folder, which left the live site without its menu.
const RENAMED = { 'data/build/dishes.json': 'data/menu.json' };

fs.rmSync(DIST, { recursive: true, force: true });
const hash = crypto.createHash('sha256');
let count = 0;

function copy(rel, dest = rel) {
  const from = path.join(ROOT, rel);
  if (!fs.existsSync(from)) return;
  if (fs.statSync(from).isDirectory()) {
    for (const name of fs.readdirSync(from).sort()) copy(path.join(rel, name));
    return;
  }
  if (path.basename(rel) === 'meta.json') return; // pipeline internals, read by build-data only
  const to = path.join(DIST, dest);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  hash.update(rel).update(fs.readFileSync(from));
  count++;
}

if (!fs.existsSync(path.join(ROOT, 'vendor', 'model-viewer.min.js'))) {
  console.error('vendor/ is missing — run `npm run vendor` first.');
  process.exit(1);
}
PUBLIC.forEach((rel) => copy(rel));
for (const [from, to] of Object.entries(RENAMED)) {
  if (!fs.existsSync(path.join(ROOT, from))) { console.error(`${from} is missing — run npm run build-data.`); process.exit(1); }
  copy(from, to);
}

// Google Search Console HTML-file verification: put the file Google gives you (google<token>.html)
// in static/ at the repo root and it is published at the site root. Nothing else in static/ is copied.
const STATIC_DIR = path.join(ROOT, 'static');
if (fs.existsSync(STATIC_DIR)) {
  for (const name of fs.readdirSync(STATIC_DIR).sort()) {
    if (/^google[\w-]+\.html$/i.test(name)) { copy(path.join('static', name), name); console.log(`Search Console: published ${name} at the site root`); }
  }
}

// Restaurant list, reused below for per-page SEO tags, noindex headers, redirects and the sitemap.
const dishesPath = path.join(ROOT, 'data', 'build', 'dishes.json');
if (!fs.existsSync(dishesPath)) { console.error(`${dishesPath} is missing — run npm run build-data.`); process.exit(1); }
const { restaurants } = JSON.parse(fs.readFileSync(dishesPath, 'utf8'));
// Routes the app itself owns. A restaurant slug equal to one of these would shadow the page (both the
// router and dist/<slug>/index.html resolve it), so refuse to build rather than ship a collision.
const RESERVED_SLUGS = ['for-restaurants'];
for (const r of restaurants) {
  if (RESERVED_SLUGS.includes(r.slug)) { console.error(`Restaurant "${r.name}" uses the reserved slug "${r.slug}" — pick another.`); process.exit(1); }
}

// ═══ SEO: static per-page <head> tags ═══════════════════════════════════════
// Crawlers for link previews (WhatsApp, Facebook, X, LinkedIn, iMessage) and search engines do not
// run JavaScript, so every URL must return its own title/description/OG/canonical in the raw HTML.

// Site origin for absolute URLs: data/site.json's `domain` once the custom domain is live, else the
// SITE_URL env var, else SITE_URL from wrangler.toml [vars] (Cloudflare Pages does not expose those
// to the build command, so read the file), else Netlify's URL env var, else the Cloudflare default.
const site = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'site.json'), 'utf8'));
const wranglerUrl = (() => {
  try { return fs.readFileSync(path.join(ROOT, 'wrangler.toml'), 'utf8').match(/^\s*SITE_URL\s*=\s*"([^"]+)"/m)?.[1] ?? null; } catch { return null; }
})();
let origin, originSource;
if (site.domain) { origin = `https://${site.domain}`; originSource = 'data/site.json domain'; }
else if (process.env.SITE_URL) { origin = process.env.SITE_URL.replace(/\/+$/, ''); originSource = 'process.env.SITE_URL'; }
else if (wranglerUrl) { origin = wranglerUrl.replace(/\/+$/, ''); originSource = 'wrangler.toml SITE_URL'; }
else if (process.env.URL) { origin = process.env.URL.replace(/\/+$/, ''); originSource = 'process.env.URL'; }
else { origin = 'https://menva.pages.dev'; originSource = 'default https://menva.pages.dev'; }
console.log(`SEO: site origin ${origin} (source: ${originSource})`);

const THEME_PAPER = { default: '#EFEBE2', gauchos: '#EFEBE2', baraza: '#FAF5EC', 'haute-dolci': '#FAF3F2' };

const escAttr = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Content-hash query param so WhatsApp/Facebook's aggressive image cache busts whenever the image
// itself changes (they cache by URL, not by content).
const assetVersion = (relPath) => {
  const full = path.join(DIST, relPath);
  if (!fs.existsSync(full)) return '0';
  return crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex').slice(0, 10);
};
// </script>-safe JSON-LD: a non-executable script type (application/ld+json is not JS-typed, so
// the CSP script-src directive never applies to it — no console error to watch for there).
const jsonLdScript = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;

function renderHead({ title, description, canonical, image, imageAlt, themeColor, noindex, jsonLd }) {
  const lines = [
    '<!-- SEO:BEGIN — generated by scripts/build.mjs; edit the generator, not this file -->',
    `<title>${escAttr(title)}</title>`,
    `<meta name="description" content="${escAttr(description)}">`,
    `<link rel="canonical" href="${escAttr(canonical)}">`,
  ];
  if (noindex) lines.push('<meta name="robots" content="noindex, nofollow">');
  lines.push(
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="MENVA">',
    `<meta property="og:title" content="${escAttr(title)}">`,
    `<meta property="og:description" content="${escAttr(description)}">`,
    `<meta property="og:url" content="${escAttr(canonical)}">`,
    `<meta property="og:image" content="${escAttr(image)}">`,
    `<meta property="og:image:secure_url" content="${escAttr(image)}">`,
    '<meta property="og:image:type" content="image/jpeg">',
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    `<meta property="og:image:alt" content="${escAttr(imageAlt)}">`,
    '<meta property="og:locale" content="en_US">',
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${escAttr(title)}">`,
    `<meta name="twitter:description" content="${escAttr(description)}">`,
    `<meta name="twitter:image" content="${escAttr(image)}">`,
    `<meta name="theme-color" content="${escAttr(themeColor)}">`,
    '<link rel="icon" href="/favicon.ico" sizes="32x32">',
    '<link rel="icon" href="/assets/social/favicon.svg" type="image/svg+xml">',
    '<link rel="apple-touch-icon" href="/assets/social/apple-touch-icon.png">',
    '<link rel="manifest" href="/site.webmanifest">',
    ...jsonLd.map(jsonLdScript),
    '<!-- SEO:END -->',
  );
  return lines.join('\n  ');
}

const SEO_BLOCK_RE = /<!-- SEO:BEGIN[\s\S]*?<!-- SEO:END -->/;
const FALLBACK_RE = /<!-- FALLBACK:BEGIN -->[\s\S]*?<!-- FALLBACK:END -->/;
function withHead(html, headBlock, fallback = '') {
  if (!SEO_BLOCK_RE.test(html)) { console.error('index.html is missing the <!-- SEO:BEGIN/END --> markers.'); process.exit(1); }
  if (!FALLBACK_RE.test(html)) { console.error('index.html is missing the <!-- FALLBACK:BEGIN/END --> markers.'); process.exit(1); }
  // Function replacers: the generated text must never be read as a $& / $1 replacement pattern.
  return html.replace(SEO_BLOCK_RE, () => headBlock).replace(FALLBACK_RE, () => fallback);
}

const baseHtml = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');

// Static content a crawler (or a visitor without JavaScript) sees inside #app: one h1, a short
// description and real links. With JavaScript on, a <noscript> body is never rendered, and the app
// replaces #app on boot anyway, so visitors see no flash and the page keeps a single h1.
const listed = restaurants.filter((r) => r.listed === true).sort((a, b) => (a.pilot === b.pilot ? 0 : a.pilot ? -1 : 1));
const restaurantLinks = (items) => items.length
  ? `<ul class="static-links">${items.map((r) => `<li><a href="/${escAttr(r.slug)}">${escAttr(r.name)}</a>${r.cuisine ? ` <span>${escAttr(r.cuisine)} · ${escAttr(r.location || 'Lahore')}</span>` : ''}</li>`).join('')}</ul>`
  : '';
const staticHeader = '<header class="topbar"><a class="wordmark" href="/" aria-label="MENVA home">menva<span class="wordmark-dot">.</span></a></header>';
const staticFooter = '<footer><span>menva<span class="wordmark-dot">.</span></span><p>See it before you order it.</p><small>3D scans provided by restaurants</small></footer>';
const noscript = (body) => `<noscript>${staticHeader}<main class="brand-page">${body}</main>${staticFooter}</noscript>`;

// ── Home ──
const homeImageRel = 'assets/social/og-menva.jpg';
const homeImage = `${origin}/${homeImageRel}?v=${assetVersion(homeImageRel)}`;
const homeHead = renderHead({
  title: 'See restaurant dishes on your table in AR — Lahore | MENVA',
  description: 'Scan the QR at your table and see the real dish in 3D and AR, at true size, before you order. Restaurant menus in Lahore. No app to install.',
  canonical: `${origin}/`,
  image: homeImage,
  imageAlt: 'MENVA — see real dishes in 3D and AR on your table.',
  themeColor: THEME_PAPER.default,
  noindex: false,
  jsonLd: [
    {
      '@context': 'https://schema.org', '@type': 'Organization', '@id': `${origin}/#organization`, name: 'MENVA', url: `${origin}/`,
      logo: `${origin}/assets/logo.svg`,
      description: '3D and AR restaurant menus: diners scan a QR code and see the real dish on their table at true size before they order.',
      areaServed: { '@type': 'City', name: 'Lahore' },
    },
    {
      '@context': 'https://schema.org', '@type': 'WebSite', '@id': `${origin}/#website`, name: 'MENVA', url: `${origin}/`, inLanguage: 'en',
      description: '3D and AR restaurant menus in Lahore.', publisher: { '@id': `${origin}/#organization` },
    },
  ],
});
fs.writeFileSync(path.join(DIST, 'index.html'), withHead(baseHtml, homeHead, noscript(
  '<p class="overline">AR menus · Lahore</p>' +
  '<h1>See it on your table. Then <em>decide.</em></h1>' +
  '<p>MENVA puts restaurant menus in 3D and AR. Scan the QR at your table, see the real dish in front of you at true size, and judge the portion, the look and the value before you order. No app to install.</p>' +
  (listed.length ? '<p class="overline">Our restaurants</p>' + restaurantLinks(listed) : '') +
  '<p><a href="/for-restaurants">For restaurants: AR menus for your tables</a></p>')));

// ── For restaurants ── (dist/for-restaurants/index.html; the page is drawn by js/for-restaurants.js)
const FR_WHATSAPP = `https://wa.me/923327270188?text=${encodeURIComponent("Hi MENVA — I'd like a free pilot for my restaurant.")}`;
const frCanonical = `${origin}/for-restaurants`;
const frTitle = 'AR menus for restaurants in Lahore — MENVA';
const frDescription = 'MENVA is an AR menu: guests scan the QR on the table and see your real dishes at true size, on their own table. Free pilot for Lahore restaurants.';
const frHead = renderHead({
  title: frTitle,
  description: frDescription,
  canonical: frCanonical,
  image: homeImage,
  imageAlt: 'MENVA — an AR menu: real dishes at true size on your guests’ tables.',
  themeColor: THEME_PAPER.default,
  noindex: false,
  jsonLd: [{
    '@context': 'https://schema.org', '@type': 'Service', '@id': `${frCanonical}#service`, name: 'AR menus for restaurants',
    serviceType: 'AR restaurant menu', url: frCanonical, description: frDescription,
    provider: { '@type': 'Organization', '@id': `${origin}/#organization`, name: 'MENVA', url: `${origin}/`, telephone: '+92 332 7270188' },
    areaServed: { '@type': 'City', name: 'Lahore' },
  }],
});
// Order of the live examples: the same as the page (haute-dolci, baraza, g unless the data says otherwise).
const frOrder = ['haute-dolci', 'baraza', 'g'];
const frRank = (r) => (typeof r.homeOrder === 'number' ? r.homeOrder : 100 + (frOrder.indexOf(r.slug) >= 0 ? frOrder.indexOf(r.slug) : frOrder.length));
const frExamples = [...listed].sort((a, b) => frRank(a) - frRank(b));
fs.mkdirSync(path.join(DIST, 'for-restaurants'), { recursive: true });
fs.writeFileSync(path.join(DIST, 'for-restaurants', 'index.html'), withHead(baseHtml, frHead, noscript(
  '<p class="overline">For restaurants</p>' +
  '<h1>Your dishes on every table — <em>before the order.</em></h1>' +
  '<p>MENVA is an AR menu. Guests scan the QR on their table and see your real dishes at true size, on their own table. No app to install.</p>' +
  `<a class="product-action" href="${escAttr(FR_WHATSAPP)}">Book a free pilot</a>` +
  '<p class="overline">What you get</p>' +
  '<ul class="static-list"><li>Your dishes scanned in 3D</li><li>A menu page in your own brand: colours, logo, your words</li><li>Table QR codes</li><li>A private results page</li><li>Branded Table Cards your guests share</li></ul>' +
  '<p class="overline">How a pilot works</p>' +
  '<ul class="static-list"><li>Day 0: we scan 3–4 signature dishes, about an hour in your restaurant.</li><li>Days 1–7: QR codes are live on your tables.</li><li>Day 8: we review the real numbers together.</li></ul>' +
  '<p>Free for 7 days — can run up to 30. No commitment.</p>' +
  '<p class="overline">Live examples</p>' + restaurantLinks(frExamples) +
  '<p>Abdullah · MENVA · <a href="tel:+923327270188">+92 332 7270188</a></p>' +
  '<p><a href="/">MENVA home</a></p>')));

// ── Per restaurant ── (dist/<slug>/index.html; table URLs /<slug>/12 canonicalise to /<slug>)
for (const r of restaurants) {
  const imageRel = `assets/social/og-${r.id}.jpg`;
  const image = fs.existsSync(path.join(DIST, imageRel))
    ? `${origin}/${imageRel}?v=${assetVersion(imageRel)}`
    : homeImage; // no share image generated for this restaurant yet — fall back rather than 404
  const lede = (r.tagline || r.description || '').trim();
  let description = lede ? `${lede.replace(/\.?$/, '.')} See every dish on your table before you order.` : 'See every dish on your table before you order.';
  if (description.length > 160) description = description.slice(0, 157).trimEnd() + '…';
  const canonical = `${origin}/${r.slug}`;

  const address = { '@type': 'PostalAddress', addressCountry: 'PK' };
  if (r.address) address.streetAddress = r.address;
  if (r.location) address.addressLocality = r.location;
  const restaurantLd = { '@context': 'https://schema.org', '@type': 'Restaurant', name: r.name, url: canonical, image, menu: canonical };
  if (r.cuisine) restaurantLd.servesCuisine = r.cuisine;
  if (r.address || r.location) restaurantLd.address = address;
  if (r.hours === 'Open 24/7') restaurantLd.openingHours = 'Mo-Su 00:00-24:00';
  if (r.website) restaurantLd.sameAs = [r.website];

  const head = renderHead({
    title: `${r.name} — menu in 3D · MENVA`,
    description,
    canonical,
    image,
    imageAlt: `${r.name} — see the menu in 3D on your table.`,
    themeColor: THEME_PAPER[r.theme] || THEME_PAPER.default,
    noindex: r.listed !== true,
    jsonLd: [restaurantLd],
  });
  const outPath = path.join(DIST, r.slug, 'index.html');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const restLede = (r.description || r.tagline || '').trim();
  fs.writeFileSync(outPath, withHead(baseHtml, head, noscript(
    `<p class="overline">${escAttr(r.area || '')}${r.area && r.location ? ' · ' : ''}${escAttr(r.location || '')}</p>` +
    `<h1>${escAttr(r.displayName || r.name)}</h1>` +
    `<p>${escAttr(restLede)} See every dish on your table in 3D and AR before you order.</p>` +
    '<p><a href="/">MENVA — 3D &amp; AR restaurant menus in Lahore</a></p>')));
}

// Drag-and-drop deploys ignore netlify.toml, so mirror its headers/redirects as _headers/_redirects.
const headers = [], redirects = [];
let block = null;
for (const line of fs.readFileSync(path.join(ROOT, 'netlify.toml'), 'utf8').split('\n')) {
  const t = line.trim();
  if (t === '[[headers]]') { block = { kind: 'h', values: [] }; headers.push(block); continue; }
  if (t === '[[redirects]]') { block = { kind: 'r' }; redirects.push(block); continue; }
  if (t.startsWith('[') && t !== '[headers.values]') { block = null; continue; }
  const m = t.match(/^([\w-]+)\s*=\s*"?(.*?)"?$/);
  if (!block || !m) continue;
  if (block.kind === 'h') m[1] === 'for' ? (block.for = m[2]) : block.values.push(`${m[1]}: ${m[2]}`);
  else block[m[1]] = m[2];
}

// Every restaurant's table URLs (/<slug>/12) resolve to its own page. netlify.toml lists the known ones;
// add any restaurant that is in the menu data but not there yet, so a new restaurant never 404s.
// There is deliberately NO catch-all: any other unknown URL must be a real 404 (dist/404.html).
for (const r of restaurants) {
  if (!redirects.some((x) => x.from === `/${r.slug}/:table`)) redirects.push({ kind: 'r', from: `/${r.slug}/:table`, to: `/${r.slug}/`, status: '200' });
}

// Pitch demos: a restaurant not yet public (listed !== true, e.g. Baraza) gets noindex on its
// pages, so a private client demo can never be indexed or found before it's approved to go live.
for (const r of restaurants) {
  if (r.listed === true) continue;
  for (const pattern of [`/${r.slug}`, `/${r.slug}/*`]) headers.push({ kind: 'h', for: pattern, values: ['X-Robots-Tag: noindex, nofollow'] });
}
fs.writeFileSync(path.join(DIST, '_headers'), headers.map((h) => `${h.for}\n${h.values.map((v) => `  ${v}`).join('\n')}`).join('\n\n') + '\n');
fs.writeFileSync(path.join(DIST, '_redirects'), redirects.map((r) => `${r.from}  ${r.to}  ${r.status}`).join('\n') + '\n');

// ═══ 404: a calm, branded page, served with status 404 by Cloudflare Pages / Netlify for any URL
// that matches no file and no rewrite. No JavaScript needed; noindex so it never appears in search.
const notFoundHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Page not found — MENVA</title>
  <meta name="description" content="This page isn't on the menu. Head back to MENVA or open one of our restaurant menus.">
  <meta name="robots" content="noindex">
  <meta name="theme-color" content="${THEME_PAPER.default}">
  <link rel="icon" href="/favicon.ico" sizes="32x32">
  <link rel="icon" href="/assets/social/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/assets/social/apple-touch-icon.png">
  <script src="/js/appearance.js"></script>
  <link rel="preload" href="/vendor/fonts/dm-sans-400.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/css/tokens.css">
  <link rel="stylesheet" href="/css/base.css">
  <link rel="stylesheet" href="/css/style.css">
  <link rel="stylesheet" href="/css/toggle.css">
</head>
<body>
  ${staticHeader}
  <main class="brand-page">
    <p class="overline">Error 404</p>
    <h1>This page isn't <em>on the menu.</em></h1>
    <p>The link may be old or mistyped. Start from the home page, or open one of our menus.</p>
    <a class="product-action" href="/">Go to MENVA <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h15M13 6l6 6-6 6"/></svg></a>
    ${restaurantLinks(listed)}
  </main>
  ${staticFooter}
</body>
</html>
`;
fs.writeFileSync(path.join(DIST, '404.html'), notFoundHtml);

// Browsers request /favicon.ico at the site root regardless of what any <link> tag says.
copy('assets/social/favicon.ico', 'favicon.ico');

const build = hash.digest('hex').slice(0, 12);

// Stamp local CSS/JS links with the build id. HTML is always revalidated, so after a deploy the
// page asks for new URLs and the service worker can never pair old JavaScript with new data.
for (const page of ['index.html', '404.html', 'stats/index.html', 'for-restaurants/index.html', ...restaurants.map((r) => `${r.slug}/index.html`)]) {
  const file = path.join(DIST, page);
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, 'utf8').replace(/((?:href|src)="\/(?:css|js|stats)\/[^"?]+\.(?:css|js))"/g, `$1?v=${build}"`);
  fs.writeFileSync(file, html);
}
const swPath = path.join(DIST, 'sw.js');
fs.writeFileSync(swPath, fs.readFileSync(swPath, 'utf8').replace('__BUILD__', build));

// ═══ SEO: manifest, robots.txt, sitemap.xml, root favicon ═══════════════════
fs.writeFileSync(path.join(DIST, 'site.webmanifest'), JSON.stringify({
  name: 'MENVA',
  short_name: 'MENVA',
  icons: [
    { src: '/assets/social/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/assets/social/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/assets/social/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
  theme_color: '#1A1714',
  background_color: '#EFEBE2',
  display: 'standalone',
  start_url: '/',
}, null, 2) + '\n');

fs.writeFileSync(path.join(DIST, 'robots.txt'),
  'User-agent: *\nAllow: /\nDisallow: /stats\nDisallow: /api/\n\n' +
  `Sitemap: ${origin}/sitemap.xml\n`);

const lastmod = new Date().toISOString().slice(0, 10);
const sitemapUrls = [origin + '/', ...restaurants.filter((r) => r.listed === true).map((r) => `${origin}/${r.slug}`), frCanonical];
fs.writeFileSync(path.join(DIST, 'sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  sitemapUrls.map((u) => `  <url><loc>${escAttr(u)}</loc><lastmod>${lastmod}</lastmod></url>`).join('\n') + '\n' +
  '</urlset>\n');

console.log(`dist/: ${count} files, build ${build}`);
