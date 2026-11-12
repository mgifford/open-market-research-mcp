import { format, getRules, getRulesOrNull } from './rules.js';

export const SCHEMA_VERSION = '0.1.0';
const TOP_LEVEL_FIELDS = ['schema_version', 'demonstration_only', 'project', 'candidates'];

const message = (name, values = {}) => format(getRules().messages[name], values);
const candidateValue = (candidate, field, missing) => candidate[field] || missing[field] || missing.default;

export const emptyResearch = () => ({
  schema_version: getRulesOrNull()?.schema_version || SCHEMA_VERSION,
  demonstration_only: false,
  project: { name: '', need: '', users: '', constraints: '', ict_type: '' },
  candidates: []
});

export function safeUrl(value) {
  if (!value) return true;
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && !!u.hostname && !u.username && !u.password;
  } catch { return false; }
}

export function validateResearch(data) {
  const rules = getRules();
  const projectFields = ['name', ...rules.report.project_fields.map(spec => spec.field)];
  const candidateFields = ['id', 'name', ...rules.report.candidate_fields.map(spec => spec.field)];
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.schema_version !== rules.schema_version) {
    throw new Error(message('schema'));
  }
  for (const key of Object.keys(data)) {
    if (!TOP_LEVEL_FIELDS.includes(key)) throw new Error(message('extra', { field: key }));
  }
  if (data.demonstration_only !== undefined && typeof data.demonstration_only !== 'boolean') {
    throw new Error(message('demonstration'));
  }
  if (!data.project || typeof data.project !== 'object' || Array.isArray(data.project)) {
    throw new Error(message('project'));
  }
  for (const key of Object.keys(data.project)) {
    if (!projectFields.includes(key)) throw new Error(message('extra', { field: key }));
  }
  for (const field of projectFields) {
    if (typeof data.project[field] !== 'string' || data.project[field].length > rules.limits.project[field]) {
      throw new Error(message('project_fields'));
    }
  }
  if (!Array.isArray(data.candidates) || data.candidates.length > rules.limits.max_candidates) {
    throw new Error(message('candidates', { max: rules.limits.max_candidates }));
  }
  for (const candidate of data.candidates) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      throw new Error(message('candidate_object'));
    }
    for (const key of Object.keys(candidate)) {
      if (!candidateFields.includes(key)) throw new Error(message('extra', { field: key }));
    }
    for (const field of candidateFields) {
      if (!(field in candidate)) throw new Error(message('field', { field }));
    }
    if (typeof candidate.id !== 'string' || !candidate.id.trim() ||
        candidate.id.length > rules.limits.candidate.id) {
      throw new Error(message('field', { field: 'id' }));
    }
    if (!rules.approaches.includes(candidate.approach)) throw new Error(message('approach'));
    if (!rules.claims.includes(candidate.accessibility_claim)) throw new Error(message('claim'));
    if (!rules.evaluations.includes(candidate.independent_evaluation)) throw new Error(message('evaluation'));
    if (typeof candidate.name !== 'string' || !candidate.name.trim() ||
        candidate.name.length > rules.limits.candidate.name) {
      throw new Error(message('name'));
    }
    for (const [field, limit] of Object.entries(rules.limits.candidate)) {
      if (typeof candidate[field] !== 'string' || candidate[field].length > limit) {
        throw new Error(message('field', { field }));
      }
    }
    for (const field of ['url', 'acr_url']) {
      if (!safeUrl(candidate[field])) throw new Error(message('url', { field }));
    }
  }
  return true;
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

export function markdownReport(data, sources = []) {
  validateResearch(data);
  const report = getRules().report;
  const project = data.project;
  const lines = [
    format(report.title, { name: project.name || report.untitled }), '',
    report.status, '',
    report.demonstration[String(Boolean(data.demonstration_only))], '',
    report.headings.context, ''
  ];
  for (const spec of report.project_fields) {
    lines.push(`- ${spec.label}: ${project[spec.field] || report.missing.project}`);
  }
  lines.push('', report.headings.options, '');
  if (!data.candidates.length) lines.push(report.empty_candidates);
  data.candidates.forEach((candidate, index) => {
    lines.push('', `### ${index + 1}. ${candidate.name}`, '');
    for (const spec of report.candidate_fields) {
      lines.push(`- ${spec.label}: ${candidateValue(candidate, spec.field, report.missing)}${spec.suffix || ''}`);
    }
    lines.push('', report.headings.questions, '');
    lines.push(...questionsFor(candidate).map(question => `- ${question}`));
  });
  lines.push('', report.headings.review, '');
  lines.push(...report.human_review.map(item => `- ${item}`));
  lines.push('', report.headings.sources, '');
  sources.forEach(source => lines.push(format(report.source_line, { name: source.name, url: source.url })));
  return lines.join('\n') + '\n';
}
