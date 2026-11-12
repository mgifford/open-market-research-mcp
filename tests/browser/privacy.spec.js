import { test, expect } from '@playwright/test';
import { openApp } from './helpers.js';

test('the app makes no cross-origin requests during the core flow', async ({ page }) => {
  const origins = new Set();
  page.on('request', request => origins.add(new URL(request.url()).origin));
  await openApp(page);
  const appOrigin = new URL(page.url()).origin;
  await page.click('#demo');
  await expect(page.locator('#need')).not.toHaveValue('');
  expect([...origins]).toEqual([appOrigin]);
});
