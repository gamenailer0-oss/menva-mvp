// Static per-page SEO tags — checked from the raw HTML a crawler gets (no JS), since WhatsApp,
// Facebook, X, LinkedIn, iMessage and Google never execute the app's JavaScript. Then confirms the
// app itself still renders normally once JS does run.
import { test, expect } from '@playwright/test';
import sharp from 'sharp';
import { watch } from './helpers.mjs';

function metaContent(html, key, value) {
  const re = new RegExp(`<meta[^>]*${key}="${value}"[^>]*content="([^"]*)"`, 'i');
  return html.match(re)?.[1] ?? null;
}
function tagContent(html, re) {
  return html.match(re)?.[1] ?? null;
}
function jsonLdBlocks(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
}

const PAGES = [
  { path: '/', canonicalPath: '/', title: 'MENVA — See it before you order it', ogImageName: 'og-menva.jpg', ldTypes: ['Organization', 'WebSite'] },
  { path: '/g/12', canonicalPath: '/g', title: 'Gauchos — menu in 3D · MENVA', ogImageName: 'og-gauchos.jpg', ldTypes: ['Restaurant'] },
  { path: '/baraza/12', canonicalPath: '/baraza', title: 'Baraza Coffee — menu in 3D · MENVA', ogImageName: 'og-baraza.jpg', ldTypes: ['Restaurant'] },
];

for (const p of PAGES) {
  test(`${p.path}: title, OG image, canonical, JSON-LD, twitter card (raw HTML, no JS)`, async ({ request }) => {
    const res = await request.get(p.path);
    expect(res.status()).toBe(200);
    const html = await res.text();

    const title = tagContent(html, /<title>([^<]*)<\/title>/);
    expect(title).toBe(p.title);
    expect(metaContent(html, 'property', 'og:title')).toBe(p.title);
    expect(metaContent(html, 'property', 'og:type')).toBe('website');
    expect(metaContent(html, 'property', 'og:site_name')).toBe('MENVA');

    const canonical = tagContent(html, /<link rel="canonical" href="([^"]*)">/);
    expect(canonical).toBeTruthy();
    const origin = new URL(canonical).origin;
    expect(canonical).toBe(`${origin}${p.canonicalPath}`);
    expect(metaContent(html, 'property', 'og:url')).toBe(canonical);

    const ogImage = metaContent(html, 'property', 'og:image');
    expect(ogImage).toBeTruthy();
    expect(ogImage.startsWith(origin)).toBe(true); // absolute, not relative — required for link previews
    expect(ogImage).toContain(`/assets/social/${p.ogImageName}?v=`);
    expect(metaContent(html, 'property', 'og:image:secure_url')).toBe(ogImage);
    expect(metaContent(html, 'property', 'og:image:type')).toBe('image/jpeg');
    expect(metaContent(html, 'property', 'og:image:width')).toBe('1200');
    expect(metaContent(html, 'property', 'og:image:height')).toBe('630');
    expect(metaContent(html, 'property', 'og:image:alt')).toBeTruthy();
    expect(metaContent(html, 'property', 'og:locale')).toBe('en_US');

    expect(metaContent(html, 'name', 'twitter:card')).toBe('summary_large_image');
    expect(metaContent(html, 'name', 'twitter:title')).toBe(p.title);
    expect(metaContent(html, 'name', 'twitter:image')).toBe(ogImage);

    const description = tagContent(html, /<meta name="description" content="([^"]*)">/);
    expect(description).toBeTruthy();
    if (p.path !== '/') expect(description.length).toBeLessThanOrEqual(160); // restaurant pages only

    // Fetch the declared image from this same build (the tag's own origin may be unreachable from
    // a sandboxed test run — e.g. the default menva-ar.netlify.app fallback) and confirm it's a
    // real 1200×630 JPEG under the WhatsApp/Facebook size budget.
    const imgUrl = new URL(ogImage);
    const imgRes = await request.get(imgUrl.pathname + imgUrl.search);
    expect(imgRes.status()).toBe(200);
    expect(imgRes.headers()['content-type']).toContain('image/jpeg');
    const body = await imgRes.body();
    expect(body.length).toBeLessThanOrEqual(250 * 1024);
    const imgMeta = await sharp(body).metadata();
    expect(imgMeta.width).toBe(1200);
    expect(imgMeta.height).toBe(630);
    expect(imgMeta.format).toBe('jpeg');

    // JSON-LD: valid JSON, right @type(s), no fabricated fields (only config-sourced values).
    const blocks = jsonLdBlocks(html);
    expect(blocks.map((b) => b['@type'])).toEqual(p.ldTypes);
    for (const b of blocks) expect(b['@context']).toBe('https://schema.org');
    if (p.ldTypes.includes('Restaurant')) {
      const r = blocks.find((b) => b['@type'] === 'Restaurant');
      expect(r.name).toBeTruthy();
      expect(r.url).toBe(canonical);
      expect(r).not.toHaveProperty('aggregateRating'); // never a fabricated rating/price
    }
  });
}

test('/g/12 gets no robots noindex tag (listed restaurant)', async ({ request }) => {
  const html = await (await request.get('/g/12')).text();
  expect(html).not.toContain('name="robots"');
});

test('/robots.txt: allows the site, blocks private paths, points at the sitemap', async ({ request }) => {
  const res = await request.get('/robots.txt');
  expect(res.status()).toBe(200);
  const text = await res.text();
  expect(text).toContain('User-agent: *');
  expect(text).toContain('Allow: /');
  expect(text).toContain('Disallow: /stats');
  expect(text).toContain('Disallow: /api/');
  expect(text).toMatch(/Sitemap: https?:\/\/[^\s]+\/sitemap\.xml/);
});

test('/sitemap.xml: home + every listed restaurant', async ({ request }) => {
  const res = await request.get('/sitemap.xml');
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('xml');
  const text = await res.text();
  expect(text).toContain('<urlset');
  expect(text).toMatch(/<loc>[^<]*\/<\/loc>/);
  expect(text).toMatch(/<loc>[^<]*\/g<\/loc>/);
  expect(text).toMatch(/<loc>[^<]*\/baraza<\/loc>/);
  expect(text).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
});

test('/favicon.ico: 200, ico content type', async ({ request }) => {
  const res = await request.get('/favicon.ico');
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('image/x-icon');
});

test('/site.webmanifest: parses, has the icon set', async ({ request }) => {
  const res = await request.get('/site.webmanifest');
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('application/manifest+json');
  const manifest = await res.json();
  expect(manifest.name).toBe('MENVA');
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons.length).toBeGreaterThanOrEqual(3);
  expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true);
});

// The static tags above must not come at the cost of the app itself: every page still renders
// (h1 visible) once JS runs, with no console errors and no CSP violation from the JSON-LD script.
for (const route of ['/', '/g/12', '/baraza/12']) {
  test(`${route}: still renders as an app (h1 visible), no console errors`, async ({ page }) => {
    const w = watch(page);
    await page.goto(route);
    await expect(page.locator('h1')).toBeVisible();
    expect(w.errors).toEqual([]);
    expect(w.external).toEqual([]);
  });
}
