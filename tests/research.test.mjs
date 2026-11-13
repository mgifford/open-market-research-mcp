import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setRules } from '../site/rules.js';
import { emptyResearch, validateResearch, prepareResearch, safeUrl, questionsFor, markdownReport } from '../site/research.js';

const fixture = JSON.parse(readFileSync(new URL('../examples/ditap-case-management.json', import.meta.url), 'utf8'));
const legacy = JSON.parse(readFileSync(new URL('../examples/ditap-case-management-0.1.0.json', import.meta.url), 'utf8'));
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


function evidenceFixture() {
  const data = structuredClone(fixture);
  data.research_questions = [{
    id: 'rq-1', question: 'Are there reusable government systems?',
    need_link: 'Reduces new development risk.', category: 'government-reuse',
    status: 'answered', search_ids: [], evidence_ids: [],
    uncertainties: 'Maintenance ownership is unconfirmed.'
  }];
  data.searches = [{
    id: 'search-1', question_id: 'rq-1', source_name: 'Example public inventory',
    source_url: 'https://example.gov/inventory', source_type: 'public-repository',
    authority: 'public-repository', query: 'case management', filters: 'public',
    method: 'manual', searched_at: '2026-11-12', source_as_of: '2026-10-01',
    result_count: 1, status: 'completed-with-results',
    limitations: 'Example fixture only.', coverage_gaps: 'No commercial scan.'
  }];
  data.evidence = [{
    id: 'ev-1', search_id: 'search-1', source_name: 'Example public inventory',
    source_url: 'https://example.gov/inventory/record-1', source_identifier: 'record-1',
    retrieved_at: '2026-11-12', source_as_of: '2026-10-01',
    evidence_type: 'government-software-metadata', candidate_id: data.candidates[0].id,
    product_version: '1.0', requirement_ids: [], claim: 'A fictional reusable system is listed.',
    limitations: 'Metadata does not establish suitability.', uncertainties: 'Maintenance is unverified.',
    verification_state: 'unverified', reviewer: ''
  }];
  data.findings = [{
    id: 'finding-1', description: 'A listed government system may be reusable.',
    supporting_evidence_ids: ['ev-1'], contradicting_evidence_ids: [],
    evidence_gap: 'Ownership and maintenance need confirmation.', question_ids: ['rq-1'],
    candidate_ids: [data.candidates[0].id], requires_verification: true, reviewer_notes: ''
  }];
  data.decisions = [{
    id: 'decision-1', description: 'Ask the owning agency about reuse and maintenance.',
    decision_type: 'reuse-rights', status: 'pending', owner: 'Example owner',
    rationale: 'Reuse rights are not established by metadata.', evidence_ids: ['ev-1'],
    due_date: '', resolved_at: ''
  }];
  return prepareResearch(data);
}

test('legacy 0.1.0 records migrate without invented history', () => {
  assert.equal(validateResearch(legacy), true);
  const migrated = prepareResearch(legacy);
  assert.equal(migrated.schema_version, '0.2.0');
  assert.deepEqual(migrated.project, legacy.project);
  assert.equal(migrated.searches.length, 0);
  assert.equal(migrated.evidence.length, 0);
  assert.equal(migrated.migration.from_schema_version, '0.1.0');
  assert.equal(migrated.candidates[0].acr.evaluation_methods, '');
  const report = markdownReport(legacy);
  assert.match(report, /Migrated from 0\.1\.0/);
  assert.match(report, /no search, evidence, or verification history was invented/);
});

test('0.2.0 references and provenance are validated', () => {
  const data = evidenceFixture();
  assert.equal(validateResearch(data), true);
  const broken = structuredClone(data);
  broken.searches[0].question_id = 'missing-question';
  assert.throws(() => validateResearch(broken), /unknown research question/);

  const noDate = structuredClone(data);
  noDate.searches[0].searched_at = '';
  assert.throws(() => validateResearch(noDate), /searched-at/);

  const noRetrieval = structuredClone(data);
  noRetrieval.evidence[0].retrieved_at = '';
  assert.throws(() => validateResearch(noRetrieval), /retrieval date/);

  const unreviewed = structuredClone(data);
  unreviewed.evidence[0].verification_state = 'reviewed';
  assert.throws(() => validateResearch(unreviewed), /reviewer/);

  const noSupport = structuredClone(data);
  noSupport.findings[0].supporting_evidence_ids = [];
  assert.throws(() => validateResearch(noSupport), /supporting evidence/);
});

test('no-result and failed searches remain distinct', () => {
  const data = evidenceFixture();
  data.searches[0].status = 'completed-without-results';
  data.searches[0].result_count = 0;
  assert.equal(validateResearch(data), true);
  assert.match(markdownReport(data), /without matching records: 1/);

  data.searches[0].status = 'failed';
  data.searches[0].result_count = null;
  assert.match(markdownReport(data), /failed: 1/);
});
