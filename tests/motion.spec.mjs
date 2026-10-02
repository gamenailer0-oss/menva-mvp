// Motion + tokens pass: the wordmark always links home, even from a restaurant menu.
import { test, expect } from '@playwright/test';

test('wordmark on a restaurant page links back to MENVA home', async ({ page }) => {
  await page.goto('/g/12');
  const wordmark = page.locator('.wordmark');
  await expect(wordmark).toHaveAttribute('href', '/');
  await wordmark.click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('.menu-card').first()).toBeVisible(); // Haute Dolci card (homeOrder 1)
});
