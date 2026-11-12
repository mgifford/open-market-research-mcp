import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fillCandidate, openApp } from './helpers.js';

const demoJson = readFileSync(new URL('../../examples/ditap-case-management.json', import.meta.url));

test('an unsaved project field survives adding an option', async ({ page }) => {
  await openApp(page);
  await page.fill('#need', 'UNSAVED USER NEED');
  await fillCandidate(page, { name: 'Option A', url: 'https://example.gov/a' });
  await expect(page.locator('#need')).toHaveValue('UNSAVED USER NEED');
  await expect(page.locator('#preview')).toContainText('UNSAVED USER NEED');
});

test('loading the demonstration asks before replacing unsaved work', async ({ page }) => {
  await openApp(page);
  await page.fill('#need', 'WORK IN PROGRESS');

  page.once('dialog', dialog => dialog.dismiss());
  await page.click('#demo');
  await expect(page.locator('#need')).toHaveValue('WORK IN PROGRESS');

  page.once('dialog', dialog => dialog.accept());
  await page.click('#demo');
  await expect(page.locator('#need')).toHaveValue(/fictional federal team wants to replace/);
});

test('a valid import completes without an error and clears the file input', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await openApp(page);
  await page.setInputFiles('#import-file', {
    name: 'demo.json',
    mimeType: 'application/json',
    buffer: demoJson
  });
  await expect(page.locator('#status')).toContainText('imported');
  await expect(page.locator('#import-file')).toHaveValue('');
  expect(pageErrors).toEqual([]);
  await expect(page.locator('#candidate-table tr')).toHaveCount(4);
});

test('removing a row by keyboard moves focus to a logical remaining target', async ({ page }) => {
  await openApp(page);
  await fillCandidate(page, { name: 'Option A', url: 'https://example.gov/a' });
  await fillCandidate(page, { name: 'Option B', url: 'https://example.gov/b' });

  const remove = page.locator('#candidate-table button').first();
  await remove.focus();
  await page.keyboard.press('Enter');

  const active = await page.evaluate(() => ({
    tag: document.activeElement.tagName,
    label: document.activeElement.getAttribute('aria-label') || document.activeElement.textContent
  }));
  expect(active.tag).not.toBe('BODY');
  expect(active.label).toContain('Remove Option B');
});

test('repeated controls include their record in the accessible name', async ({ page }) => {
  await openApp(page);
  const names = await page.locator('#software-list button').evaluateAll(buttons =>
    buttons.map(button => button.textContent.trim())
  );
  expect(names.length).toBeGreaterThan(1);
  expect(new Set(names).size).toBe(names.length);
  expect(names.every(name => /^Record as research option: .+/.test(name))).toBe(true);
});

test('invalid URLs are associated with the field and the field receives focus', async ({ page }) => {
  await openApp(page);
  await page.fill('#candidate-name', 'Unsafe URL');
  await page.fill('#candidate-url', 'http://example.org');
  await page.click('#candidate-form button[type=submit]');

  await expect(page.locator('#candidate-url')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#candidate-url')).toHaveAttribute('aria-describedby', 'candidate-url-error');
  await expect(page.locator('#candidate-url-error')).toBeVisible();
  await expect(page.locator('#candidate-url')).toBeFocused();

  await page.fill('#candidate-url', 'https://example.gov/ok');
  await expect(page.locator('#candidate-url')).not.toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#candidate-url-error')).toBeHidden();
});

test('filtering announces a concise result count after a pause', async ({ page }) => {
  await openApp(page);
  await page.fill('#source-search', 'accessibility');
  await expect(page.locator('#source-status')).toHaveText(/of \d+ sources match/, { timeout: 2000 });
});

test('candidate source and ACR links name the candidate', async ({ page }) => {
  await openApp(page);
  await fillCandidate(page, {
    name: 'Named option',
    url: 'https://example.gov/product',
    acrUrl: 'https://example.gov/acr'
  });
  const names = await page.locator('#candidate-table a').evaluateAll(links =>
    links.map(link => link.textContent.trim())
  );
  expect(names).toEqual(['View source: Named option', 'Open ACR link: Named option']);
});
