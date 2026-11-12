export const SCHEMA_VERSION = '0.1.0';
export const APPROACHES = ['government-reuse', 'open-source', 'commercial', 'new-build'];
export const CLAIMS = ['supports', 'partially-supports', 'does-not-support', 'not-evaluated', 'unknown'];
export const EVALUATIONS = ['none', 'planned', 'completed'];
export const emptyResearch = () => ({
  schema_version: SCHEMA_VERSION,
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
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.schema_version !== SCHEMA_VERSION) {
    throw new Error('Unsupported research file or schema version.');
  }
  if (!data.project || typeof data.project !== 'object') throw new Error('Missing project.');
  for (const field of ['name', 'need', 'users', 'constraints', 'ict_type']) {
    if (typeof data.project[field] !== 'string' || data.project[field].length > 5000) throw new Error(`Invalid project field: ${field}`);
  }
  if (!Array.isArray(data.candidates) || data.candidates.length > 100) throw new Error('Invalid option list or too many options.');
  for (const c of data.candidates) {
    if (!c || typeof c !== 'object' || typeof c.name !== 'string' || !c.name.trim() || !APPROACHES.includes(c.approach)) throw new Error('Invalid option.');
    if (!CLAIMS.includes(c.accessibility_claim) || !EVALUATIONS.includes(c.independent_evaluation)) throw new Error('Invalid accessibility information.');
    for (const field of ['id', 'version', 'scope', 'url', 'acr_url', 'acr_date', 'notes']) {
      if (typeof c[field] !== 'string' || c[field].length > 5000) throw new Error(`Invalid option field: ${field}`);
    }
    if (!safeUrl(c.url) || !safeUrl(c.acr_url)) throw new Error('Only HTTPS source URLs are accepted.');
  }
  return true;
}

export function questionsFor(c) {
  const questions = [];
  if (!c.url) questions.push('Identify an authoritative product or repository source.');
  if (!c.version) questions.push('Confirm product version and configuration.');
  if (!c.acr_url) questions.push('Request a product- and version-matched ACR.');
  if (!c.acr_date) questions.push('Confirm the ACR date and scope.');
  const byClaim = {
    supports: 'Vendor support claim needs independent evidence.',
    'partially-supports': 'Investigate affected tasks, user impact, and a remediation plan.',
    'does-not-support': 'Investigate barriers and alternatives with an accessibility specialist.',
    'not-evaluated': 'Not evaluated means evidence is missing, not a failed test.',
    unknown: 'Obtain accessibility evidence; the claim is unknown.'
  };
  questions.push(byClaim[c.accessibility_claim] || byClaim.unknown);
  if (c.independent_evaluation === 'completed') questions.push('Review the actual independent evaluation report and coverage.');
  else if (c.independent_evaluation === 'planned') questions.push('Confirm independent evaluation scope and completion date.');
  else questions.push('Plan independent testing of critical tasks.');
  questions.push('Any potential Section 508 exception requires separate agency review, not approval here.');
  return questions;
}

export function markdownReport(data, sources = []) {
  validateResearch(data);
  const project = data.project;
  const lines = [
    `# Market research draft: ${project.name || 'Untitled research'}`, '',
    '**Status: Unapproved working notes. Not a selection, conformance determination, or exception approval.**', '',
    `**Fictional DITAP demonstration:** ${data.demonstration_only ? 'Yes' : 'No label; evidence still requires verification'}`, '',
    '## Research scope', '',
    `- Need: ${project.need || 'Not recorded'}`,
    `- Users: ${project.users || 'Not recorded'}`,
    `- ICT category: ${project.ict_type || 'Not recorded'}`,
    `- Constraints: ${project.constraints || 'Not recorded'}`, '',
    '## Alternatives investigated', ''
  ];
  if (!data.candidates.length) lines.push('No alternatives recorded. Do not treat this as a completed market search.', '');
  data.candidates.forEach((c, index) => {
    lines.push(`### ${index + 1}. ${c.name}`, '',
      `- Approach: ${c.approach}`, `- Version: ${c.version || 'Not recorded'}`,
      `- Functional scope: ${c.scope || 'Not recorded'}`,
      `- Evidence source: ${c.url || 'Not recorded'}`,
      `- ACR source: ${c.acr_url || 'Not found'}`,
      `- ACR date: ${c.acr_date || 'Not found'}`,
      `- Accessibility claim: ${c.accessibility_claim} (not independently verified by this tool)`,
      `- Independent evaluation: ${c.independent_evaluation} (review status only)`,
      `- Notes: ${c.notes || 'Not recorded'}`, '', '**Evidence gaps and research questions:**', '');
    lines.push(...questionsFor(c).map(q => `- ${q}`), '');
  });
  lines.push('## Human review before making decisions', '',
    '- Check whether the alternative search was broad enough, including government reuse and open source.',
    '- Generate applicable Section 508 requirements using GSA ART and check agency policy.',
    '- Confirm ACR versions and test claims with suitable independent evidence.',
    '- Ask about critical workflows, maintenance, interoperability, user needs, and total cost.',
    '- Document market engagement and any gaps; never assume a Section 508 exception is approved.',
    '- Review digital-first public service requirements and their applicability.', '',
    '## Sources to consult (not queried by this application)', '');
  sources.forEach(s => lines.push(`- ${s.name}: ${s.url}`));
  return lines.join('\n') + '\n';
}
