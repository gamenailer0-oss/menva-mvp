// /for-restaurants: the owner-facing page. Rendered by js/for-restaurants.js, with its own static
// HTML for crawlers (scripts/build.mjs). No prices anywhere, no invented numbers.
import { test, expect } from '@playwright/test';
import { watch } from './helpers.mjs';

const WHATSAPP = 'https://wa.me/923327270188?text=' + encodeURIComponent("Hi MENVA — I'd like a free pilot for my restaurant.");

test('/for-restaurants renders: one h1, sections, no console errors, no external requests', async ({ page }) => {
  const w = watch(page);
  const res = await page.goto('/for-restaurants');
  expect(res.status()).toBe(200);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveText('Your dishes on every table — before the order.');
  await expect(page).toHaveTitle('AR menus for restaurants in Lahore — MENVA');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'default');
  await expect(page.locator('header.topbar')).toBeVisible();
  await expect(page.locator('footer')).toBeVisible();
  for (const heading of ['What the studies found', 'Everything your restaurant needs to go live', 'How a pilot works', 'See it on real menus', 'The honest details']) {
    await expect(page.getByRole('heading', { level: 2, name: heading })).toBeVisible();
  }
  await expect(page.locator('.fr-features .fr-feature')).toHaveCount(5);
  await expect(page.locator('.fr-steps li')).toHaveCount(3);
  await expect(page.locator('.fr-know li')).toHaveCount(4);
  await expect(page.locator('main')).toContainText('Free for 7 days — can run up to 30. No commitment.');
  await expect(page.locator('img:not([alt])')).toHaveCount(0);
  expect(w.errors).toEqual([]);
  expect(w.external).toEqual([]); // wa.me is a link, never a request
});

test('the proof is labelled as published studies and carries only the two cited figures', async ({ page }) => {
  await page.goto('/for-restaurants');
  const sec = page.locator('section', { has: page.locator('#fr-proof-h') });
  await expect(sec).toContainText('Published studies, not MENVA results');
  await expect(sec).toContainText('Up to 30%');
  await expect(sec).toContainText('Grubhub');
  await expect(sec).toContainText('25%');
  await expect(sec).toContainText('Kabaq × Bareburger study');
  await expect(sec.locator('.fr-stat')).toHaveCount(2);
});

test('Book a free pilot buttons open WhatsApp with the prefilled message', async ({ page }) => {
  await page.goto('/for-restaurants');
  const links = page.getByRole('link', { name: 'Book a free pilot' });
  await expect(links).toHaveCount(2); // hero + closing band
  for (const l of await links.all()) {
    await expect(l).toHaveAttribute('href', WHATSAPP);
    await expect(l).toHaveAttribute('target', '_blank');
    await expect(l).toHaveAttribute('rel', /noopener/);
  }
  await expect(page.locator('.fr-cta')).toContainText('Abdullah · MENVA · +92 332 7270188');
});

test('no prices or currency anywhere on the page', async ({ page, request }) => {
  await page.goto('/for-restaurants');
  const text = await page.locator('main').innerText();
  expect(text).not.toMatch(/PKR|Rs\.?\s?\d|\brupee|\bprice|\$\s?\d|\d\s?k\b/i);
  const raw = await (await request.get('/for-restaurants')).text();
  expect(raw).not.toMatch(/PKR/);
});

test('"See a live menu" and the three live examples open their menus', async ({ page }) => {
  await page.goto('/for-restaurants');
  const examples = page.locator('.fr-example');
  await expect(examples).toHaveCount(3);
  await expect(examples.nth(0)).toContainText('Haute Dolci');
  await expect(examples.nth(0)).toContainText('Desserts');
  await expect(examples.nth(1)).toContainText('Baraza Coffee');
  await expect(examples.nth(2)).toContainText('Gauchos');
  await expect(page.getByRole('link', { name: 'See a live menu' })).toHaveAttribute('href', '/haute-dolci');

  for (const [i, slug] of [[0, 'haute-dolci'], [1, 'baraza'], [2, 'g']]) {
    await page.goto('/for-restaurants');
    await page.locator('.fr-example').nth(i).click();
    await expect(page).toHaveURL(new RegExp(`/${slug}$`));
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('.dish-card').first()).toBeVisible();
  }
  await page.goto('/for-restaurants');
  await page.getByRole('link', { name: 'See a live menu' }).click();
  await expect(page).toHaveURL(/\/haute-dolci$/);
});

test('reserved slug: /for-restaurants/anything is a real 404; the page works with and without a slash', async ({ request }) => {
  expect((await request.get('/for-restaurants')).status()).toBe(200);
  expect((await request.get('/for-restaurants/')).status()).toBe(200);
  expect((await request.get('/for-restaurants/12')).status()).toBe(404);
  expect((await request.get('/for-restaurants/x/y')).status()).toBe(404);
});

test('static HTML (no JS) has the h1, key copy, WhatsApp link and links to every live menu', async ({ request }) => {
  const html = await (await request.get('/for-restaurants')).text();
  expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
  expect(html).toContain('<h1>Your dishes on every table — <em>before the order.</em></h1>');
  const fallback = html.match(/<div id="app">([\s\S]*?)<\/div>\s*<script/)?.[1] ?? '';
  expect(fallback).toContain('<noscript>');
  expect(fallback).toContain('Free for 7 days — can run up to 30. No commitment.');
  expect(fallback).toContain(`href="${WHATSAPP}"`);
  for (const slug of ['haute-dolci', 'baraza', 'g']) expect(fallback).toContain(`href="/${slug}"`);
  expect(fallback).not.toMatch(/PKR/);
});

test('static SEO: title, description, canonical, OG image, Service JSON-LD without prices', async ({ request }) => {
  const html = await (await request.get('/for-restaurants')).text();
  expect(html.match(/<title>([^<]*)<\/title>/)[1]).toBe('AR menus for restaurants in Lahore — MENVA');
  const description = html.match(/<meta name="description" content="([^"]*)">/)[1];
  expect(description.length).toBeLessThanOrEqual(160);
  expect(html.match(/<link rel="canonical" href="([^"]*)">/)[1]).toMatch(/\/for-restaurants$/);
  expect(html).toMatch(/<meta property="og:image" content="[^"]*\/assets\/social\/og-menva\.jpg\?v=/);
  expect(html).not.toContain('name="robots"');
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
  expect(ld.map((b) => b['@type'])).toEqual(['Service']);
  expect(ld[0].provider).toMatchObject({ '@type': 'Organization', name: 'MENVA' });
  expect(ld[0].areaServed).toMatchObject({ name: 'Lahore' });
  expect(JSON.stringify(ld[0])).not.toMatch(/price|offers|PKR/i);
});

test('sitemap lists /for-restaurants; the home page raw HTML carries no owner statistics', async ({ request }) => {
  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap).toMatch(/<loc>[^<]*\/for-restaurants<\/loc>/);
  const home = await (await request.get('/')).text();
  for (const s of ['Grubhub', 'Kabaq', 'Bareburger', '30%', '25%']) expect(home).not.toContain(s);
});

test('unknown URLs are still a real 404', async ({ request }) => {
  for (const bad of ['/for-restaurant', '/for-restaurants.html', '/nowhere']) expect((await request.get(bad)).status(), bad).toBe(404);
});

test('phone width: no horizontal scroll, tap targets at least 44px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/for-restaurants');
  await expect(page.locator('h1')).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  for (const sel of ['.fr-hero .product-action', '.fr-link', '.fr-example', '.fr-cta .product-action']) {
    const box = await page.locator(sel).first().boundingBox();
    expect(box.height, sel).toBeGreaterThanOrEqual(44);
  }
});

test('reduced motion: page is complete and nothing animates', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/for-restaurants');
  await expect(page.locator('.fr-cta')).toBeVisible();
  const running = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length);
  expect(running).toBe(0);
});
