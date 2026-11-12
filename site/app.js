import { emptyResearch, validateResearch, safeUrl, questionsFor, markdownReport } from './research.js';

let research = emptyResearch();
let sources = [];
let publicSoftware = [];
let publicSnapshotAsOf = 'not recorded';
const byId = id => document.getElementById(id);
const status = message => { byId('status').textContent = message; };

function valueOf(form, name) { return String(new FormData(form).get(name) || '').trim(); }
function createText(tag, text, className) {
  const el = document.createElement(tag);
  el.textContent = text;
  if (className) el.className = className;
  return el;
}
function createLink(label, url) {
  if (!url || !safeUrl(url)) return createText('span', 'Not supplied');
  const el = createText('a', label);
  el.href = url;
  el.target = '_blank';
  el.rel = 'noopener noreferrer';
  return el;
}
function appendCell(row, element) {
  const cell = document.createElement('td');
  cell.append(element);
  row.append(cell);
}
function updateProjectForm() {
  const form = byId('project-form');
  for (const [key, value] of Object.entries(research.project)) {
    const control = form.elements.namedItem(key);
    if (control) control.value = value;
  }
}
function candidateLabel(approach) {
  return ({
    'government-reuse': 'Government reuse', 'open-source': 'Open source',
    commercial: 'Commercial', 'new-build': 'New development'
  })[approach] || approach;
}
function renderCandidates() {
  const tbody = byId('candidate-table');
  tbody.replaceChildren();
  byId('candidate-count').textContent = `${research.candidates.length} option(s) recorded. Entries do not imply suitability or conformance.`;
  if (research.candidates.length === 0) {
    const tr = document.createElement('tr');
    const td = createText('td', 'No options recorded. Investigate government reuse, open source, and market alternatives.');
    td.colSpan = 5;
    tr.append(td);
    tbody.append(tr);
  }
  for (const candidate of research.candidates) {
    const row = document.createElement('tr');
    const nameBox = document.createElement('div');
    nameBox.append(createText('strong', candidate.name), createText('div', candidate.version || 'Version not recorded', 'small'));
    if (candidate.url) nameBox.append(createLink('View source', candidate.url));
    appendCell(row, nameBox);
    appendCell(row, createText('span', candidateLabel(candidate.approach)));
    const details = document.createElement('div');
    details.append(createText('strong', candidate.accessibility_claim.replaceAll('-', ' ')),
      createText('div', candidate.acr_url ? 'ACR URL supplied, not reviewed' : 'No ACR URL supplied', 'small'));
    if (candidate.acr_url) details.append(createLink('Open ACR link', candidate.acr_url));
    appendCell(row, details);
    const qs = questionsFor(candidate);
    appendCell(row, createText('span', qs[0]));
    const button = createText('button', 'Remove');
    button.type = 'button';
    button.className = 'secondary';
    button.setAttribute('aria-label', `Remove ${candidate.name}`);
    button.addEventListener('click', () => {
      research.candidates = research.candidates.filter(item => item.id !== candidate.id);
      render();
      status(`${candidate.name} removed from this research tab.`);
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
    const details = createText('p', `${record.organization}. Status as reported: ${record.status}. Updated: ${record.metadata_last_updated}`, 'small');
    const button = createText('button', 'Record as research option');
    button.className = 'secondary';
    button.type = 'button';
    button.addEventListener('click', () => {
      if (research.candidates.length >= 100) { status('Limit of 100 options reached. Export your research.'); return; }
      if (research.candidates.some(c => c.url === record.url)) { status('This repository is already recorded as an option.'); return; }
      const item = {
        id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `metadata-${Date.now()}`,
        name: record.name, approach: 'government-reuse', version: record.version || '',
        scope: record.description, url: record.url, acr_url: '', acr_date: '',
        accessibility_claim: 'unknown', independent_evaluation: 'none',
        notes: `Illustrative metadata import from ${record.metadata_url}. Requires suitability, rights, and accessibility review. Source metadata last updated: ${record.metadata_last_updated}. Static snapshot fetched: ${publicSnapshotAsOf}.`
      };
      research.candidates.push(item);
      render();
      status(`Recorded ${record.name} for investigation. This does not mean it is suitable for your need.`);
    });
    article.append(title, createText('p', record.description), details,
      createText('p', `Reported usage: ${record.usage_type.join(', ') || 'Unknown'}`, 'small'), button);
    list.append(article);
  }
  if (!publicSoftware.length) list.append(createText('p', 'No public software examples available. You can add research options manually.'));
}

function render() {
  updateProjectForm();
  renderCandidates();
  byId('preview').textContent = markdownReport(research, sources);
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
function saveScope(event) {
  event.preventDefault();
  const f = event.currentTarget;
  for (const key of Object.keys(research.project)) research.project[key] = valueOf(f, key);
  render();
  status('Research scope saved in this tab. Export a JSON file to keep a copy.');
}
function addCandidate(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const fields = ['name', 'approach', 'version', 'scope', 'url', 'acr_url', 'acr_date', 'accessibility_claim', 'independent_evaluation', 'notes'];
  const candidate = { id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${research.candidates.length}` };
  for (const field of fields) candidate[field] = valueOf(form, field);
  if (research.candidates.length >= 100) { status('Limit of 100 options reached. Export your research.'); return; }
  if (!safeUrl(candidate.url) || !safeUrl(candidate.acr_url)) { status('Source and ACR links must use HTTPS.'); return; }
  research.candidates.push(candidate);
  form.reset();
  render();
  status(`Added ${candidate.name}. Accessibility claims remain unverified.`);
}
async function loadDemo() {
  try {
    const response = await fetch('./data/demo.json');
    if (!response.ok) throw new Error('Demo file unavailable.');
    const incoming = await response.json();
    validateResearch(incoming);
    research = incoming;
    render();
    status('Fictional DITAP exercise loaded. It must not be presented as real procurement evidence.');
  } catch (error) { status(`Could not load demonstration: ${error.message}`); }
}
async function importFile(event) {
  const file = event.currentTarget.files?.[0];
  if (!file) return;
  try {
    if (file.size > 1000000) throw new Error('File exceeds the 1 MB limit.');
    const data = JSON.parse(await file.text());
    validateResearch(data);
    research = data;
    render();
    status('Research JSON imported in this tab. Review all unverified claims.');
  } catch (error) { status(`Import failed: ${error.message}`); }
  event.currentTarget.value = '';
}
async function init() {
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
  byId('source-search').addEventListener('input', renderSources);
  byId('source-category').addEventListener('change', renderSources);
  byId('project-form').addEventListener('submit', saveScope);
  byId('candidate-form').addEventListener('submit', addCandidate);
  byId('demo').addEventListener('click', loadDemo);
  byId('reset').addEventListener('click', () => {
    if (window.confirm('Discard unsaved research from this tab?')) {
      research = emptyResearch();
      byId('candidate-form').reset();
      render();
      status('Started a blank research record.');
    }
  });
  byId('import-file').addEventListener('change', importFile);
  byId('export-json').addEventListener('click', () => {
    download(JSON.stringify(research, null, 2) + '\n', 'market-research.json', 'application/json');
    status('Research JSON exported. Store it according to agency information policy.');
  });
  byId('export-md').addEventListener('click', () => {
    download(markdownReport(research, sources), 'market-research-report.md', 'text/markdown');
    status('Draft Markdown report exported. It requires human review.');
  });
  byId('show-preview').addEventListener('click', () => {
    byId('preview').textContent = markdownReport(research, sources);
    status('Draft report preview refreshed.');
  });
  renderSources();
  render();
}
init();
