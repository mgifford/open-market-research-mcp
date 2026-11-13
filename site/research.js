import { format, getRules, getRulesOrNull } from './rules.js';

export const SCHEMA_VERSION = '0.2.0';
const LEGACY_CANDIDATE_FIELDS = [
  'id', 'name', 'approach', 'version', 'scope', 'url', 'acr_url', 'acr_date',
  'accessibility_claim', 'independent_evaluation', 'notes'
];
const ACR_FIELDS = ['found', 'product_version', 'functions_covered', 'publication_date', 'evaluation_methods', 'catalog_id', 'completeness', 'notes'];
const QUESTION_FIELDS = ['id', 'question', 'need_link', 'category', 'status', 'search_ids', 'evidence_ids', 'uncertainties'];
const SEARCH_FIELDS = ['id', 'question_id', 'source_name', 'source_url', 'source_type', 'authority', 'query', 'filters', 'method', 'searched_at', 'source_as_of', 'result_count', 'status', 'limitations', 'coverage_gaps'];
const EVIDENCE_FIELDS = ['id', 'search_id', 'source_name', 'source_url', 'source_identifier', 'retrieved_at', 'source_as_of', 'evidence_type', 'candidate_id', 'product_version', 'requirement_ids', 'claim', 'limitations', 'uncertainties', 'verification_state', 'reviewer'];
const FINDING_FIELDS = ['id', 'description', 'supporting_evidence_ids', 'contradicting_evidence_ids', 'evidence_gap', 'question_ids', 'candidate_ids', 'requires_verification', 'reviewer_notes'];
const DECISION_FIELDS = ['id', 'description', 'decision_type', 'status', 'owner', 'rationale', 'evidence_ids', 'due_date', 'resolved_at'];
const ACCESSIBILITY_FIELDS = ['identified', 'tool', 'reviewer', 'as_of', 'requirement_ids', 'notes'];
const TOP_LEVEL_FIELDS = ['schema_version', 'demonstration_only', 'migration', 'project', 'accessibility_requirements', 'research_questions', 'searches', 'evidence', 'findings', 'decisions', 'candidates'];

const message = (name, values = {}) => format(getRules().messages[name], values);
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const projectFields = () => ['name', ...getRules().report.project_fields.map(spec => spec.field)];
const optionalProjectFields = () => (getRules().report.optional_project_fields || []).map(spec => spec.field);
const projectAllowedFields = () => [...projectFields(), ...optionalProjectFields()];
const candidateFields = () => ['id', 'name', ...getRules().report.candidate_fields.map(spec => spec.field), 'acr'];
const label = (group, value) => getRules().labels[group]?.[value] || String(value).replaceAll('-', ' ');

function textFields(item, limits) {
  for (const [field, limit] of Object.entries(limits)) {
    if (typeof item[field] !== 'string' || item[field].length > limit) {
      throw new Error(message('field', { field }));
    }
  }
}

function idList(item, field, max = 1000) {
  const value = item[field];
  if (!Array.isArray(value) || value.length > max ||
      value.some(entry => typeof entry !== 'string' || entry.length > 100)) {
    throw new Error(message('field', { field }));
  }
  return value;
}

function uniqueIds(records, kind) {
  const ids = records.map(record => record.id);
  if (ids.length !== new Set(ids).size) {
    const duplicate = ids.find((id, index) => ids.indexOf(id) !== index);
    throw new Error(message('duplicate_id', { kind, id: duplicate }));
  }
  return new Set(ids);
}

export const emptyResearch = () => ({
  schema_version: getRulesOrNull()?.schema_version || SCHEMA_VERSION,
  demonstration_only: false,
  project: { name: '', need: '', users: '', constraints: '', ict_type: '', agency_context: '', research_mode: 'guided' },
  accessibility_requirements: {
    identified: false,
    tool: '',
    reviewer: '',
    as_of: '',
    requirement_ids: [],
    notes: ''
  },
  research_questions: [],
  searches: [],
  evidence: [],
  findings: [],
  decisions: [],
  candidates: []
});

export function safeUrl(value) {
  if (!value) return true;
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && !!u.hostname && !u.username && !u.password;
  } catch { return false; }
}

function validateLegacy(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.schema_version !== '0.1.0') {
    throw new Error(message('schema'));
  }
  if (data.demonstration_only !== undefined && typeof data.demonstration_only !== 'boolean') {
    throw new Error(message('demonstration'));
  }
  if (!isObject(data.project)) throw new Error(message('project'));
  const projects = ['name', ...getRules().report.project_fields.map(spec => spec.field)];
  for (const key of Object.keys(data.project)) {
    if (!projects.includes(key)) throw new Error(message('extra', { field: key }));
  }
  for (const field of projects) {
    if (typeof data.project[field] !== 'string' || data.project[field].length > getRules().limits.project[field]) {
      throw new Error(message('project_fields'));
    }
  }
  if (!Array.isArray(data.candidates) || data.candidates.length > getRules().limits.max_candidates) {
    throw new Error(message('candidates', { max: getRules().limits.max_candidates }));
  }
  for (const candidate of data.candidates) {
    if (!isObject(candidate)) throw new Error(message('candidate_object'));
    for (const key of Object.keys(candidate)) {
      if (!LEGACY_CANDIDATE_FIELDS.includes(key)) throw new Error(message('extra', { field: key }));
    }
    for (const field of LEGACY_CANDIDATE_FIELDS) {
      if (!(field in candidate)) throw new Error(message('field', { field }));
    }
    if (!getRules().approaches.includes(candidate.approach)) throw new Error(message('approach'));
    if (!getRules().claims.includes(candidate.accessibility_claim)) throw new Error(message('claim'));
    if (!getRules().evaluations.includes(candidate.independent_evaluation)) throw new Error(message('evaluation'));
    if (typeof candidate.id !== 'string' || !candidate.id.trim()) throw new Error(message('field', { field: 'id' }));
    if (typeof candidate.name !== 'string' || !candidate.name.trim()) throw new Error(message('name'));
    textFields(candidate, getRules().limits.candidate);
    for (const field of ['url', 'acr_url']) {
      if (!safeUrl(candidate[field])) throw new Error(message('url', { field }));
    }
  }
  return true;
}

function legacyAcr(candidate) {
  return {
    found: Boolean(candidate.acr_url),
    product_version: candidate.version || '',
    functions_covered: candidate.scope || '',
    publication_date: candidate.acr_date || '',
    evaluation_methods: '',
    catalog_id: '',
    completeness: 'unknown',
    notes: ''
  };
}

export function migrateResearch(data) {
  if (!isObject(data)) throw new Error(message('schema'));
  if (data.schema_version === getRules().schema_version) return structuredClone(data);
  if (!getRules().legacy_schema_versions.includes(data.schema_version)) throw new Error(message('schema'));
  validateLegacy(data);
  return {
    schema_version: getRules().schema_version,
    demonstration_only: Boolean(data.demonstration_only),
    migration: {
      from_schema_version: data.schema_version,
      migrated_at: new Date().toISOString(),
      unavailable_fields: [
        'research_questions', 'searches', 'evidence', 'findings', 'decisions',
        'accessibility_requirements', 'candidate.acr.evaluation_methods',
        'candidate.acr.catalog_id', 'candidate.acr.completeness'
      ],
      notes: 'Legacy records contained project scope and candidate notes only. No search, evidence, or verification history was invented.'
    },
    project: structuredClone(data.project),
    accessibility_requirements: {
      identified: false,
      tool: '',
      reviewer: '',
      as_of: '',
      requirement_ids: [],
      notes: 'Not recorded in the migrated 0.1.0 record.'
    },
    research_questions: [],
    searches: [],
    evidence: [],
    findings: [],
    decisions: [],
    candidates: data.candidates.map(candidate => ({
      ...Object.fromEntries(LEGACY_CANDIDATE_FIELDS.map(field => [field, candidate[field] || ''])),
      acr: legacyAcr(candidate)
    }))
  };
}

export function relink(data) {
  const questions = new Map((data.research_questions || []).map(question => [question.id, question]));
  for (const question of questions.values()) {
    question.search_ids = [];
    question.evidence_ids = [];
  }
  const searches = new Map((data.searches || []).map(search => [search.id, search]));
  for (const search of searches.values()) {
    const question = questions.get(search.question_id);
    if (question) question.search_ids.push(search.id);
  }
  for (const item of data.evidence || []) {
    const search = searches.get(item.search_id);
    const question = search ? questions.get(search.question_id) : null;
    if (question) question.evidence_ids.push(item.id);
  }
  return data;
}

function validateReferences(data) {
  const questionIds = uniqueIds(data.research_questions, 'research question');
  const searchIds = uniqueIds(data.searches, 'search');
  const evidenceIds = uniqueIds(data.evidence, 'evidence');
  uniqueIds(data.findings, 'finding');
  uniqueIds(data.decisions, 'decision');
  const candidateIds = uniqueIds(data.candidates, 'candidate');

  for (const question of data.research_questions) {
    for (const [field, allowed] of [['search_ids', searchIds], ['evidence_ids', evidenceIds]]) {
      for (const linked of question[field]) {
        if (!allowed.has(linked)) throw new Error(message('reference', { field, kind: 'record', id: linked }));
      }
    }
  }
  for (const search of data.searches) {
    if (!questionIds.has(search.question_id)) throw new Error(message('reference', { field: 'question_id', kind: 'research question', id: search.question_id }));
  }
  for (const item of data.evidence) {
    if (!searchIds.has(item.search_id)) throw new Error(message('reference', { field: 'search_id', kind: 'search', id: item.search_id }));
    if (item.candidate_id && !candidateIds.has(item.candidate_id)) {
      throw new Error(message('reference', { field: 'candidate_id', kind: 'candidate', id: item.candidate_id }));
    }
  }
  for (const finding of data.findings) {
    for (const [field, allowed] of [['supporting_evidence_ids', evidenceIds], ['contradicting_evidence_ids', evidenceIds]]) {
      for (const linked of finding[field]) {
        if (!allowed.has(linked)) throw new Error(message('reference', { field, kind: 'evidence', id: linked }));
      }
    }
    for (const [field, allowed] of [['question_ids', questionIds], ['candidate_ids', candidateIds]]) {
      for (const linked of finding[field]) {
        if (!allowed.has(linked)) throw new Error(message('reference', { field, kind: 'record', id: linked }));
      }
    }
  }
  for (const decision of data.decisions) {
    for (const linked of decision.evidence_ids) {
      if (!evidenceIds.has(linked)) throw new Error(message('reference', { field: 'evidence_ids', kind: 'evidence', id: linked }));
    }
  }
}

function validateCurrent(data) {
  const rules = getRules();
  if (!isObject(data) || data.schema_version !== rules.schema_version) throw new Error(message('schema'));
  for (const key of Object.keys(data)) {
    if (!TOP_LEVEL_FIELDS.includes(key)) throw new Error(message('extra', { field: key }));
  }
  if (data.demonstration_only !== undefined && typeof data.demonstration_only !== 'boolean') {
    throw new Error(message('demonstration'));
  }
  if (!isObject(data.project)) throw new Error(message('project'));
  const projects = projectFields();
  for (const key of Object.keys(data.project)) {
    if (!projectAllowedFields().includes(key)) throw new Error(message('extra', { field: key }));
  }
  for (const field of projects) {
    if (typeof data.project[field] !== 'string' || data.project[field].length > rules.limits.project[field]) {
      throw new Error(message('project_fields'));
    }
  }
  for (const field of optionalProjectFields()) {
    if (!(field in data.project)) continue;
    if (typeof data.project[field] !== 'string' || data.project[field].length > rules.limits.project[field]) {
      throw new Error(message('project_fields'));
    }
  }
  if (data.project.research_mode && !rules.research_modes.includes(data.project.research_mode)) {
    throw new Error(message('field', { field: 'research_mode' }));
  }

  const accessibility = data.accessibility_requirements;
  if (!isObject(accessibility)) throw new Error(message('field', { field: 'accessibility_requirements' }));
  for (const key of Object.keys(accessibility)) {
    if (!ACCESSIBILITY_FIELDS.includes(key)) throw new Error(message('extra', { field: key }));
  }
  for (const field of ACCESSIBILITY_FIELDS) {
    if (!(field in accessibility)) throw new Error(message('field', { field }));
  }
  if (typeof accessibility.identified !== 'boolean') throw new Error(message('field', { field: 'identified' }));
  textFields(accessibility, rules.limits.accessibility_requirements);
  idList(accessibility, 'requirement_ids', 500);
  if (accessibility.identified && !(accessibility.tool.trim() || accessibility.reviewer.trim())) {
    throw new Error(message('accessibility_tool'));
  }

  const collections = [
    ['research_questions', QUESTION_FIELDS, rules.limits.max_questions],
    ['searches', SEARCH_FIELDS, rules.limits.max_searches],
    ['evidence', EVIDENCE_FIELDS, rules.limits.max_evidence],
    ['findings', FINDING_FIELDS, rules.limits.max_findings],
    ['decisions', DECISION_FIELDS, rules.limits.max_decisions]
  ];
  for (const [key, fields, max] of collections) {
    if (!Array.isArray(data[key]) || data[key].length > max) {
      throw new Error(message('max_items', { collection: key, max }));
    }
    for (const item of data[key]) {
      if (!isObject(item)) throw new Error(message('field', { field: key }));
      for (const field of Object.keys(item)) {
        if (!fields.includes(field)) throw new Error(message('extra', { field }));
      }
      for (const field of fields) {
        if (!(field in item)) throw new Error(message('field', { field }));
      }
    }
  }

  for (const question of data.research_questions) {
    textFields(question, rules.limits.question);
    if (!question.id.trim() || !question.question.trim()) throw new Error(message('question'));
    if (!rules.question_categories.includes(question.category)) throw new Error(message('field', { field: 'category' }));
    if (!rules.question_statuses.includes(question.status)) throw new Error(message('question_status'));
    idList(question, 'search_ids', 500);
    idList(question, 'evidence_ids', 1000);
  }
  for (const search of data.searches) {
    textFields(search, rules.limits.search);
    if (!search.id.trim() || !search.source_name.trim() || !search.question_id.trim()) throw new Error(message('search'));
    if (!safeUrl(search.source_url)) throw new Error(message('url', { field: 'source_url' }));
    for (const [field, values] of [
      ['source_type', rules.source_types], ['authority', rules.authorities],
      ['method', rules.search_methods], ['status', rules.search_statuses]
    ]) {
      if (!values.includes(search[field])) throw new Error(message('field', { field }));
    }
    if (search.status !== 'not-searched' && !search.searched_at.trim()) throw new Error(message('search_date'));
    if (search.result_count !== null && (!Number.isInteger(search.result_count) || search.result_count < 0)) {
      throw new Error(message('field', { field: 'result_count' }));
    }
  }
  for (const item of data.evidence) {
    textFields(item, rules.limits.evidence);
    if (!item.id.trim() || !item.source_name.trim() || !item.search_id.trim()) throw new Error(message('evidence'));
    if (!item.retrieved_at.trim()) throw new Error(message('evidence_date'));
    if (!safeUrl(item.source_url)) throw new Error(message('url', { field: 'source_url' }));
    if (!rules.evidence_types.includes(item.evidence_type)) throw new Error(message('evidence_type'));
    if (!rules.verification_states.includes(item.verification_state)) throw new Error(message('verification'));
    if (item.verification_state !== 'unverified' && !item.reviewer.trim()) throw new Error(message('reviewer'));
    idList(item, 'requirement_ids', 500);
  }
  for (const finding of data.findings) {
    textFields(finding, rules.limits.finding);
    if (!finding.id.trim() || !finding.description.trim()) throw new Error(message('finding_evidence'));
    for (const field of ['supporting_evidence_ids', 'contradicting_evidence_ids', 'question_ids', 'candidate_ids']) {
      idList(finding, field, 500);
    }
    if (!finding.supporting_evidence_ids.length) throw new Error(message('finding_evidence'));
    if (typeof finding.requires_verification !== 'boolean') throw new Error(message('field', { field: 'requires_verification' }));
  }
  for (const decision of data.decisions) {
    textFields(decision, rules.limits.decision);
    if (!decision.id.trim() || !decision.description.trim()) throw new Error(message('decision'));
    if (!rules.decision_types.includes(decision.decision_type)) throw new Error(message('field', { field: 'decision_type' }));
    if (!rules.decision_statuses.includes(decision.status)) throw new Error(message('decision_status'));
    idList(decision, 'evidence_ids', 500);
    if (decision.status === 'resolved' && !decision.resolved_at.trim()) throw new Error(message('resolved_date'));
  }

  if (!Array.isArray(data.candidates) || data.candidates.length > rules.limits.max_candidates) {
    throw new Error(message('candidates', { max: rules.limits.max_candidates }));
  }
  const accessibilityEvidenceCandidates = new Set(
    data.evidence.filter(item => item.evidence_type === 'accessibility-report' && item.candidate_id).map(item => item.candidate_id)
  );
  const candidates = candidateFields();
  for (const candidate of data.candidates) {
    if (!isObject(candidate)) throw new Error(message('candidate_object'));
    for (const key of Object.keys(candidate)) {
      if (!candidates.includes(key)) throw new Error(message('extra', { field: key }));
    }
    for (const field of candidates) {
      if (!(field in candidate)) throw new Error(message('field', { field }));
    }
    textFields(candidate, rules.limits.candidate);
    if (typeof candidate.id !== 'string' || !candidate.id.trim() ||
        typeof candidate.name !== 'string' || !candidate.name.trim()) throw new Error(message('name'));
    if (!rules.approaches.includes(candidate.approach)) throw new Error(message('approach'));
    if (!rules.claims.includes(candidate.accessibility_claim)) throw new Error(message('claim'));
    if (!rules.evaluations.includes(candidate.independent_evaluation)) throw new Error(message('evaluation'));
    for (const field of ['url', 'acr_url']) {
      if (!safeUrl(candidate[field])) throw new Error(message('url', { field }));
    }
    if (!isObject(candidate.acr)) throw new Error(message('field', { field: 'acr' }));
    for (const key of Object.keys(candidate.acr)) {
      if (!ACR_FIELDS.includes(key)) throw new Error(message('extra', { field: key }));
    }
    for (const field of ACR_FIELDS) {
      if (!(field in candidate.acr)) throw new Error(message('field', { field }));
    }
    textFields(candidate.acr, rules.limits.acr);
    if (typeof candidate.acr.found !== 'boolean') throw new Error(message('field', { field: 'acr.found' }));
    if (!rules.acr_completeness.includes(candidate.acr.completeness)) throw new Error(message('field', { field: 'acr.completeness' }));
    if (candidate.acr.found && !(candidate.acr_url || accessibilityEvidenceCandidates.has(candidate.id))) {
      throw new Error(message('acr_found'));
    }
  }
  validateReferences(data);
}

export function validateResearch(data) {
  if (isObject(data) && data.schema_version === '0.1.0') return validateLegacy(data);
  validateCurrent(data);
  return true;
}

export function prepareResearch(data) {
  const prepared = relink(migrateResearch(data));
  prepared.project = { ...Object.fromEntries(optionalProjectFields().map(field => [field, ''])), ...prepared.project };
  validateCurrent(prepared);
  return prepared;
}

function ruleMatches(when, candidate) {
  if (when.type === 'always') return true;
  if (when.type === 'empty') return !candidate[when.field];
  if (when.type === 'claim') return (candidate.accessibility_claim || 'unknown') === when.value;
  if (when.type === 'evaluation') return (candidate.independent_evaluation || 'none') === when.value;
  throw new Error(`Unknown question rule type: ${when.type}`);
}

export function questionsFor(candidate) {
  return getRules().questions.filter(rule => ruleMatches(rule.when, candidate)).map(rule => rule.text);
}

const countBy = (records, field) => records.reduce((counts, record) => {
  counts[record[field]] = (counts[record[field]] || 0) + 1;
  return counts;
}, {});

export function markdownReport(data, sources = []) {
  const prepared = prepareResearch(data);
  const report = getRules().report;
  const project = prepared.project;
  const questions = prepared.research_questions;
  const searches = prepared.searches;
  const evidence = prepared.evidence;
  const findings = prepared.findings;
  const decisions = prepared.decisions;
  const candidates = prepared.candidates;
  const accessibility = prepared.accessibility_requirements;
  const lines = [
    format(report.title, { name: project.name || report.untitled }), '',
    report.status, '',
    report.demonstration[String(Boolean(prepared.demonstration_only))], ''
  ];
  if (prepared.migration) lines.push(format(report.migration_note, prepared.migration), '');

  const questionCounts = countBy(questions, 'status');
  const searchCounts = countBy(searches, 'status');
  const evidenceCounts = countBy(evidence, 'verification_state');
  const pending = decisions.filter(decision => decision.status !== 'resolved').length;
  lines.push(report.headings.summary, '',
    `- Research questions: ${questions.length} (answered: ${questionCounts.answered || 0}; in progress: ${questionCounts['in-progress'] || 0}; unresolved: ${questionCounts.unresolved || 0}; not started: ${questionCounts['not-started'] || 0}).`,
    `- Searches recorded: ${searches.length} (with results: ${searchCounts['completed-with-results'] || 0}; without matching records: ${searchCounts['completed-without-results'] || 0}; partial: ${searchCounts.partial || 0}; failed: ${searchCounts.failed || 0}; not searched: ${searchCounts['not-searched'] || 0}).`,
    `- Candidate options: ${candidates.length}.`,
    `- Evidence records: ${evidence.length} (reviewed: ${evidenceCounts.reviewed || 0}; independently verified: ${evidenceCounts['independently-verified'] || 0}; unverified: ${evidenceCounts.unverified || 0}; withdrawn: ${evidenceCounts.withdrawn || 0}).`,
    `- Findings: ${findings.length}; decisions or follow-up items: ${decisions.length} (open: ${pending}).`,
    '- This is a working draft. It does not recommend a supplier, establish accessibility conformance, or approve an exception.', '');

  lines.push(report.headings.need, '');
  for (const spec of report.project_fields) {
    lines.push(`- ${spec.label}: ${project[spec.field] || report.missing.project}`);
  }
  for (const spec of report.optional_project_fields || []) {
    const value = project[spec.field];
    if (!value) continue;
    lines.push(`- ${spec.label}: ${spec.labels ? label(spec.labels, value) : value}`);
  }
  lines.push('', report.headings.research_questions, '');
  if (!questions.length) lines.push(report.no_data.questions);
  questions.forEach((question, index) => {
    lines.push('', `### RQ${index + 1}: ${question.question}`, '',
      `- ID: ${question.id}`,
      `- Category: ${label('question_categories', question.category)}`,
      `- Status: ${label('question_statuses', question.status)}`,
      `- Relationship to need: ${question.need_link || report.missing.default}`,
      `- Searches: ${question.search_ids.join(', ') || 'None recorded'}`,
      `- Evidence: ${question.evidence_ids.join(', ') || 'None recorded'}`,
      `- Remaining uncertainties: ${question.uncertainties || 'None recorded'}`);
  });

  lines.push('', report.headings.methodology, '');
  const methodCounts = countBy(searches, 'method');
  const sourceCounts = countBy(searches, 'source_type');
  const methodText = Object.entries(methodCounts).map(([key, count]) => `${label('search_methods', key)} (${count})`).join(', ') || 'None recorded';
  const sourceText = Object.entries(sourceCounts).map(([key, count]) => `${label('source_types', key)} (${count})`).join(', ') || 'None recorded';
  lines.push(`- Search methods: ${methodText}.`, `- Source types: ${sourceText}.`,
    '- Only the searches recorded in this file count as investigations. A reference link is not evidence that a search was performed.',
    '- No result, no matching record, partial coverage, and a failed search are recorded as different states.', '');

  const investigated = searches.filter(search => search.status !== 'not-searched');
  lines.push(report.headings.investigated_sources, '');
  if (!investigated.length) lines.push(report.no_data.searches);
  for (const search of investigated) {
    lines.push('', `### ${search.source_name} (${search.id})`, '',
      `- Status: ${label('search_statuses', search.status)}`,
      `- Question: ${search.question_id}`,
      `- URL: ${search.source_url || report.missing.default}`,
      `- Searched: ${search.searched_at || report.missing.default}`,
      `- Source as of: ${search.source_as_of || report.missing.default}`,
      `- Method: ${label('search_methods', search.method)}`,
      `- Query: ${search.query || 'Not recorded'}`,
      `- Filters: ${search.filters || 'Not recorded'}`,
      `- Result count: ${search.result_count ?? 'Not recorded'}`,
      `- Limitations: ${search.limitations || 'None recorded'}`,
      `- Coverage gaps: ${search.coverage_gaps || 'None recorded'}`);
  }

  lines.push('', report.headings.searches, '');
  if (!searches.length) lines.push(report.no_data.searches);
  for (const search of searches) {
    lines.push(`- ${search.id} | ${search.source_name} | ${label('search_statuses', search.status)} | searched: ${search.searched_at || 'not recorded'} | results: ${search.result_count ?? 'not recorded'}`);
  }

  for (const [heading, approaches] of [['reuse', ['government-reuse', 'open-source']], ['commercial', ['commercial', 'new-build']]]) {
    lines.push('', report.headings[heading], '');
    const selected = candidates.filter(candidate => approaches.includes(candidate.approach));
    if (!selected.length) lines.push(report.no_data.candidates);
    for (const candidate of selected) {
      lines.push('', `### ${candidate.name}`, '');
      for (const spec of report.candidate_fields) {
        const value = candidate[spec.field] || report.missing[spec.field] || report.missing.default;
        lines.push(`- ${spec.label}: ${value}${spec.suffix || ''}`);
      }
      lines.push(`- ACR found: ${candidate.acr.found ? 'Yes' : 'No'}`,
        `- ACR product version: ${candidate.acr.product_version || report.missing.default}`,
        `- ACR functions covered: ${candidate.acr.functions_covered || report.missing.default}`,
        `- ACR evaluation methods: ${candidate.acr.evaluation_methods || report.missing.default}`,
        `- ACR catalog / completeness: ${candidate.acr.catalog_id || 'not recorded'} / ${label('acr_completeness', candidate.acr.completeness)}`,
        '', report.headings.questions, '');
      lines.push(...questionsFor(candidate).map(question => `- ${question}`));
    }
  }

  lines.push('', report.headings.accessibility, '',
    `- Requirements identified: ${accessibility.identified ? 'Yes' : 'No'}`,
    `- Tool or process: ${accessibility.tool || report.missing.default}`,
    `- Reviewer: ${accessibility.reviewer || report.missing.default}`,
    `- As of: ${accessibility.as_of || report.missing.default}`,
    `- Requirement identifiers: ${accessibility.requirement_ids.join(', ') || 'None recorded'}`,
    `- Notes: ${accessibility.notes || 'None recorded'}`);
  const accessibilityEvidence = evidence.filter(item => ['accessibility-report', 'independent-test'].includes(item.evidence_type));
  if (!accessibilityEvidence.length) lines.push(report.no_data.accessibility);
  for (const item of accessibilityEvidence) {
    lines.push(`- ${item.id} | ${label('evidence_types', item.evidence_type)} | ${item.source_name} | retrieved: ${item.retrieved_at} | as of: ${item.source_as_of || 'not recorded'} | verification: ${label('verification_states', item.verification_state)}`);
  }
  lines.push('', 'A missing or not-evaluated ACR claim is not a failed accessibility test. A valid ACR is not a Section 508 conformance determination.', '');

  lines.push(report.headings.findings, '');
  if (!findings.length) lines.push(report.no_data.findings);
  findings.forEach((finding, index) => {
    lines.push('', `### F${index + 1}: ${finding.description}`, '',
      `- ID: ${finding.id}`,
      `- Supporting evidence: ${finding.supporting_evidence_ids.join(', ') || 'None'}`,
      `- Contradictory evidence: ${finding.contradicting_evidence_ids.join(', ') || 'None recorded'}`,
      `- Evidence gaps: ${finding.evidence_gap || 'None recorded'}`,
      `- Related questions: ${finding.question_ids.join(', ') || 'None recorded'}`,
      `- Related candidates: ${finding.candidate_ids.join(', ') || 'None recorded'}`,
      `- Further verification required: ${finding.requires_verification ? 'Yes' : 'No'}`,
      `- Reviewer notes: ${finding.reviewer_notes || 'None recorded'}`);
  });

  const supplierTypes = ['supplier-question', 'market-engagement', 'acr-request'];
  const reviewTypes = ['section-508-review', 'reuse-rights', 'security-privacy', 'exception-review', 'other'];
  for (const [heading, types] of [['supplier_questions', supplierTypes], ['review_items', reviewTypes]]) {
    lines.push('', report.headings[heading], '');
    const selected = decisions.filter(decision => types.includes(decision.decision_type));
    if (!selected.length) lines.push(report.no_data.decisions);
    for (const decision of selected) {
      lines.push(`- ${decision.id} | ${label('decision_types', decision.decision_type)} | ${label('decision_statuses', decision.status)} | owner: ${decision.owner || 'not assigned'} | due: ${decision.due_date || 'not recorded'}`,
        `  - ${decision.description}`,
        `  - Rationale: ${decision.rationale || 'None recorded'}`,
        `  - Evidence: ${decision.evidence_ids.join(', ') || 'None recorded'}`);
    }
  }

  lines.push('', report.headings.appendix, '');
  if (!evidence.length && !searches.length) lines.push(report.no_data.evidence);
  for (const search of searches) {
    lines.push(`- Search ${search.id}: ${search.source_name} (${search.source_url || 'no URL'}), searched ${search.searched_at || 'not recorded'}, source as of ${search.source_as_of || 'not recorded'}, method ${label('search_methods', search.method)}, status ${label('search_statuses', search.status)}.`);
  }
  for (const item of evidence) {
    lines.push(`- Evidence ${item.id}: ${item.source_name} (${item.source_url || 'no URL'}), identifier ${item.source_identifier || 'not recorded'}, retrieved ${item.retrieved_at}, source as of ${item.source_as_of || 'not recorded'}, type ${label('evidence_types', item.evidence_type)}, verification ${label('verification_states', item.verification_state)}.`);
    lines.push(`  - Claim: ${item.claim || 'None recorded'}`);
  }
  if (prepared.migration) {
    lines.push(`- Migrated from ${prepared.migration.from_schema_version} on ${prepared.migration.migrated_at}. Fields not recoverable: ${prepared.migration.unavailable_fields.join(', ') || 'none listed'}.`);
  }
  lines.push('', report.headings.review, '');
  lines.push(...report.human_review.map(item => `- ${item}`));
  lines.push('', report.headings.reference_sources, '',
    'These links were not searched by this application unless a search record above says otherwise.');
  sources.forEach(source => lines.push(format(report.source_line, { name: source.name, url: source.url })));
  return lines.join('\n') + '\n';
}
