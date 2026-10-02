// "Show the waiter" — CLAUDE.md Phase 7. The diner's own local list, never sent anywhere.
import { test, expect } from '@playwright/test';
import { watch, openDish, events } from './helpers.mjs';

const DISH = 'steak-main';
const DISH_NAME = 'Premium Ribeye Steak';

test('add a dish, the pill shows the count, and "Show the waiter" reads it back', async ({ page }) => {
  const w = watch(page);
  await page.goto('/g/12');
  await openDish(page, DISH);

  await expect(page.locator('.tray-add-btn')).toHaveText('Add to my table');
  await page.locator('.tray-step[data-step="1"]').click();
  await expect(page.locator('.tray-qty')).toHaveText('2');
  await page.locator('.tray-note').fill('medium rare');
  await page.locator('.tray-add-btn').click();
  await expect(page.locator('.tray-add-btn')).toHaveText('Added');
  await expect(page.locator('.tray-add-status')).toContainText('2');

  await page.locator('.close-dialog').click();
  await expect(page.locator('dialog[open]')).toHaveCount(0);

  const pill = page.locator('.tray-pill');
  await expect(pill).toBeVisible();
  await expect(pill).toHaveText('Show the waiter · 2');

  await pill.click();
  const waiter = page.locator('#waiter-dialog');
  await expect(waiter).toBeVisible();
  await expect(page.locator('#waiter-title')).toHaveText('Table 12');
  await expect(page.locator('.waiter-hint')).toHaveText('Turn your screen toward your server.');
  await expect(page.locator('.waiter-item-qty')).toHaveText('2 ×');
  await expect(page.locator('.waiter-item-name')).toHaveText(DISH_NAME);
  await expect(page.locator('.waiter-item-note')).toHaveText('medium rare');

  const evts = await events(page);
  expect(evts).toContain('tray_add');
  expect(evts).toContain('waiter_view');

  expect(w.errors).toEqual([]);
  expect(w.external).toEqual([]);
});

test('reopening the dish shows "Update my table" prefilled', async ({ page }) => {
  await page.goto('/g/12');
  await openDish(page, DISH);
  await page.locator('.tray-step[data-step="1"]').click();
  await page.locator('.tray-add-btn').click();
  await page.locator('.close-dialog').click();

  await openDish(page, DISH);
  await expect(page.locator('.tray-add-btn')).toHaveText('Update my table');
  await expect(page.locator('.tray-qty')).toHaveText('2');
});

test('the tray persists across reload; a different table starts empty', async ({ page }) => {
  await page.goto('/g/12');
  await openDish(page, DISH);
  await page.locator('.tray-add-btn').click();
  await page.locator('.close-dialog').click();
  await expect(page.locator('.tray-pill')).toHaveText('Show the waiter · 1');

  await page.reload();
  await expect(page.locator('.tray-pill')).toHaveText('Show the waiter · 1');

  await page.goto('/g/7');
  await expect(page.locator('.tray-pill')).toBeHidden();
});

test('entries older than 4 hours are dropped', async ({ page }) => {
  await page.addInitScript(() => {
    const stale = { updated: Date.now() - 5 * 60 * 60 * 1000, items: [{ id: 'steak-main', qty: 1, note: '' }] };
    localStorage.setItem('menva:tray:gauchos:12', JSON.stringify(stale));
  });
  await page.goto('/g/12');
  await expect(page.locator('.tray-pill')).toBeHidden();
});

test('a note with markup renders as text, not markup', async ({ page }) => {
  await page.goto('/g/12');
  await openDish(page, DISH);
  await page.locator('.tray-note').fill('<img src=x onerror=alert(1)>');
  await page.locator('.tray-add-btn').click();
  await page.locator('.close-dialog').click();
  await page.locator('.tray-pill').click();

  await expect(page.locator('.waiter-item-note')).toHaveText('<img src=x onerror=alert(1)>');
  expect(await page.locator('.waiter-item-note img').count()).toBe(0);
});

test('Escape closes the waiter view and returns focus; "Clear the list" empties it', async ({ page }) => {
  await page.goto('/g/12');
  await openDish(page, DISH);
  await page.locator('.tray-add-btn').click();
  await page.locator('.close-dialog').click();

  const pill = page.locator('.tray-pill');
  await pill.click();
  await expect(page.locator('#waiter-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#waiter-dialog[open]')).toHaveCount(0);
  await expect(pill).toBeFocused();

  await pill.click();
  await page.locator('.waiter-clear').click();
  await expect(page.locator('.waiter-clear')).toHaveText('Tap again to clear');
  await page.locator('.waiter-clear').click();
  await expect(page.locator('#waiter-dialog[open]')).toHaveCount(0);
  await expect(pill).toBeHidden();
});

test('no console errors or external requests while using the tray', async ({ page }) => {
  const w = watch(page);
  await page.goto('/g/12');
  await openDish(page, DISH);
  await page.locator('.tray-add-btn').click();
  await page.locator('.close-dialog').click();
  await page.locator('.tray-pill').click();
  await page.locator('.waiter-edit-plus').click();
  await page.locator('.waiter-edit-minus').click();
  await page.keyboard.press('Escape');
  expect(w.errors).toEqual([]);
  expect(w.external).toEqual([]);
});

test('"Show the waiter" hierarchy: restaurant mark, then a very large table number, then the list, then the hint', async ({ page }) => {
  await page.goto('/g/12');
  await openDish(page, DISH);
  await page.locator('.tray-add-btn').click();
  await page.locator('.close-dialog').click();
  await page.locator('.tray-pill').click();

  await page.waitForTimeout(400);
  const top = await page.locator('.waiter-brand').boundingBox();
  const title = await page.locator('#waiter-title').boundingBox();
  const row = await page.locator('.waiter-item-row .waiter-item-name').boundingBox();
  const hint = await page.locator('.waiter-hint').boundingBox();
  expect(top.y).toBeLessThan(title.y);
  expect(title.y + title.height).toBeLessThan(row.y);
  expect(row.y).toBeLessThan(hint.y);

  const sizes = await page.evaluate(() => ({
    table: parseFloat(getComputedStyle(document.getElementById('waiter-title')).fontSize),
    item: parseFloat(getComputedStyle(document.querySelector('.waiter-item-name')).fontSize),
    hint: parseFloat(getComputedStyle(document.querySelector('.waiter-hint')).fontSize),
  }));
  expect(sizes.table).toBeGreaterThanOrEqual(56); // readable at arm's length
  expect(sizes.item).toBeGreaterThanOrEqual(24);
  expect(sizes.table).toBeGreaterThan(sizes.item * 2);
  expect(sizes.item).toBeGreaterThan(sizes.hint);
});

test('guest edit controls are at least 44px', async ({ page }) => {
  await page.goto('/g/12');
  await openDish(page, DISH);
  await page.locator('.tray-add-btn').click();
  await page.locator('.close-dialog').click();
  await page.locator('.tray-pill').click();
  for (const sel of ['.waiter-edit-minus', '.waiter-edit-plus', '.waiter-edit-remove', '.waiter-done', '.waiter-clear']) {
    const box = await page.locator(sel).boundingBox();
    expect(box.height, sel).toBeGreaterThanOrEqual(44);
    expect(box.width, sel).toBeGreaterThanOrEqual(44);
  }
});

test('changing the quantity updates in place: same row element, focus kept, nothing around it moves', async ({ page }) => {
  await page.goto('/g/12');
  await openDish(page, DISH);
  await page.locator('.tray-add-btn').click();
  await page.locator('.close-dialog').click();
  await page.locator('.tray-pill').click();

  await page.waitForTimeout(400); // let the dialog's settle animation finish before measuring
  await page.evaluate(() => { document.querySelector('.waiter-item').dataset.mark = 'same'; });
  const before = await page.locator('.waiter-hint').boundingBox();
  const nameBefore = await page.locator('.waiter-item-name').boundingBox();

  const plus = page.locator('.waiter-edit-plus');
  await plus.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.waiter-item-qty')).toHaveText('2 ×');
  await page.keyboard.press('Enter');
  await expect(page.locator('.waiter-item-qty')).toHaveText('3 ×');

  await expect(page.locator('.waiter-item')).toHaveAttribute('data-mark', 'same'); // not re-rendered
  await expect(plus).toBeFocused();
  expect(await page.locator('.waiter-hint').boundingBox()).toEqual(before);
  expect(await page.locator('.waiter-item-name').boundingBox()).toEqual(nameBefore);

  // Removing the last row keeps focus inside the dialog and shows the empty state
  await page.locator('.waiter-edit-remove').click();
  await expect(page.locator('.waiter-empty')).toBeVisible();
  await expect(page.locator('.waiter-clear')).toBeHidden();
  await expect(page.locator('.waiter-done')).toBeFocused();
});

test('"Clear the list" stays a two-tap action', async ({ page }) => {
  await page.goto('/g/12');
  await openDish(page, DISH);
  await page.locator('.tray-add-btn').click();
  await page.locator('.close-dialog').click();
  await page.locator('.tray-pill').click();
  await page.locator('.waiter-clear').click();
  await expect(page.locator('#waiter-dialog')).toBeVisible();
  await expect(page.locator('.waiter-item')).toHaveCount(1);
});
