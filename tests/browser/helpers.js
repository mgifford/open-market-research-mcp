import { expect } from '@playwright/test';

export async function openApp(page) {
  await page.goto('/');
  await expect(page.locator('#source-count')).toContainText('sources');
}

export async function fillCandidate(page, { name, url = '', acrUrl = '' }) {
  await page.fill('#candidate-name', name);
  await page.fill('#candidate-url', url);
  await page.fill('#acr-url', acrUrl);
  await page.click('#candidate-form button[type=submit]');
}

export function contrastRatio(foreground, background) {
  const parse = value => {
    let hex = value.trim().replace('#', '');
    if (hex.length === 3) hex = [...hex].map(channel => channel + channel).join('');
    return [0, 2, 4].map(index => parseInt(hex.slice(index, index + 2), 16) / 255);
  };
  const luminance = value => {
    const [r, g, b] = parse(value).map(channel =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    );
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}
