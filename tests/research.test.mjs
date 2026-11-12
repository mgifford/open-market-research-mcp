import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setRules } from '../site/rules.js';
import { emptyResearch, validateResearch, safeUrl, questionsFor, markdownReport } from '../site/research.js';

const fixture = JSON.parse(readFileSync(new URL('../examples/ditap-case-management.json', import.meta.url), 'utf8'));
const sources = JSON.parse(readFileSync(new URL('../src/omr_mcp/sources.json', import.meta.url), 'utf8'));
const rules = JSON.parse(readFileSync(new URL('../src/omr_mcp/rules.json', import.meta.url), 'utf8'));
setRules(rules);

test('fictional research fixture is supported', () => {
  assert.equal(validateResearch(fixture), true);
  assert.equal(fixture.demonstration_only, true);
  assert.equal(emptyResearch().candidates.length, 0);
  assert.equal(emptyResearch().schema_version, rules.schema_version);
});

test('unverified claims remain unverified', () => {
  const report = markdownReport(fixture, sources);
  assert.match(report, /Unapproved working notes/);
  assert.match(report, /Fictional DITAP demonstration:.*Yes/);
  assert.match(report, /Not a selection/);
  assert.match(report, /ACR source: Not found/);
  assert.match(report, /Request a current/);
  assert.doesNotMatch(report, /Best vendor:/);
  assert.doesNotMatch(report, /Recommended supplier/);
});

test('missing evaluation does not mean failed accessibility', () => {
  assert.match(
    questionsFor({ accessibility_claim: 'not-evaluated', independent_evaluation: 'none' }).join(' '),
    /not that the option has failed/
  );
  assert.match(
    questionsFor({ accessibility_claim: 'supports', independent_evaluation: 'none' }).join(' '),
    /not independently verified/
  );
});

test('only HTTPS external URLs accepted', () => {
  assert.equal(safeUrl('https://example.gov/accessibility'), true);
  assert.equal(safeUrl('javascript:alert(1)'), false);
  assert.equal(safeUrl('http://example.org'), false);
  assert.equal(safeUrl('https://user:pass@example.org'), false);
  const x = structuredClone(fixture);
  x.candidates[0].url = 'javascript:alert(1)';
  assert.throws(() => validateResearch(x), /HTTPS/);
});

test('shared limits and required fields are enforced', () => {
  const tooLong = structuredClone(fixture);
  tooLong.candidates[0].name = 'A'.repeat(rules.limits.candidate.name + 1);
  assert.throws(() => validateResearch(tooLong), /string|name/i);

  const missingId = structuredClone(fixture);
  delete missingId.candidates[0].id;
  assert.throws(() => validateResearch(missingId), /id/);

  const extra = structuredClone(fixture);
  extra.candidates[0].ranking = 1;
  assert.throws(() => validateResearch(extra), /Unrecognized field/);

  const badBoolean = structuredClone(fixture);
  badBoolean.demonstration_only = 'true';
  assert.throws(() => validateResearch(badBoolean), /boolean/);
});
