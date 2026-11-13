import test from 'node:test';
import assert from 'node:assert/strict';
import {
  discoverSources, createPublicPlan, accessibilityChecklist,
  methodologyGuide, reportTemplate, normalizeText, serviceInfo,
} from '../src/core.mjs';
import catalog from '../../src/omr_mcp/sources.json' with { type: 'json' };

const sources = [
  { id: 'sam-gov', name: 'SAM.gov via 1102tools', category: 'contracting-data', url: 'https://github.com/1102tools-dev/federal-contracting-mcps', purpose: 'Search contracting notices', method: 'Check records', limitations: 'Registration is not proof' },
  { id: 'usaspending-gov', name: 'USAspending.gov', category: 'contracting-data', url: 'https://www.usaspending.gov/', purpose: 'Research awards', method: 'Inspect records', limitations: 'Historical only' },
  { id: 'gsa-art', name: 'GSA ART', category: 'accessibility-requirements', url: 'https://www.section508.gov/art/', purpose: 'Identify requirements', method: 'Use official tool', limitations: 'Not a conformance test' },
];

test('source launcher provides direct research links and does not fabricate searches', () => {
  const result = discoverSources(sources, { category: 'contracting-data' });
  assert.equal(result.total_matches, 2);
  assert.equal(result.search_performed, false);
  assert.equal(result.sources[0].research_url, 'https://sam.gov/');
  assert.equal(result.sources[0].catalog_reference_url, sources[0].url);
  assert.equal(result.sources[0].source_status, 'reference_only_not_searched');
});

test('source filtering is bounded and stable', () => {
  assert.equal(discoverSources(sources, { query: 'accessibility' }).total_matches, 1);
  assert.throws(() => discoverSources(sources, { limit: 999 }), /limit/);
  assert.throws(() => normalizeText('x'.repeat(121), 120), /exceeds/);
});

test('public plan rejects input without disclosure confirmation', () => {
  assert.throws(() => createPublicPlan(sources, { publicNeed: 'A public digital service for residents' }), /Confirm/);
});

test('public plan returns suggestions, never completed searches', () => {
  const result = createPublicPlan(sources, { publicNeed: 'A public digital service for residents', confirmedPublic: true });
  assert.equal(result.search_performed, false);
  assert.match(result.status, /not_completed/);
  assert.ok(result.proposed_searches.every((search) => search.status === 'not-searched'));
  assert.ok(result.questions.some((question) => question.id === 'RQ-ACCESS'));
});

test('accessibility questions are not a compliance decision', () => {
  const result = accessibilityChecklist({ acrStatus: 'missing' });
  assert.match(result.status, /not_an_assessment/);
  assert.ok(result.references.some((ref) => ref.url.endsWith('/art/')));
  assert.throws(() => accessibilityChecklist({ acrStatus: 'pass' }), /acrStatus/);
});

test('methodology and report guidance never claim a real evaluation', () => {
  assert.ok(methodologyGuide().required_provenance.length >= 5);
  assert.equal(reportTemplate().status, 'blank_template_not_completed_report');
  assert.equal(serviceInfo().authorization.startsWith('Anonymous'), true);
});


test('the current canonical catalog uses only known planned source IDs', () => {
  const plan = createPublicPlan(catalog, {
    publicNeed: 'A public digital service for residents',
    confirmedPublic: true,
  });
  const ids = new Set(catalog.map((source) => source.id));
  assert.ok(plan.suggested_sources.length > 0);
  assert.ok(plan.suggested_sources.every((source) => ids.has(source.id)));
  assert.ok(catalog.some((source) => source.id === 'usaspending-gov'));
  assert.ok(catalog.some((source) => source.id === 'ecfr-gov'));
});

test('canonical source cards expose use, access, recording, and search guidance', () => {
  const result = discoverSources(catalog, { query: 'accessibility', limit: 1 });
  assert.equal(result.search_performed, false);
  assert.ok(result.sources[0].use_when);
  assert.ok(result.sources[0].authentication);
  assert.ok(result.sources[0].record_how);
  assert.ok(result.sources[0].search_strategy);
  assert.equal(result.sources[0].source_status, 'reference_only_not_searched');
});
