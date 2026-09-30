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
  { path: '/', canonicalPath: '/', title: '3D &amp; AR restaurant menus in Lahore — MENVA', ogImageName: 'og-menva.jpg', ldTypes: ['Organization', 'WebSite'] },
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

// ── Real 404s, indexable static HTML, sitemap ────────────────────────────────────────────────
// Google treats a 200 on a URL that does not exist as a "soft 404", so unknown paths must answer 404.
for (const bad of ['/nowhere/4', '/nowhere', '/g/12/extra', '/some/deep/unknown/path', '/g.html']) {
  test(`${bad}: a real 404 with noindex and a way back, no JS needed`, async ({ request }) => {
    const res = await request.get(bad);
    expect(res.status()).toBe(404);
    expect(res.headers()['content-type']).toContain('text/html');
    const html = await res.text();
    expect(html).toMatch(/<meta name="robots" content="noindex">/);
    expect(html).toContain("<h1>This page isn't <em>on the menu.</em></h1>");
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('href="/"'); // home
    for (const slug of ['g', 'baraza', 'haute-dolci']) expect(html).toContain(`href="/${slug}"`);
    expect(html).not.toContain('<script src="/js/app.js'); // no app shell, nothing to render
    expect(html).not.toContain('rel="canonical"');
  });
}

test('404 page renders (styled, single h1, links work) in the browser', async ({ page }) => {
  const w = watch(page);
  const res = await page.goto('/nowhere/4');
  expect(res.status()).toBe(404);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('.static-links a')).toHaveCount(3);
  expect(w.errors.filter((e) => !/404/.test(e))).toEqual([]);
  expect(w.external).toEqual([]);
  await page.locator('.static-links a', { hasText: 'Haute Dolci' }).click();
  await expect(page).toHaveURL(/\/haute-dolci$/);
  await expect(page.locator('h1')).toBeVisible();
});

test('known routes are 200: table URLs, invalid tables, stats, restaurant roots', async ({ request }) => {
  for (const p of ['/', '/g', '/g/', '/g/12', '/g/abc', '/g/9999', '/baraza/12', '/haute-dolci/12', '/haute-dolci', '/stats/']) {
    const res = await request.get(p);
    expect(res.status(), p).toBe(200);
  }
});

test('/haute-dolci/12 serves the restaurant page with its own tags and canonical /haute-dolci', async ({ request }) => {
  const res = await request.get('/haute-dolci/12');
  expect(res.status()).toBe(200);
  const html = await res.text();
  expect(tagContent(html, /<title>([^<]*)<\/title>/)).toBe('Haute Dolci — menu in 3D · MENVA');
  expect(tagContent(html, /<link rel="canonical" href="([^"]*)">/)).toMatch(/\/haute-dolci$/);
  expect(jsonLdBlocks(html).map((b) => b['@type'])).toEqual(['Restaurant']);
});

test('sitemap lists the home page and all three listed restaurants, each with a lastmod', async ({ request }) => {
  const text = await (await request.get('/sitemap.xml')).text();
  const urls = [...text.matchAll(/<url><loc>([^<]+)<\/loc><lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod><\/url>/g)].map((m) => new URL(m[1]).pathname);
  expect(urls).toEqual(['/', '/g', '/baraza', '/haute-dolci']);
});

// Crawlers that do not run JS still need real content: one h1, a description, links to every menu.
for (const p of [
  { path: '/', h1: /<h1>See it on your table\. Then <em>decide\.<\/em><\/h1>/ },
  { path: '/g/12', h1: /<h1>Gauchos<\/h1>/ },
  { path: '/haute-dolci', h1: /<h1>Haute Dolci<\/h1>/ },
]) {
  test(`${p.path}: raw HTML (no JS) has exactly one h1, a description and links`, async ({ request }) => {
    const html = await (await request.get(p.path)).text();
    expect(html).toContain('<html lang="en">');
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    expect(html).toMatch(p.h1);
    const fallback = html.match(/<div id="app">([\s\S]*?)<\/div>\s*<script/)?.[1] ?? '';
    expect(fallback).toContain('<noscript>');
    expect(fallback).toMatch(/<p>[^<]{40,}/); // a real sentence, not just a heading
    expect(fallback).toContain('href="/"');
    if (p.path === '/') for (const slug of ['g', 'baraza', 'haute-dolci']) expect(fallback).toContain(`href="/${slug}"`);
  });
}

test('home: title and description target the search intent; Organization + WebSite JSON-LD', async ({ request }) => {
  const html = await (await request.get('/')).text();
  expect(tagContent(html, /<title>([^<]*)<\/title>/)).toContain('restaurant menus in Lahore');
  const description = tagContent(html, /<meta name="description" content="([^"]*)">/);
  expect(description.length).toBeLessThanOrEqual(160);
  expect(description).toMatch(/3D and AR/);
  const org = jsonLdBlocks(html).find((b) => b['@type'] === 'Organization');
  expect(org.url).toMatch(/\/$/);
  expect(org).not.toHaveProperty('aggregateRating');
});

// JS on: a single h1 per page, and every image has alt text (decorative ones an empty alt).
for (const route of ['/', '/g/12', '/baraza/12', '/haute-dolci/12']) {
  test(`${route}: one h1 and every image has an alt attribute`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('img:not([alt])')).toHaveCount(0);
  });
}

test('home hero: the three beats and the cited evidence are on the page', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText('See it on your table. Then decide.');
  await expect(page.locator('.decide-beats .beat')).toHaveCount(3);
  await expect(page.locator('.decide-beats')).toContainText('Unsure what to order?');
  await expect(page.locator('.decide-beats')).toContainText('See it life-size on your table');
  await expect(page.locator('.decide-beats')).toContainText('Order with confidence');
  const proof = page.locator('.hero-proof');
  await expect(proof).toContainText('Grubhub');
  await expect(proof).toContainText('Kabaq × Bareburger');
});

test('home hero under reduced motion: nothing animates and all three beats are fully visible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.decide-beats .beat').first()).toBeVisible();
  const state = await page.evaluate(() => ({
    running: document.getAnimations().filter((a) => a instanceof CSSAnimation && a.effect?.target?.closest?.('.home-hero') && a.playState === 'running').length,
    beatOpacity: [...document.querySelectorAll('.beat-text')].map((el) => getComputedStyle(el).opacity),
  }));
  expect(state.running).toBe(0);
  expect(state.beatOpacity).toEqual(['1', '1', '1']);
});
