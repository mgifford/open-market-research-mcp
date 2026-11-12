import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { emptyResearch, validateResearch, safeUrl, questionsFor, markdownReport } from '../site/research.js';

const fixture = JSON.parse(readFileSync(new URL('../examples/ditap-case-management.json', import.meta.url), 'utf8'));
const sources = JSON.parse(readFileSync(new URL('../src/omr_mcp/sources.json', import.meta.url), 'utf8'));

test('fictional research fixture is supported', () => {
  assert.equal(validateResearch(fixture), true);
  assert.equal(fixture.demonstration_only, true);
  assert.equal(emptyResearch().candidates.length, 0);
});
test('unverified claims remain unverified', () => {
  const report = markdownReport(fixture, sources);
  assert.match(report, /Unapproved working notes/);
  assert.match(report, /Fictional DITAP demonstration:.*Yes/);
  assert.match(report, /Not a selection/);
  assert.match(report, /ACR source: Not found/);
  assert.doesNotMatch(report, /Best vendor:/);
});
test('missing evaluation does not mean failed accessibility', () => {
  assert.match(questionsFor({ accessibility_claim: 'not-evaluated', independent_evaluation: 'none' }).join(' '), /not a failed test/);
});
test('only HTTPS external URLs accepted', () => {
  assert.equal(safeUrl('https://example.gov/accessibility'), true);
  assert.equal(safeUrl('javascript:alert(1)'), false);
  assert.equal(safeUrl('http://example.org'), false);
  assert.equal(safeUrl('https://user:pass@example.org'), false);
  const x = structuredClone(fixture);
  x.candidates[0].url = 'javascript:alert(1)';
  assert.throws(() => validateResearch(x), /Only HTTPS/);
});
