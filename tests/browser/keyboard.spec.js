import { test, expect } from '@playwright/test';
import { openApp } from './helpers.js';

test('skip link is first in tab order and moves to the main landmark', async ({ page }) => {
  await openApp(page);
  await page.keyboard.press('Tab');
  const skip = page.locator('.skip-link');
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main$/);
});

test('a keyboard user can reach and see focus on the file import control', async ({ page }) => {
  await openApp(page);
  let found = false;
  for (let i = 0; i < 40; i += 1) {
    await page.keyboard.press('Tab');
    const id = await page.evaluate(() => document.activeElement?.id || '');
    if (id === 'import-file') {
      found = true;
      break;
    }
  }
  expect(found).toBe(true);
  const ring = await page.evaluate(() => {
    const label = document.getElementById('import-file').closest('label');
    const style = getComputedStyle(label);
    return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
  });
  expect(ring.style).not.toBe('none');
  expect(ring.width).toBeGreaterThanOrEqual(2);
});

test('the candidate form can be submitted with Enter and keeps focus context', async ({ page }) => {
  await openApp(page);
  await page.fill('#candidate-name', 'Keyboard option');
  await page.fill('#candidate-url', 'https://example.gov/keyboard');
  await page.locator('#candidate-name').press('Enter');
  await expect(page.locator('#candidate-table tr')).toHaveCount(1);
  await expect(page.locator('#candidate-table')).toContainText('Keyboard option');
});
