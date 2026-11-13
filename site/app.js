import { emptyResearch, prepareResearch, safeUrl, questionsFor, markdownReport } from './research.js';
import { getRules, setRules } from './rules.js';

let research = emptyResearch();
let sources = [];
let publicSoftware = [];
let publicSnapshotAsOf = 'not recorded';
let sourceStatusTimer;
const editing = { question: null, search: null, evidence: null, finding: null, decision: null };
const byId = id => document.getElementById(id);
const status = message => { byId('status').textContent = message; };

function valueOf(form, name) { return String(new FormData(form).get(name) || '').trim(); }
function splitList(value) { return value.split(',').map(item => item.trim()).filter(Boolean); }
function short(value, limit = 72) { const text = String(value || ''); return text.length > limit ? `${text.slice(0, limit - 1)}…` : text; }
function createText(tag, text, className) {
  const el = document.createElement(tag);
  el.textContent = text;
  if (className) el.className = className;
  return el;
}
function createLink(labelText, url, context = '') {
  if (!url || !safeUrl(url)) return createText('span', 'Not supplied');
  const el = createText('a', labelText);
  if (context) el.append(createText('span', `: ${context}`, 'visually-hidden'));
  el.href = url;
  el.target = '_blank';
  el.rel = 'noopener noreferrer';
  return el;
}
function appendCell(row, element) {
  const cell = document.createElement('td');
  cell.append(element);
  row.append(cell);
  return cell;
}
function label(group, value) { return getRules().labels[group]?.[value] || String(value).replaceAll('-', ' '); }
function newId(prefix) { return `${prefix}-${typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Date.now()}`; }
function dateTimeValue(value) {
  if (!value) return '';
  return value.includes('T') ? value.slice(0, 16) : `${value}T00:00`;
}
function dateValue(value) { return value ? value.slice(0, 10) : ''; }

function fillSelect(id, values, group) {
  const select = byId(id);
  const current = select.value;
  select.replaceChildren();
  for (const value of values) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label(group, value);
    select.append(option);
  }
  if (values.includes(current)) select.value = current;
}
function populateRecordSelect(id, records, labelFor, blankText) {
  const select = byId(id);
  const current = select.value;
  select.replaceChildren();
  const blank = document.createElement('option');
  blank.value = '';
  blank.textContent = blankText || 'Not selected';
  select.append(blank);
  for (const record of records) {
    const option = document.createElement('option');
    option.value = record.id;
    option.textContent = labelFor(record);
    select.append(option);
  }
  if ([...select.options].some(option => option.value === current)) select.value = current;
}
function renderCheckboxGroup(id, records, labelFor, selected = []) {
  const container = byId(id);
  container.replaceChildren();
  if (!records.length) {
    container.append(createText('p', 'No records available yet.', 'small'));
    return;
  }
  for (const record of records) {
    const item = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = record.id;
    input.checked = selected.includes(record.id);
    item.append(input, document.createTextNode(labelFor(record)));
    container.append(item);
  }
}
function readCheckboxes(id) {
  return [...byId(id).querySelectorAll('input[type=checkbox]:checked')].map(input => input.value);
}
function setCheckboxes(id, values) {
  for (const input of byId(id).querySelectorAll('input[type=checkbox]')) input.checked = values.includes(input.value);
}
function updateProjectForm() {
  for (const [key, value] of Object.entries(research.project)) {
    const control = byId('project-form').elements.namedItem(key);
    if (control) control.value = value;
  }
}
function applyProjectForm(target) {
  for (const key of Object.keys(target.project)) {
    const control = byId('project-form').elements.namedItem(key);
    if (control) target.project[key] = String(control.value).trim();
  }
}
function applyAccessibilityForm(target) {
  target.accessibility_requirements = {
    identified: byId('accessibility-identified').checked,
    tool: String(byId('accessibility-tool').value).trim(),
    reviewer: String(byId('accessibility-reviewer').value).trim(),
    as_of: String(byId('accessibility-as-of').value).trim(),
    requirement_ids: splitList(String(byId('accessibility-requirements').value)),
    notes: String(byId('accessibility-notes').value).trim()
  };
}
function syncAccessibilityForm() {
  const item = research.accessibility_requirements;
  byId('accessibility-identified').checked = item.identified;
  byId('accessibility-tool').value = item.tool;
  byId('accessibility-reviewer').value = item.reviewer;
  byId('accessibility-as-of').value = dateValue(item.as_of);
  byId('accessibility-requirements').value = item.requirement_ids.join(', ');
  byId('accessibility-notes').value = item.notes;
}
function hasWorkInProgress() {
  const formHasValues = [...byId('project-form').elements].some(el => el.name && String(el.value).trim());
  return research.candidates.length > 0 || research.research_questions.length > 0 ||
    research.searches.length > 0 || research.evidence.length > 0 ||
    research.findings.length > 0 || research.decisions.length > 0 || formHasValues;
}
function confirmReplace(message) { return !hasWorkInProgress() || window.confirm(message); }
function setFieldError(fieldId, message) {
  const field = byId(fieldId);
  const error = byId(`${fieldId}-error`);
  if (!field || !error) return;
  if (!message) {
    field.removeAttribute('aria-invalid');
    field.removeAttribute('aria-describedby');
    error.textContent = '';
    error.hidden = true;
    return;
  }
  field.setAttribute('aria-invalid', 'true');
  field.setAttribute('aria-describedby', error.id);
  error.textContent = message;
  error.hidden = false;
}
function candidateLabel(approach) { return getRules().approach_labels[approach] || approach; }

function mutate(mutator) {
  const next = structuredClone(research);
  applyProjectForm(next);
  mutator(next);
  try {
    research = prepareResearch(next);
    return true;
  } catch (error) {
    status(`Cannot save: ${error.message}`);
    return false;
  }
}
function commit(mutator, message, focusId) {
  if (!mutate(mutator)) return false;
  renderAll();
  if (focusId) byId(focusId).focus();
  status(message);
  return true;
}
function emptyRow(tbody, colspan, message) {
  const row = document.createElement('tr');
  const cell = createText('td', message);
  cell.colSpan = colspan;
  row.append(cell);
  tbody.append(row);
}
function actionCell(row, kind, record, name) {
  const cell = document.createElement('td');
  const edit = createText('button', 'Edit');
  edit.type = 'button';
  edit.className = 'secondary';
  edit.setAttribute('aria-label', `Edit ${name}`);
  edit.addEventListener('click', () => startEdit(kind, record.id));
  const remove = createText('button', 'Remove');
  remove.type = 'button';
  remove.className = 'secondary';
  remove.setAttribute('aria-label', `Remove ${name}`);
  remove.addEventListener('click', () => removeRecord(kind, record.id, name));
  cell.append(edit, document.createTextNode(' '), remove);
  row.append(cell);
}
function removeRecord(kind, id, name) {
  if (!window.confirm(`Remove ${name}?`)) return;
  const key = { question: 'research_questions', search: 'searches', evidence: 'evidence', finding: 'findings', decision: 'decisions' }[kind];
  const heading = { question: 'questions-heading', search: 'searches-heading', evidence: 'findings-heading', finding: 'findings-heading', decision: 'findings-heading' }[kind];
  if (editing[kind] === id) cancelEdit(kind);
  commit(data => { data[key] = data[key].filter(item => item.id !== id); }, `${name} removed.`, heading);
}

function renderQuestions() {
  const tbody = byId('question-table');
  tbody.replaceChildren();
  const questions = research.research_questions;
  byId('question-count').textContent = `${questions.length} question(s) recorded.`;
  if (!questions.length) emptyRow(tbody, 5, 'No research questions recorded. Start with the uncertainty that matters most.');
  for (const item of questions) {
    const row = document.createElement('tr');
    const question = document.createElement('div');
    question.append(createText('strong', item.question), createText('div', item.id, 'small'));
    appendCell(row, question);
    appendCell(row, createText('span', label('question_categories', item.category)));
    appendCell(row, createText('span', label('question_statuses', item.status)));
    appendCell(row, createText('span', `${item.search_ids.length} search(es), ${item.evidence_ids.length} evidence record(s)`, 'small'));
    actionCell(row, 'question', item, short(item.question, 50));
    tbody.append(row);
  }
  populateRecordSelect('search-question', questions, item => `${item.id}: ${short(item.question, 60)}`, 'Select a research question');
}

function renderSearches() {
  const tbody = byId('search-table');
  tbody.replaceChildren();
  const searches = research.searches;
  byId('search-count').textContent = `${searches.length} search(es) recorded. Only these count as investigations.`;
  if (!searches.length) emptyRow(tbody, 6, 'No searches recorded. A reference link is not a completed search.');
  for (const item of searches) {
    const row = document.createElement('tr');
    const source = document.createElement('div');
    source.append(createText('strong', item.source_name), createText('div', item.source_url || 'No URL', 'small'));
    appendCell(row, source);
    appendCell(row, createText('span', item.question_id));
    appendCell(row, createText('span', label('search_statuses', item.status)));
    appendCell(row, createText('span', item.searched_at || 'Not recorded'));
    appendCell(row, createText('span', item.result_count === null ? 'Not recorded' : String(item.result_count)));
    actionCell(row, 'search', item, item.source_name);
    tbody.append(row);
  }
  populateRecordSelect('evidence-search', searches, item => `${item.id}: ${item.source_name} (${label('search_statuses', item.status)})`, 'Select a search');
}

function renderEvidence() {
  const tbody = byId('evidence-table');
  tbody.replaceChildren();
  const evidence = research.evidence;
  byId('evidence-count').textContent = `${evidence.length} evidence record(s) recorded.`;
  if (!evidence.length) emptyRow(tbody, 6, 'No evidence recorded. Add a source record after a search.');
  for (const item of evidence) {
    const row = document.createElement('tr');
    const detail = document.createElement('div');
    detail.append(createText('strong', short(item.claim || item.source_name, 70)), createText('div', item.id, 'small'));
    appendCell(row, detail);
    appendCell(row, createText('span', item.source_name));
    appendCell(row, createText('span', label('evidence_types', item.evidence_type)));
    appendCell(row, createText('span', item.retrieved_at));
    appendCell(row, createText('span', label('verification_states', item.verification_state)));
    actionCell(row, 'evidence', item, item.id);
    tbody.append(row);
  }
  const evidenceLabel = item => `${item.id}: ${short(item.claim || item.source_name, 55)}`;
  renderCheckboxGroup('finding-supporting', evidence, evidenceLabel);
  renderCheckboxGroup('finding-contradicting', evidence, evidenceLabel);
  renderCheckboxGroup('decision-evidence', evidence, evidenceLabel);
  populateRecordSelect('evidence-candidate', research.candidates, item => `${item.name} (${item.id})`, 'No candidate selected');
}

function renderFindings() {
  const tbody = byId('finding-table');
  tbody.replaceChildren();
  const findings = research.findings;
  byId('finding-count').textContent = `${findings.length} finding(s) recorded.`;
  if (!findings.length) emptyRow(tbody, 5, 'No findings recorded. A finding needs supporting evidence; otherwise record an unresolved question.');
  for (const item of findings) {
    const row = document.createElement('tr');
    const detail = document.createElement('div');
    detail.append(createText('strong', short(item.description, 80)), createText('div', item.id, 'small'));
    appendCell(row, detail);
    appendCell(row, createText('span', item.supporting_evidence_ids.join(', ') || 'None'));
    appendCell(row, createText('span', item.question_ids.join(', ') || 'None'));
    appendCell(row, createText('span', item.requires_verification ? 'Required' : 'Not required'));
    actionCell(row, 'finding', item, short(item.description, 40));
    tbody.append(row);
  }
  renderCheckboxGroup('finding-questions', research.research_questions, item => `${item.id}: ${short(item.question, 55)}`);
  renderCheckboxGroup('finding-candidates', research.candidates, item => `${item.name} (${item.id})`);
}

function renderDecisions() {
  const tbody = byId('decision-table');
  tbody.replaceChildren();
  const decisions = research.decisions;
  byId('decision-count').textContent = `${decisions.length} decision(s) or follow-up item(s) recorded.`;
  if (!decisions.length) emptyRow(tbody, 5, 'No decisions or follow-up items recorded.');
  for (const item of decisions) {
    const row = document.createElement('tr');
    const detail = document.createElement('div');
    detail.append(createText('strong', short(item.description, 80)), createText('div', item.id, 'small'));
    appendCell(row, detail);
    appendCell(row, createText('span', label('decision_types', item.decision_type)));
    appendCell(row, createText('span', label('decision_statuses', item.status)));
    appendCell(row, createText('span', item.owner || 'Not assigned'));
    actionCell(row, 'decision', item, short(item.description, 40));
    tbody.append(row);
  }
}

function renderCandidates() {
  const tbody = byId('candidate-table');
  tbody.replaceChildren();
  const candidates = research.candidates;
  byId('candidate-count').textContent = `${candidates.length} option(s) recorded. Entries do not imply suitability or conformance.`;
  if (!candidates.length) {
    emptyRow(tbody, 5, 'No options recorded. Investigate government reuse, open source, and market alternatives.');
  }
  for (const candidate of candidates) {
    const row = document.createElement('tr');
    const nameBox = document.createElement('div');
    nameBox.append(createText('strong', candidate.name), createText('div', candidate.version || 'Version not recorded', 'small'));
    if (candidate.url) nameBox.append(createLink('View source', candidate.url, candidate.name));
    appendCell(row, nameBox);
    appendCell(row, createText('span', candidateLabel(candidate.approach)));
    const details = document.createElement('div');
    const acrText = candidate.acr.found
      ? `ACR found${candidate.acr.product_version ? ` for ${candidate.acr.product_version}` : ''}; ${label('acr_completeness', candidate.acr.completeness)}`
      : 'No ACR recorded';
    details.append(createText('strong', candidate.accessibility_claim.replaceAll('-', ' ')),
      createText('div', acrText, 'small'));
    if (candidate.acr_url) details.append(createLink('Open ACR link', candidate.acr_url, candidate.name));
    appendCell(row, details);
    appendCell(row, createText('span', questionsFor(candidate)[0]));
    const button = createText('button', 'Remove');
    button.type = 'button';
    button.className = 'secondary';
    button.setAttribute('aria-label', `Remove ${candidate.name}`);
    button.addEventListener('click', () => {
      const removedIndex = research.candidates.findIndex(item => item.id === candidate.id);
      commit(data => { data.candidates = data.candidates.filter(item => item.id !== candidate.id); }, `${candidate.name} removed from this research tab.`, 'candidates-heading');
      const remaining = [...byId('candidate-table').querySelectorAll('button')];
      const nextFocus = remaining[removedIndex] || remaining[removedIndex - 1] || byId('candidates-heading');
      nextFocus.focus();
    });
    appendCell(row, button);
    tbody.append(row);
  }
}

function renderSources() {
  const search = byId('source-search').value.toLocaleLowerCase().trim();
  const category = byId('source-category').value;
  const filtered = sources.filter(s => (!category || s.category === category) &&
    (!search || Object.values(s).join(' ').toLocaleLowerCase().includes(search)));
  byId('source-count').textContent = `${filtered.length} of ${sources.length} sources. These are links, not live results.`;
  clearTimeout(sourceStatusTimer);
  sourceStatusTimer = setTimeout(() => {
    const active = document.activeElement;
    if (active === byId('source-search') || active === byId('source-category')) {
      byId('source-status').textContent = `${filtered.length} of ${sources.length} sources match.`;
    }
  }, 500);
  const list = byId('source-list');
  list.replaceChildren();
  for (const s of filtered) {
    const article = document.createElement('article');
    article.className = 'source-card';
    const h3 = document.createElement('h3');
    h3.append(createLink(s.name, s.url));
    article.append(createText('p', s.category.replaceAll('-', ' '), 'category'), h3,
      createText('p', s.purpose), createText('p', `Limit: ${s.limitations}`, 'small'));
    list.append(article);
  }
  if (!filtered.length) list.append(createText('p', 'No sources match this filter.'));
}

function renderPublicSoftware() {
  const list = byId('software-list');
  list.replaceChildren();
  byId('software-status').textContent = `${publicSoftware.length} illustrative government software records. Snapshot fetched: ${publicSnapshotAsOf}. Not a comprehensive inventory.`;
  for (const record of publicSoftware) {
    const article = document.createElement('article');
    article.className = 'source-card';
    const title = document.createElement('h3');
    title.append(createLink(record.name, record.url));
    const licenses = Array.isArray(record.license_names) && record.license_names.length
      ? record.license_names.join(', ') : 'not stated';
    const version = record.version ? `Version ${record.version}. ` : '';
    const details = createText('p', `${record.organization}. ${version}Status as reported: ${record.status}. License as reported: ${licenses}. Updated: ${record.metadata_last_updated}`, 'small');
    const button = createText('button', 'Record as research option');
    button.append(createText('span', `: ${record.name}`, 'visually-hidden'));
    button.className = 'secondary';
    button.type = 'button';
    button.addEventListener('click', () => {
      const maxCandidates = getRules().limits.max_candidates;
      if (research.candidates.length >= maxCandidates) { status(`Limit of ${maxCandidates} options reached. Export your research.`); return; }
      if (research.candidates.some(c => c.url === record.url)) { status('This repository is already recorded as an option.'); return; }
      const item = {
        id: newId('candidate'), name: record.name, approach: 'government-reuse', version: record.version || '',
        scope: record.description, url: record.url, acr_url: '', acr_date: '',
        accessibility_claim: 'unknown', independent_evaluation: 'none',
        notes: `Illustrative metadata import from ${record.metadata_url}. Requires suitability, rights, and accessibility review. Source metadata last updated: ${record.metadata_last_updated}. Static snapshot fetched: ${publicSnapshotAsOf}.`,
        acr: { found: false, product_version: record.version || '', functions_covered: record.description || '', publication_date: '', evaluation_methods: '', catalog_id: '', completeness: 'unknown', notes: '' }
      };
      commit(data => { data.candidates.push(item); }, `Recorded ${record.name} for investigation. This does not mean it is suitable for your need.`, 'candidates-heading');
    });
    article.append(title, createText('p', record.description), details,
      createText('p', `Reported usage: ${record.usage_type.join(', ') || 'Unknown'}`, 'small'), button);
    list.append(article);
  }
  if (!publicSoftware.length) list.append(createText('p', 'No public software examples available. You can add research options manually.'));
}

function renderNextAction() {
  let text = 'Define the need below.';
  let target = '#scope';
  if (research.project.need && !research.research_questions.length) {
    text = 'Plan the first research question.';
    target = '#questions';
  } else if (research.research_questions.length && !research.searches.length) {
    text = 'Record the first search.';
    target = '#searches';
  } else if (research.searches.length && !research.evidence.length) {
    text = 'Attach evidence to a search.';
    target = '#findings';
  } else if (research.evidence.length && !research.findings.length) {
    text = 'Document a finding linked to evidence.';
    target = '#findings';
  } else if (research.decisions.some(item => item.status !== 'resolved')) {
    text = 'Review the open decisions and follow-up items.';
    target = '#findings';
  } else if (research.project.need && !research.accessibility_requirements.identified) {
    text = 'Record whether Section 508 requirements are identified.';
    target = '#accessibility';
  } else if (research.project.need) {
    text = 'Export the draft and identify what still needs a person.';
    target = '#report';
  }
  const container = byId('next-action');
  container.replaceChildren(createText('strong', 'Next: '));
  const link = createText('a', text);
  link.href = target;
  container.append(link);
}

function renderAll({ syncForms = false } = {}) {
  if (syncForms) { updateProjectForm(); syncAccessibilityForm(); }
  renderQuestions();
  renderSearches();
  renderEvidence();
  renderFindings();
  renderDecisions();
  renderCandidates();
  renderNextAction();
  byId('preview').textContent = markdownReport(research, sources);
}

function formFor(kind) { return byId(`${kind}-form`); }
function setEditing(kind, id) {
  editing[kind] = id;
  const form = formFor(kind);
  const cancel = document.querySelector(`.cancel-edit[data-kind="${kind}"]`);
  const submit = form.querySelector('button[type=submit]');
  cancel.hidden = false;
  submit.textContent = 'Save changes';
}
function clearEditing(kind) {
  editing[kind] = null;
  const form = formFor(kind);
  const cancel = document.querySelector(`.cancel-edit[data-kind="${kind}"]`);
  const submit = form.querySelector('button[type=submit]');
  cancel.hidden = true;
  submit.textContent = submit.dataset.addLabel || 'Add';
  form.reset();
}
function cancelEdit(kind) { clearEditing(kind); status('Edit cancelled.'); }

function startEdit(kind, id) {
  const records = { question: research.research_questions, search: research.searches, evidence: research.evidence, finding: research.findings, decision: research.decisions }[kind];
  const item = records.find(record => record.id === id);
  if (!item) return;
  setEditing(kind, id);
  if (kind === 'question') {
    byId('question-text').value = item.question;
    byId('question-need-link').value = item.need_link;
    byId('question-category').value = item.category;
    byId('question-status').value = item.status;
    byId('question-uncertainties').value = item.uncertainties;
    byId('question-text').focus();
  } else if (kind === 'search') {
    byId('search-question').value = item.question_id;
    byId('search-source-name').value = item.source_name;
    byId('search-source-url').value = item.source_url;
    byId('search-source-type').value = item.source_type;
    byId('search-authority').value = item.authority;
    byId('search-method').value = item.method;
    byId('search-query').value = item.query;
    byId('search-filters').value = item.filters;
    byId('search-date').value = dateTimeValue(item.searched_at);
    byId('search-as-of').value = dateValue(item.source_as_of);
    byId('search-result-count').value = item.result_count ?? '';
    byId('search-status').value = item.status;
    byId('search-limitations').value = item.limitations;
    byId('search-gaps').value = item.coverage_gaps;
    byId('search-source-name').focus();
  } else if (kind === 'evidence') {
    byId('evidence-search').value = item.search_id;
    byId('evidence-candidate').value = item.candidate_id;
    byId('evidence-source-name').value = item.source_name;
    byId('evidence-source-url').value = item.source_url;
    byId('evidence-source-id').value = item.source_identifier;
    byId('evidence-retrieved').value = dateTimeValue(item.retrieved_at);
    byId('evidence-as-of').value = dateValue(item.source_as_of);
    byId('evidence-type').value = item.evidence_type;
    byId('evidence-version').value = item.product_version;
    byId('evidence-requirements').value = item.requirement_ids.join(', ');
    byId('evidence-verification').value = item.verification_state;
    byId('evidence-reviewer').value = item.reviewer;
    byId('evidence-claim').value = item.claim;
    byId('evidence-limitations').value = item.limitations;
    byId('evidence-uncertainties').value = item.uncertainties;
    byId('evidence-source-name').focus();
  } else if (kind === 'finding') {
    byId('finding-description').value = item.description;
    byId('finding-gap').value = item.evidence_gap;
    byId('finding-verify').checked = item.requires_verification;
    byId('finding-notes').value = item.reviewer_notes;
    setCheckboxes('finding-supporting', item.supporting_evidence_ids);
    setCheckboxes('finding-contradicting', item.contradicting_evidence_ids);
    setCheckboxes('finding-questions', item.question_ids);
    setCheckboxes('finding-candidates', item.candidate_ids);
    byId('finding-description').focus();
  } else if (kind === 'decision') {
    byId('decision-description').value = item.description;
    byId('decision-type').value = item.decision_type;
    byId('decision-status').value = item.status;
    byId('decision-owner').value = item.owner;
    byId('decision-rationale').value = item.rationale;
    byId('decision-due').value = dateValue(item.due_date);
    byId('decision-resolved').value = dateTimeValue(item.resolved_at);
    setCheckboxes('decision-evidence', item.evidence_ids);
    byId('decision-description').focus();
  }
}

function saveQuestion(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const item = {
    id: editing.question || newId('rq'),
    question: valueOf(form, 'question'), need_link: valueOf(form, 'need_link'),
    category: valueOf(form, 'category'), status: valueOf(form, 'status'),
    uncertainties: valueOf(form, 'uncertainties'), search_ids: [], evidence_ids: []
  };
  const id = editing.question;
  const ok = commit(data => {
    if (id) {
      const index = data.research_questions.findIndex(record => record.id === id);
      data.research_questions[index] = { ...data.research_questions[index], ...item };
    } else data.research_questions.push(item);
  }, id ? 'Research question updated.' : 'Research question added.', 'questions-heading');
  if (ok) clearEditing('question');
}

function saveSearch(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const rawCount = valueOf(form, 'result_count');
  const sourceUrl = valueOf(form, 'source_url');
  if (!safeUrl(sourceUrl)) {
    setFieldError('search-source-url', 'Enter an HTTPS URL, or leave this field blank.');
    byId('search-source-url').focus();
    status('Search source URL must use HTTPS.');
    return;
  }
  setFieldError('search-source-url', '');
  const item = {
    id: editing.search || newId('search'),
    question_id: valueOf(form, 'question_id'), source_name: valueOf(form, 'source_name'),
    source_url: valueOf(form, 'source_url'), source_type: valueOf(form, 'source_type'),
    authority: valueOf(form, 'authority'), query: valueOf(form, 'query'), filters: valueOf(form, 'filters'),
    method: valueOf(form, 'method'), searched_at: valueOf(form, 'searched_at'),
    source_as_of: valueOf(form, 'source_as_of'),
    result_count: rawCount === '' ? null : Number(rawCount), status: valueOf(form, 'status'),
    limitations: valueOf(form, 'limitations'), coverage_gaps: valueOf(form, 'coverage_gaps')
  };
  const id = editing.search;
  const ok = commit(data => {
    if (id) {
      const index = data.searches.findIndex(record => record.id === id);
      data.searches[index] = { ...data.searches[index], ...item };
    } else data.searches.push(item);
  }, id ? 'Search updated.' : 'Search recorded.', 'searches-heading');
  if (ok) clearEditing('search');
}

function saveEvidence(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const sourceUrl = valueOf(form, 'source_url');
  if (!safeUrl(sourceUrl)) {
    setFieldError('evidence-source-url', 'Enter an HTTPS URL, or leave this field blank.');
    byId('evidence-source-url').focus();
    status('Evidence source URL must use HTTPS.');
    return;
  }
  setFieldError('evidence-source-url', '');
  const item = {
    id: editing.evidence || newId('ev'),
    search_id: valueOf(form, 'search_id'), source_name: valueOf(form, 'source_name'),
    source_url: valueOf(form, 'source_url'), source_identifier: valueOf(form, 'source_identifier'),
    retrieved_at: valueOf(form, 'retrieved_at'), source_as_of: valueOf(form, 'source_as_of'),
    evidence_type: valueOf(form, 'evidence_type'), candidate_id: valueOf(form, 'candidate_id'),
    product_version: valueOf(form, 'product_version'),
    requirement_ids: splitList(valueOf(form, 'requirement_ids')),
    claim: valueOf(form, 'claim'), limitations: valueOf(form, 'limitations'),
    uncertainties: valueOf(form, 'uncertainties'),
    verification_state: valueOf(form, 'verification_state'), reviewer: valueOf(form, 'reviewer')
  };
  const id = editing.evidence;
  const ok = commit(data => {
    if (id) {
      const index = data.evidence.findIndex(record => record.id === id);
      data.evidence[index] = { ...data.evidence[index], ...item };
    } else data.evidence.push(item);
  }, id ? 'Evidence updated.' : 'Evidence added.', 'findings-heading');
  if (ok) clearEditing('evidence');
}

function saveFinding(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const supporting = readCheckboxes('finding-supporting');
  if (!supporting.length) { status('Add at least one supporting evidence record before saving a finding.'); const first = byId('finding-supporting').querySelector('input'); if (first) first.focus(); return; }
  const item = {
    id: editing.finding || newId('finding'),
    description: valueOf(form, 'description'),
    supporting_evidence_ids: supporting,
    contradicting_evidence_ids: readCheckboxes('finding-contradicting'),
    evidence_gap: valueOf(form, 'evidence_gap'),
    question_ids: readCheckboxes('finding-questions'),
    candidate_ids: readCheckboxes('finding-candidates'),
    requires_verification: byId('finding-verify').checked,
    reviewer_notes: valueOf(form, 'reviewer_notes')
  };
  const id = editing.finding;
  const ok = commit(data => {
    if (id) {
      const index = data.findings.findIndex(record => record.id === id);
      data.findings[index] = { ...data.findings[index], ...item };
    } else data.findings.push(item);
  }, id ? 'Finding updated.' : 'Finding added.', 'findings-heading');
  if (ok) clearEditing('finding');
}

function saveDecision(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const item = {
    id: editing.decision || newId('decision'),
    description: valueOf(form, 'description'), decision_type: valueOf(form, 'decision_type'),
    status: valueOf(form, 'status'), owner: valueOf(form, 'owner'),
    rationale: valueOf(form, 'rationale'), evidence_ids: readCheckboxes('decision-evidence'),
    due_date: valueOf(form, 'due_date'), resolved_at: valueOf(form, 'resolved_at')
  };
  const id = editing.decision;
  const ok = commit(data => {
    if (id) {
      const index = data.decisions.findIndex(record => record.id === id);
      data.decisions[index] = { ...data.decisions[index], ...item };
    } else data.decisions.push(item);
  }, id ? 'Decision updated.' : 'Decision added.', 'findings-heading');
  if (ok) clearEditing('decision');
}

function addCandidate(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const rules = getRules();
  const candidate = {
    id: newId('candidate'), name: valueOf(form, 'name'), approach: valueOf(form, 'approach'),
    version: valueOf(form, 'version'), scope: valueOf(form, 'scope'), url: valueOf(form, 'url'),
    acr_url: valueOf(form, 'acr_url'), acr_date: valueOf(form, 'acr_date'),
    accessibility_claim: valueOf(form, 'accessibility_claim'),
    independent_evaluation: valueOf(form, 'independent_evaluation'), notes: valueOf(form, 'notes'),
    acr: {
      found: byId('acr-found').checked || Boolean(valueOf(form, 'acr_url')),
      product_version: valueOf(form, 'acr_product_version') || valueOf(form, 'version'),
      functions_covered: valueOf(form, 'acr_functions_covered') || valueOf(form, 'scope'),
      publication_date: valueOf(form, 'acr_date'),
      evaluation_methods: valueOf(form, 'acr_evaluation_methods'),
      catalog_id: valueOf(form, 'acr_catalog_id'),
      completeness: valueOf(form, 'acr_completeness'),
      notes: valueOf(form, 'acr_notes')
    }
  };
  if (research.candidates.length >= rules.limits.max_candidates) {
    status(`Limit of ${rules.limits.max_candidates} options reached. Export your research.`);
    return;
  }
  const urlValid = safeUrl(candidate.url);
  const acrUrlValid = safeUrl(candidate.acr_url);
  if (!urlValid || !acrUrlValid) {
    setFieldError('candidate-url', urlValid ? '' : 'Enter an HTTPS URL, or leave this field blank.');
    setFieldError('acr-url', acrUrlValid ? '' : 'Enter an HTTPS URL, or leave this field blank.');
    (urlValid ? byId('acr-url') : byId('candidate-url')).focus();
    status('Source and ACR links must use HTTPS.');
    return;
  }
  setFieldError('candidate-url', '');
  setFieldError('acr-url', '');
  const ok = commit(data => { data.candidates.push(candidate); }, `Added ${candidate.name}. Accessibility claims remain unverified.`, 'candidates-heading');
  if (ok) { form.reset(); byId('acr-found').checked = false; }
}

function saveAccessibility(event) {
  event.preventDefault();
  const item = {
    identified: byId('accessibility-identified').checked,
    tool: valueOf(event.currentTarget, 'tool'), reviewer: valueOf(event.currentTarget, 'reviewer'),
    as_of: valueOf(event.currentTarget, 'as_of'),
    requirement_ids: splitList(valueOf(event.currentTarget, 'requirement_ids')),
    notes: valueOf(event.currentTarget, 'notes')
  };
  commit(data => { data.accessibility_requirements = item; }, 'Accessibility requirements saved.', 'accessibility-heading');
}

function saveScope(event) {
  event.preventDefault();
  commit(data => { applyProjectForm(data); }, 'Research scope saved in this tab. Export a JSON file to keep a copy.', 'scope-heading');
}

function renderReport() {
  try {
    const prepared = structuredClone(research);
    applyProjectForm(prepared);
    applyAccessibilityForm(prepared);
    research = prepareResearch(prepared);
    byId('preview').textContent = markdownReport(research, sources);
    return true;
  } catch (error) {
    status(`Report could not be generated: ${error.message}`);
    return false;
  }
}

function download(content, filename, type) {
  const file = new Blob([content], { type });
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

async function loadDemo() {
  if (!confirmReplace('Replace the research in this tab with the fictional exercise? Unsaved changes will be lost.')) return;
  try {
    const response = await fetch('./data/demo.json');
    if (!response.ok) throw new Error('Demo file unavailable.');
    research = prepareResearch(await response.json());
    renderAll({ syncForms: true });
    status('Fictional DITAP exercise loaded. It must not be presented as real procurement evidence.');
  } catch (error) { status(`Could not load demonstration: ${error.message}`); }
}

async function importFile(event) {
  const input = event.currentTarget;
  const file = input.files?.[0];
  if (!file) return;
  try {
    const maxBytes = getRules().limits.max_import_bytes;
    if (file.size > maxBytes) throw new Error(`File exceeds the ${maxBytes.toLocaleString()} byte limit.`);
    const prepared = prepareResearch(JSON.parse(await file.text()));
    if (!confirmReplace('Replace the research in this tab with the imported file? Unsaved changes will be lost.')) return;
    research = prepared;
    renderAll({ syncForms: true });
    const migrationNote = prepared.migration ? ` Migrated from schema ${prepared.migration.from_schema_version}.` : '';
    status(`Research JSON imported in this tab.${migrationNote} Review all unverified claims.`);
  } catch (error) { status(`Import failed: ${error.message}`); }
  finally { input.value = ''; }
}

async function init() {
  try {
    const response = await fetch('./data/rules.json');
    if (!response.ok) throw new Error('Decision rules unavailable.');
    setRules(await response.json());
  } catch (error) {
    status(`Application rules unavailable: ${error.message}`);
    return;
  }
  fillSelect('question-category', getRules().question_categories, 'question_categories');
  fillSelect('question-status', getRules().question_statuses, 'question_statuses');
  fillSelect('search-source-type', getRules().source_types, 'source_types');
  fillSelect('search-authority', getRules().authorities, 'authorities');
  fillSelect('search-method', getRules().search_methods, 'search_methods');
  fillSelect('search-status', getRules().search_statuses, 'search_statuses');
  fillSelect('evidence-type', getRules().evidence_types, 'evidence_types');
  fillSelect('evidence-verification', getRules().verification_states, 'verification_states');
  fillSelect('decision-type', getRules().decision_types, 'decision_types');
  fillSelect('decision-status', getRules().decision_statuses, 'decision_statuses');
  fillSelect('acr-completeness', getRules().acr_completeness, 'acr_completeness');

  try {
    const response = await fetch('./data/sources.json');
    if (!response.ok) throw new Error('Source list unavailable.');
    sources = await response.json();
    const select = byId('source-category');
    [...new Set(sources.map(s => s.category))].sort().forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category.replaceAll('-', ' ');
      select.append(option);
    });
  } catch (error) { status(`Source catalog unavailable: ${error.message}`); }
  try {
    const response = await fetch('./data/public-software.json');
    if (!response.ok) throw new Error('public software snapshot unavailable');
    const snapshot = await response.json();
    publicSoftware = Array.isArray(snapshot.entries) ? snapshot.entries : [];
    publicSnapshotAsOf = String(snapshot.retrieved_at || 'not recorded');
  } catch (error) { status(`Optional public metadata examples unavailable: ${error.message}`); }
  renderPublicSoftware();

  for (const form of document.querySelectorAll('.record-form')) {
    const submit = form.querySelector('button[type=submit]');
    if (submit) submit.dataset.addLabel = submit.textContent;
  }
  byId('source-search').addEventListener('input', renderSources);
  byId('source-category').addEventListener('change', renderSources);
  byId('project-form').addEventListener('submit', saveScope);
  byId('question-form').addEventListener('submit', saveQuestion);
  byId('search-form').addEventListener('submit', saveSearch);
  byId('evidence-form').addEventListener('submit', saveEvidence);
  byId('finding-form').addEventListener('submit', saveFinding);
  byId('decision-form').addEventListener('submit', saveDecision);
  byId('candidate-form').addEventListener('submit', addCandidate);
  byId('accessibility-form').addEventListener('submit', saveAccessibility);
  for (const button of document.querySelectorAll('.cancel-edit')) {
    button.addEventListener('click', () => cancelEdit(button.dataset.kind));
  }
  for (const id of ['candidate-url', 'acr-url', 'search-source-url', 'evidence-source-url']) byId(id).addEventListener('input', () => setFieldError(id, ''));
  byId('demo').addEventListener('click', loadDemo);
  byId('reset').addEventListener('click', () => {
    if (window.confirm('Discard unsaved research from this tab?')) {
      research = emptyResearch();
      for (const form of document.querySelectorAll('form')) form.reset();
      for (const kind of Object.keys(editing)) clearEditing(kind);
      for (const id of ['candidate-url', 'acr-url', 'search-source-url', 'evidence-source-url']) setFieldError(id, '');
      renderAll({ syncForms: true });
      status('Started a blank research record.');
    }
  });
  byId('import-file').addEventListener('change', importFile);
  byId('export-json').addEventListener('click', () => {
    if (!renderReport()) return;
    download(JSON.stringify(research, null, 2) + '\n', 'market-research.json', 'application/json');
    status('Research JSON exported. Store it according to agency information policy.');
  });
  byId('export-md').addEventListener('click', () => {
    if (!renderReport()) return;
    download(markdownReport(research, sources), 'market-research-report.md', 'text/markdown');
    status('Draft Markdown report exported. It requires human review.');
  });
  byId('show-preview').addEventListener('click', () => {
    if (renderReport()) status('Draft report preview refreshed.');
  });
  renderSources();
  renderAll({ syncForms: true });
}
init();
