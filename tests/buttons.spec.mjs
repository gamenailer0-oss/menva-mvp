// Walkthrough: press every button and link a diner can reach, screen by screen. Each step is named
// so the report reads as a checklist. Run against a live site with BASE_URL=https://… npx playwright test buttons
import { test, expect } from '@playwright/test';
import { watch } from './helpers.mjs';

test('home page: every button and link', async ({ page }) => {
  const w = watch(page);
  await page.goto('/');

  await test.step('shows the hero, the Gauchos section and "How it works"', async () => {
    await expect(page.locator('h1')).toContainText('See it.');
    await expect(page.locator('.pilot-card')).toBeVisible();
    await expect(page.locator('.pilot-dishes li')).toHaveCount(3);
    await expect(page.locator('.home-how li')).toHaveCount(3);
  });

  await test.step('theme toggle switches dark and back to light', async () => {
    const mode = () => page.evaluate(() => document.documentElement.dataset.mode);
    expect(await mode()).toBe('light');
    await page.locator('[data-mode-toggle]').click();
    expect(await mode()).toBe('dark');
    await page.locator('[data-mode-toggle]').click();
    expect(await mode()).toBe('light');
  });

  await test.step('"Open the Gauchos menu" opens the menu', async () => {
    await page.getByRole('link', { name: /Open the Gauchos menu/ }).click();
    await expect(page).toHaveURL(/\/g$/);
    await expect(page.locator('.dish-card').first()).toBeVisible();
    await page.goBack();
  });

  await test.step('Gauchos card opens the menu', async () => {
    await page.locator('.pilot-card').click();
    await expect(page).toHaveURL(/\/g$/);
    await page.goBack();
  });

  await test.step('"See the full menu" opens the menu', async () => {
    await page.locator('.pilot-more').click();
    await expect(page).toHaveURL(/\/g$/);
    await page.goBack();
  });

  const names = await page.locator('.pilot-dish-name').allTextContents();
  for (const [i, name] of names.entries()) {
    await test.step(`dish photo "${name}" opens that dish`, async () => {
      await page.locator('.pilot-dishes a').nth(i).click();
      await expect(page.locator('dialog[open] #dish-title')).toHaveText(name);
      await expect(page).toHaveURL(/\/g$/); // ?dish= removed so a reload shows the menu
      await page.goto('/');
    });
  }

  expect(w.errors).toEqual([]);
  expect(w.external).toEqual([]);
});

test('menu page: every button and link', async ({ page }) => {
  const w = watch(page);
  await page.goto('/g/12');

  await test.step('shows the table number', async () => {
    await expect(page.locator('.table-chip')).toHaveText('Table 12');
  });

  await test.step('theme toggle works on the menu', async () => {
    await page.locator('[data-mode-toggle]').click();
    expect(await page.evaluate(() => document.documentElement.dataset.mode)).toBe('dark');
    await page.locator('[data-mode-toggle]').click();
  });

  const links = page.locator('.cat-link');
  const count = await links.count();
  for (let i = 0; i < count; i++) {
    const label = (await links.nth(i).textContent()).trim();
    await test.step(`category "${label}" scrolls to its dishes`, async () => {
      await links.nth(i).click();
      const heading = page.locator('.menu-category > h3', { hasText: label });
      await expect(heading).toBeInViewport();
    });
  }

  const cards = page.locator('[data-dish]');
  const n = await cards.count();
  for (let i = 0; i < n; i++) {
    const id = await cards.nth(i).getAttribute('data-dish');
    await test.step(`dish "${id}" opens, closes with ×, and returns focus`, async () => {
      await cards.nth(i).click();
      await expect(page.locator('dialog[open]')).toBeVisible();
      await expect(page.locator('.pass-blur')).toBeVisible();
      await page.locator('.close-dialog').click();
      await expect(page.locator('dialog[open]')).toHaveCount(0);
      await expect(cards.nth(i)).toBeFocused();
    });
  }

  expect(w.errors).toEqual([]);
  expect(w.external).toEqual([]);
});

test('dish sheet: every control', async ({ page }) => {
  const w = watch(page);
  await page.goto('/g/12');
  await page.locator('[data-dish="steak-main"]').click();

  await test.step('tapping the dish while it loads answers "Almost ready"', async () => {
    const state = await page.locator('.pass').getAttribute('data-state');
    if (state === 'loading') {
      await page.locator('.pass').click({ position: { x: 20, y: 20 } });
      await expect(page.locator('.pass-line')).toHaveText('Almost ready');
    }
  });

  await test.step('3D view arrives and "Reset" is shown', async () => {
    await expect(page.locator('.pass[data-state="live"]')).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('.reset-view')).toBeVisible();
  });

  await test.step('dragging turns the dish; "Reset" puts it back', async () => {
    const mv = page.locator('model-viewer');
    const orbit = () => mv.evaluate((el) => el.getCameraOrbit().theta.toFixed(2));
    const before = await orbit();
    const box = await mv.boundingBox();
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2, { steps: 10 });
    await page.mouse.up();
    await expect.poll(orbit).not.toBe(before);
    await page.locator('.reset-view').click();
    await expect.poll(orbit, { timeout: 5000 }).toBe(before);
  });

  await test.step('"Nutrition" opens and closes', async () => {
    const details = page.locator('details.nutrition');
    await details.locator('summary').click();
    await expect(details).toHaveAttribute('open', '');
    await details.locator('summary').click();
    await expect(details).not.toHaveAttribute('open', '');
  });

  await test.step('"Back to menu" closes the sheet', async () => {
    await page.locator('.back-menu').click();
    await expect(page.locator('dialog[open]')).toHaveCount(0);
  });

  await test.step('Escape closes the sheet', async () => {
    await page.locator('[data-dish="steak-sandwich"]').click();
    await expect(page.locator('dialog[open]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('dialog[open]')).toHaveCount(0);
  });

  expect(w.errors).toEqual([]);
});

test('AR button (tier 2) calls AR with the model loaded', async ({ page }) => {
  await page.goto('/g/12?tier=2');
  await page.locator('[data-dish="steak-main"]').click();
  await expect(page.locator('.ar-btn')).toBeVisible({ timeout: 60_000 });
  // Replace the real launch (it would leave the page) and check the button reaches it.
  await page.locator('model-viewer').evaluate((el) => { el.activateAR = () => { window.__arCalled = el.loaded; }; });
  await page.locator('.ar-btn').click();
  expect(await page.evaluate(() => window.__arCalled)).toBe(true);
  expect(await page.evaluate(() => window.__menvaEvents.map((e) => e.event))).toContain('ar_launch');
});

test('error screens: every button', async ({ page }) => {
  await test.step('"Go to MENVA" on a wrong link goes home', async () => {
    await page.goto('/nowhere/4');
    await page.getByRole('link', { name: /Go to MENVA/ }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('.pilot-card')).toBeVisible();
  });

  await test.step('"Try again" after the menu failed to load', async () => {
    await page.route('**/data/menu.json', (r) => r.fulfill({ status: 500, body: '' }));
    await page.goto('/g/5');
    await expect(page.locator('h1')).toHaveText("The menu didn't load.");
    await page.unroute('**/data/menu.json');
    await page.getByRole('button', { name: /Try again/ }).click();
    await expect(page.locator('.dish-card').first()).toBeVisible();
  });

  await test.step('home page still links to Gauchos when the menu data is down', async () => {
    await page.route('**/data/menu.json', (r) => r.fulfill({ status: 500, body: '' }));
    await page.goto('/');
    await expect(page.getByRole('link', { name: /Open the Gauchos menu/ })).toHaveAttribute('href', '/g');
  });
});
