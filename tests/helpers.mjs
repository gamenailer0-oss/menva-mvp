// Shared helpers for the diner tests.
import { expect } from '@playwright/test';

// Collect console errors, page errors (incl. CSP violations) and any request to another origin.
export function watch(page) {
  const errors = [];
  const external = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (['data:', 'blob:'].includes(u.protocol)) return;
    if (!['localhost', '127.0.0.1'].includes(u.hostname)) external.push(r.url());
  });
  return { errors, external };
}

export async function openDish(page, id) {
  await page.locator(`[data-dish="${id}"]`).click();
  await expect(page.locator('dialog[open]')).toBeVisible();
}

export const tier = (page) => page.locator('.dish-stage').getAttribute('data-tier');
export const events = (page) => page.evaluate(() => window.__menvaEvents.map((e) => e.event));
export const glbRequested = (requests) => requests.some((u) => u.includes('model.glb'));

// Waits until the dish sheet has settled on a tier.
export async function settled(page, timeout = 60_000) {
  await expect(page.locator('.dish-stage[data-tier]')).toHaveCount(1, { timeout });
}
