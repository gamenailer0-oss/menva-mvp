// Home page (customers only): header pill on every page, Haute Dolci first, one uniform card design,
// the hero dish, no owner content, one consistent section rhythm with no empty stretches.
import { test, expect } from '@playwright/test';
import { watch } from './helpers.mjs';

test('header: "For restaurants" pill on every page, 44px tall, next to the theme toggle', async ({ page }) => {
  for (const path of ['/', '/haute-dolci', '/baraza', '/g/12']) {
    await page.goto(path);
    const pill = page.locator('.topbar .topbar-pill');
    await expect(pill, path).toHaveText('For restaurants');
    await expect(pill, path).toHaveAttribute('href', '/for-restaurants');
    await expect(pill, path).toBeVisible();
    const box = await pill.boundingBox();
    expect(box.height, path).toBeGreaterThanOrEqual(44);
    await expect(page.locator('.topbar [data-mode-toggle]'), path).toBeVisible();
  }
});

test('header pill is also on the in-app not-found screen', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => { history.pushState(null, '', '/nowhere/4'); dispatchEvent(new PopStateEvent('popstate')); });
  await expect(page.locator('h1')).toHaveText('Restaurant not found');
  await expect(page.locator('.topbar .topbar-pill')).toHaveText('For restaurants');
});

test('header pill: accent outline on MENVA pages, neutral ink outline on a restaurant page', async ({ page }) => {
  const colours = () => page.locator('.topbar-pill').evaluate((el) => {
    const cs = getComputedStyle(el);
    return { border: cs.borderTopColor, ink: getComputedStyle(document.body).getPropertyValue('--ink').trim(), accent: getComputedStyle(document.body).getPropertyValue('--accent').trim(), text: cs.color };
  });
  await page.goto('/');
  const home = await colours();
  expect(home.border).toBe(home.text);
  expect(home.border).not.toBe('rgb(28, 20, 22)');
  await page.goto('/haute-dolci');
  const hd = await colours();
  expect(hd.border).toBe('rgb(28, 20, 22)'); // Haute Dolci's --ink, not its raspberry accent
});

test('home: Haute Dolci first, one card design for all, each tinted by its own theme', async ({ page }) => {
  const w = watch(page);
  await page.goto('/');
  const cards = page.locator('.menu-card');
  await expect(cards).toHaveCount(3);
  expect(await cards.evaluateAll((els) => els.map((e) => e.dataset.theme))).toEqual(['haute-dolci', 'baraza', 'gauchos']);
  await expect(page.locator('#menus h2')).toHaveText('Explore the menus');
  // every card: logo or name, a line in their own words, area · city, an Explore link
  for (let i = 0; i < 3; i++) {
    const c = cards.nth(i);
    await expect(c.locator('.menu-card-title')).toBeVisible();
    await expect(c.locator('.menu-card-quote')).not.toBeEmpty();
    await expect(c.locator('.menu-card-where')).toContainText('Lahore');
    await expect(c.locator('.menu-card-more')).toContainText('Explore menu');
  }
  // tinted by its own tokens: three different accents
  const accents = await page.locator('.menu-card-more').evaluateAll((els) => els.map((e) => getComputedStyle(e).color));
  expect(new Set(accents).size).toBe(3);
  // wording from the restaurants' own data, never invented
  await expect(cards.nth(0).locator('.menu-card-quote')).toHaveText("It's a must.");
  expect(w.errors).toEqual([]);
  expect(w.external).toEqual([]);
});

test('home: hero dish is the Haute Dolci San Sebastián, copy as briefed, no owner content', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.home-hero .overline')).toHaveText("Don't order blind.");
  await expect(page.locator('h1')).toHaveText('See it on your table. Then decide.');
  await expect(page.locator('.hero-copy')).toContainText('Scan the QR at your table. The real dish appears at true size, before you order.');
  await expect(page.locator('.hero-copy .product-action')).toHaveText('Explore menus');
  await expect(page.locator('.hero-copy .product-action')).toHaveAttribute('href', '#menus');
  await expect(page.locator('.hero-trust')).toHaveText('No app. Works in Safari and Chrome.');
  await expect(page.locator('.ar-dish')).toHaveAttribute('src', /hd-san-sebastian/);
  await expect(page.locator('.decide-beats .beat')).toHaveCount(3);
  const body = await page.locator('main').innerText();
  for (const owner of ['Grubhub', 'Kabaq', 'How it works', 'pilot', 'Book a']) expect(body).not.toContain(owner);
  await expect(page.locator('footer .footer-link')).toHaveAttribute('href', '/for-restaurants');
});

test('home: the Table Card share moment is a slim band after the menus', async ({ page }) => {
  await page.goto('/');
  const band = page.locator('.share-band');
  await expect(band).toContainText('Then show it off.');
  await expect(band.locator('.tc')).toHaveAttribute('aria-label', /Table Card/);
  const order = await page.evaluate(() => [...document.querySelectorAll('main.home > section')].map((s) => s.className.split(' ')[0]));
  expect(order).toEqual(['home-hero', 'home-menus', 'share-band']);
});

for (const [w, h] of [[360, 780], [390, 844], [1440, 900]]) {
  test(`home at ${w}px: no sideways scroll, one section gap, no empty stretches`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await page.goto('/');
    await page.emulateMedia({ reducedMotion: 'reduce' }); // everything visible, nothing mid-reveal
    await page.reload();
    await expect(page.locator('.menu-card').first()).toBeVisible();
    const m = await page.evaluate(() => {
      const sections = [...document.querySelectorAll('main.home > section')];
      const gaps = sections.slice(1).map((s, i) => Math.round(s.getBoundingClientRect().top - sections[i].getBoundingClientRect().bottom));
      const tops = [...document.querySelectorAll('.menu-card')].map((c) => Math.round(c.getBoundingClientRect().top));
      const heights = [...document.querySelectorAll('.menu-card')].map((c) => Math.round(c.getBoundingClientRect().height));
      return { overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, gaps, tops, heights };
    });
    expect(m.overflow).toBe(0);
    // the same gap between every pair of sections (the design token), never a big empty stretch
    expect(new Set(m.gaps).size).toBe(1);
    expect(m.gaps[0]).toBeGreaterThanOrEqual(48);
    expect(m.gaps[0]).toBeLessThanOrEqual(96);
    if (w >= 860) {
      expect(new Set(m.tops).size).toBe(1); // cards side by side, tops aligned
      expect(new Set(m.heights).size).toBe(1); // and the same height
    }
  });
}

test('dark mode: wide logos turn light, cards keep their own colours', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-mode-toggle]').click();
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'dark');
  const filters = await page.locator('.menu-card-logo--wide').evaluateAll((els) => els.map((e) => getComputedStyle(e).filter));
  expect(filters.length).toBe(2); // Haute Dolci wordmark and the Gauchos lockup
  for (const f of filters) expect(f).not.toBe('none');
  const surfaces = await page.locator('.menu-card').evaluateAll((els) => els.map((e) => getComputedStyle(e).backgroundColor));
  for (const s of surfaces) expect(s).not.toBe('rgb(255, 255, 255)'); // none stays a white card in dark mode
});
