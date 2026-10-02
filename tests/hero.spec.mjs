// Home hero: scan → appears → on your table. The markup is the key frame (dish on the table beside the
// phone) so it paints at once; the loop starts inside that frame. See css/hero.css.
import { test, expect } from '@playwright/test';

const LOOP_MS = 9000;
// Put every hero animation at `pct` % of the loop (the loop starts at 72 %, via a negative delay).
const seek = (page, pct) => page.evaluate(([p, loop]) => {
  document.getAnimations().forEach((a) => {
    a.pause();
    const d = a.effect.getTiming().delay;
    a.currentTime = ((((p / 100) * loop + d) % loop) + loop) % loop;
  });
}, [pct, LOOP_MS]);
const opacity = (page, sel) => page.locator(sel).evaluate((el) => +getComputedStyle(el).opacity);
const ringOpacity = (page, sel) => page.locator(sel).evaluate((el) => +getComputedStyle(el, '::after').opacity);

test('hero: the dish is on the table at first paint — full opacity, sized, high priority', async ({ page }) => {
  await page.goto('/');
  // The loop starts inside the key frame: at animation time 0 (what first paints) the dish is already
  // on the table at full opacity. (Reading at time 0 keeps this independent of how slow the machine is.)
  await page.waitForSelector('.ar-dish', { state: 'attached' });
  const first = await page.evaluate(() => {
    document.getAnimations().forEach((x) => { x.pause(); x.currentTime = 0; });
    const o = (s) => +getComputedStyle(document.querySelector(s)).opacity;
    return { dish: o('.ar-dish'), label: o('.ar-label'), placed: o('.ar-chip-placed'), delay: document.querySelector('.ar-dish').getAnimations()[0].effect.getTiming().delay };
  });
  expect(first).toEqual({ dish: 1, label: 1, placed: 1, delay: -6480 });
  const dish = page.locator('.ar-dish');
  await expect(dish).toHaveAttribute('width', /^\d+$/);
  await expect(dish).toHaveAttribute('height', /^\d+$/);
  await expect(dish).toHaveAttribute('fetchpriority', 'high');
  await expect(dish).toHaveAttribute('alt', '');
  await expect.poll(() => dish.evaluate((i) => i.naturalWidth)).toBeGreaterThan(0); // real pixels, not a placeholder
});

test('hero: the beats advance — scan, appears, on your table, decide — and the 3-step strip follows', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.ar-dish')).toBeVisible();

  await seek(page, 17); // beat 1: scan
  expect(await opacity(page, '.ar-chip-scan')).toBe(1);
  expect(await opacity(page, '.ar-scan')).toBe(1);
  expect(await opacity(page, '.ar-dish')).toBe(0);
  expect(await ringOpacity(page, '.beat-1 .beat-icon')).toBe(1);

  await seek(page, 42); // beat 2: the dish appears on the phone
  expect(await opacity(page, '.ar-chip-open')).toBe(1);
  expect(await opacity(page, '.ar-dish-s')).toBe(1);
  expect(await opacity(page, '.ar-pill-see')).toBe(1);
  expect(await opacity(page, '.ar-dish')).toBe(0);
  expect(await ringOpacity(page, '.beat-2 .beat-icon')).toBe(1);

  await seek(page, 70); // beat 3: on your table
  expect(await opacity(page, '.ar-dish')).toBe(1);
  expect(await opacity(page, '.ar-dish-s')).toBe(0);
  expect(await opacity(page, '.ar-chip-placed')).toBe(1);
  expect(await opacity(page, '.ar-label')).toBe(1);
  expect(await ringOpacity(page, '.beat-2 .beat-icon')).toBe(1);

  await seek(page, 85); // beat 4: decide
  expect(await opacity(page, '.ar-chip-waiter')).toBe(1);
  expect(await opacity(page, '.ar-dish')).toBe(1);
  expect(await ringOpacity(page, '.beat-3 .beat-icon')).toBe(1);

  await seek(page, 99.5); // clean reset
  expect(await opacity(page, '.ar-dish')).toBe(0);
});

test('hero: the loop really runs, and pauses when the hero is off screen', async ({ page }) => {
  await page.goto('/');
  const t = () => page.evaluate(() => document.querySelector('.ar-hand').getAnimations()[0].currentTime);
  const a = await t();
  await page.waitForTimeout(400);
  expect(await t()).toBeGreaterThan(a);
  await page.evaluate(() => { document.querySelector('.home-hero').style.marginBottom = '3000px'; window.scrollTo(0, 2400); });
  await expect(page.locator('.home-hero')).toHaveClass(/is-offscreen/);
  const paused = await t();
  await page.waitForTimeout(300);
  expect(await t()).toBe(paused);
});

test('hero under reduced motion: the static key frame, nothing running', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.ar-dish')).toBeVisible();
  const state = await page.evaluate(() => ({
    running: document.getAnimations().filter((x) => x instanceof CSSAnimation && x.playState === 'running' && x.effect?.target?.closest?.('.home-hero')).length,
    dish: +getComputedStyle(document.querySelector('.ar-dish')).opacity,
    dishScreen: +getComputedStyle(document.querySelector('.ar-dish-s')).opacity,
    chips: [...document.querySelectorAll('.ar-chip')].map((c) => +getComputedStyle(c).opacity),
    label: +getComputedStyle(document.querySelector('.ar-label')).opacity,
    rule: getComputedStyle(document.querySelector('.ar-rule')).transform,
  }));
  expect(state.running).toBe(0);
  expect(state.dish).toBe(1);
  expect(state.dishScreen).toBe(0);
  expect(state.chips).toEqual([0, 0, 1, 0]); // only "Placed on your table"
  expect(state.label).toBe(1);
  expect(state.rule).toBe('none');
  await expect(page.locator('.ar-demo')).toContainText('true size');
});

test('hero fits a 360 px phone without sideways scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/');
  await expect(page.locator('.ar-dish')).toBeVisible();
  const [scroll, box] = await page.evaluate(() => [document.documentElement.scrollWidth, document.querySelector('.ar-demo').getBoundingClientRect().width]);
  expect(scroll).toBeLessThanOrEqual(360);
  expect(box).toBeGreaterThan(300);
});
