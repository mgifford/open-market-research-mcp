import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { contrastRatio, fillCandidate, openApp } from './helpers.js';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'];

test('default state has no automated WCAG A/AA violations', async ({ page }) => {
  await openApp(page);
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(results.violations).toEqual([]);
});

test('loaded demonstration state has no automated violations', async ({ page }) => {
  await openApp(page);
  page.once('dialog', dialog => dialog.accept());
  await page.click('#demo');
  await expect(page.locator('#need')).not.toHaveValue('');
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(results.violations).toEqual([]);
});

test('page reflows at 320 CSS pixels and the table has a keyboard region', async ({ page }) => {
  await openApp(page);
  await fillCandidate(page, {
    name: 'A long option name that needs room in the table',
    url: 'https://example.gov/a/very/long/path/that/needs/horizontal/space'
  });
  await page.setViewportSize({ width: 320, height: 800 });
  const pageOverflow = await page.evaluate(() =>
    document.documentElement.scrollWidth > window.innerWidth
  );
  expect(pageOverflow).toBe(false);

  const wrapper = page.locator('.table-wrap');
  await expect(wrapper).toHaveAttribute('role', 'region');
  await expect(wrapper).toHaveAttribute('tabindex', '0');
  const scrollable = await wrapper.evaluate(el => el.scrollWidth > el.clientWidth);
  expect(scrollable).toBe(true);

  await wrapper.focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => wrapper.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
});

test('focus indicators meet 3:1 contrast on light and header surfaces', async ({ page }) => {
  await openApp(page);
  const colors = await page.evaluate(() => {
    const styles = getComputedStyle(document.documentElement);
    return {
      focus: styles.getPropertyValue('--focus'),
      focusInverse: styles.getPropertyValue('--focus-inverse'),
      surface: styles.getPropertyValue('--surface'),
      background: styles.getPropertyValue('--bg')
    };
  });
  expect(contrastRatio(colors.focus, colors.surface)).toBeGreaterThanOrEqual(3);
  expect(contrastRatio(colors.focus, colors.background)).toBeGreaterThanOrEqual(3);
  expect(contrastRatio(colors.focusInverse, '#103c3e')).toBeGreaterThanOrEqual(3);
});

test('the file import control shows visible focus on its label', async ({ page }) => {
  await openApp(page);
  await page.locator('#import-file').focus();
  const result = await page.evaluate(() => {
    const input = document.getElementById('import-file');
    const label = input.closest('label');
    const style = getComputedStyle(label);
    return {
      active: document.activeElement.id,
      outlineStyle: style.outlineStyle,
      outlineWidth: parseFloat(style.outlineWidth)
    };
  });
  expect(result.active).toBe('import-file');
  expect(result.outlineStyle).not.toBe('none');
  expect(result.outlineWidth).toBeGreaterThanOrEqual(2);
});

test('focus remains visible in forced-colors mode', async ({ page }) => {
  await openApp(page);
  await page.emulateMedia({ forcedColors: 'active' });
  await page.locator('#demo').focus();
  const outline = await page.locator('#demo').evaluate(el => {
    const style = getComputedStyle(el);
    return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
  });
  expect(outline.style).not.toBe('none');
  expect(outline.width).toBeGreaterThanOrEqual(2);
});
