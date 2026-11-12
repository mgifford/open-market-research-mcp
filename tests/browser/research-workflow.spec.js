import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { openApp } from './helpers.js';

const legacy = readFileSync(new URL('../../examples/ditap-case-management-0.1.0.json', import.meta.url));

async function addQuestion(page, text = 'Are there reusable government systems?') {
  await page.fill('#question-text', text);
  await page.selectOption('#question-category', 'government-reuse');
  await page.selectOption('#question-status', 'in-progress');
  await page.click('#question-form button[type=submit]');
  await expect(page.locator('#question-table')).toContainText(text);
}

async function addSearch(page, status = 'completed-with-results') {
  const questionId = await page.locator('#search-question option').nth(1).getAttribute('value');
  await page.selectOption('#search-question', questionId);
  await page.fill('#search-source-name', 'Example public inventory');
  await page.fill('#search-source-url', 'https://example.gov/inventory');
  await page.selectOption('#search-source-type', 'public-repository');
  await page.selectOption('#search-authority', 'public-repository');
  await page.selectOption('#search-method', 'manual');
  await page.fill('#search-date', '2026-11-12T10:00');
  await page.fill('#search-result-count', status === 'completed-without-results' ? '0' : '2');
  await page.selectOption('#search-status', status);
  await page.click('#search-form button[type=submit]');
  await expect(page.locator('#search-table')).toContainText('Example public inventory');
}

async function addEvidence(page) {
  const searchId = await page.locator('#evidence-search option').nth(1).getAttribute('value');
  await page.selectOption('#evidence-search', searchId);
  await page.fill('#evidence-source-name', 'Example public inventory record');
  await page.fill('#evidence-source-url', 'https://example.gov/inventory/record-1');
  await page.fill('#evidence-source-id', 'record-1');
  await page.fill('#evidence-retrieved', '2026-11-12T10:05');
  await page.selectOption('#evidence-type', 'government-software-metadata');
  await page.fill('#evidence-version', '1.0');
  await page.fill('#evidence-claim', 'A fictional reusable system is listed.');
  await page.fill('#evidence-limitations', 'Metadata does not establish suitability.');
  await page.click('#evidence-form button[type=submit]');
  await expect(page.locator('#evidence-table')).toContainText('Example public inventory record');
}

test('records a question-to-evidence workflow and reports it', async ({ page }) => {
  await openApp(page);
  await page.fill('#project-name', 'Fictional workflow test');
  await page.fill('#ict-type', 'Web application');
  await page.fill('#need', 'A fictional need for reusable case management.');
  await page.click('#project-form button[type=submit]');

  await addQuestion(page);
  await addSearch(page);
  await addEvidence(page);

  await page.fill('#finding-description', 'A listed government system may be reusable.');
  await page.locator('#finding-supporting input').first().check();
  await page.click('#finding-form button[type=submit]');
  await expect(page.locator('#finding-table')).toContainText('may be reusable');

  await page.fill('#decision-description', 'Ask the owning agency about reuse rights.');
  await page.selectOption('#decision-type', 'reuse-rights');
  await page.click('#decision-form button[type=submit]');
  await expect(page.locator('#decision-table')).toContainText('reuse rights');

  await expect(page.locator('#preview')).toContainText('## Research questions');
  await expect(page.locator('#preview')).toContainText('## Sources actually investigated');
  await expect(page.locator('#preview')).toContainText('## Findings, contradictions, and evidence gaps');
  await expect(page.locator('#preview')).toContainText('Example public inventory record');
});

test('editing a question updates the visible record', async ({ page }) => {
  await openApp(page);
  await addQuestion(page, 'Original question');
  await page.locator('#question-table button', { hasText: 'Edit' }).first().click();
  await page.fill('#question-text', 'Updated question');
  await page.click('#question-form button[type=submit]');
  await expect(page.locator('#question-table')).toContainText('Updated question');
  await expect(page.locator('#question-table')).not.toContainText('Original question');
});

test('removing a question confirms and moves focus to a logical heading', async ({ page }) => {
  await openApp(page);
  await addQuestion(page, 'First question');
  await addQuestion(page, 'Second question');
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#question-table button', { hasText: 'Remove' }).first().click();
  await expect(page.locator('#question-table')).not.toContainText('First question');
  const active = await page.evaluate(() => document.activeElement.id);
  expect(active).toBe('questions-heading');
});

test('completed-without-results is distinct from failed and cited as such', async ({ page }) => {
  await openApp(page);
  await addQuestion(page);
  await addSearch(page, 'completed-without-results');
  await expect(page.locator('#search-table')).toContainText('Completed without matching records');
  await expect(page.locator('#preview')).toContainText('without matching records: 1');
});

test('legacy import migrates and does not invent searches', async ({ page }) => {
  await openApp(page);
  await page.setInputFiles('#import-file', {
    name: 'legacy.json',
    mimeType: 'application/json',
    buffer: legacy
  });
  await expect(page.locator('#status')).toContainText('Migrated from schema 0.1.0');
  await expect(page.locator('#search-table')).toContainText('No searches recorded');
  await expect(page.locator('#candidate-table tr')).toHaveCount(2);
});

test('accessibility requirements save and appear in the report', async ({ page }) => {
  await openApp(page);
  await page.check('#accessibility-identified');
  await page.fill('#accessibility-tool', 'GSA ART');
  await page.fill('#accessibility-reviewer', 'Fictional specialist');
  await page.fill('#accessibility-as-of', '2026-11-12');
  await page.click('#accessibility-form button[type=submit]');
  await expect(page.locator('#status')).toContainText('Accessibility requirements saved');
  await page.click('#show-preview');
  await expect(page.locator('#preview')).toContainText('Requirements identified: Yes');
  await expect(page.locator('#preview')).toContainText('GSA ART');
});

test('the About local MCP section is static and does not imply live data', async ({ page }) => {
  await openApp(page);
  const section = page.locator('#local-mcp');
  await expect(section).toContainText('About the local MCP');
  await expect(section).toContainText('This page does not display live MCP data');
  await expect(section).toContainText('cannot start or reach a local stdio MCP server');
  await expect(section).toContainText('Eight read-only tools');
  await expect(section).not.toContainText('live MCP connection');
  await page.getByRole('link', { name: 'MCP', exact: true }).click();
  await expect(page).toHaveURL(/#local-mcp$/);
});

test('expanded fictional case shows conflicts, missing ACRs, and search states', async ({ page }) => {
  await openApp(page);
  await page.click('#demo');
  await expect(page.locator('#need')).not.toHaveValue('');
  await expect(page.locator('#question-table tr')).toHaveCount(6);
  await expect(page.locator('#search-table tr')).toHaveCount(7);
  await expect(page.locator('#evidence-table tr')).toHaveCount(4);
  await expect(page.locator('#finding-table tr')).toHaveCount(3);
  await expect(page.locator('#decision-table tr')).toHaveCount(6);
  await expect(page.locator('#search-table')).toContainText('Completed without matching records');
  await expect(page.locator('#search-table')).toContainText('Failed');
  await expect(page.locator('#search-table')).toContainText('Not searched');
  await expect(page.locator('#candidate-table')).toContainText('ACR found for 4.2');
  await expect(page.locator('#preview')).toContainText('Contradictory evidence: ev-reuse-archive');
  await expect(page.locator('#preview')).toContainText('without matching records: 1');
  await expect(page.locator('#preview')).toContainText('failed: 1');
});
