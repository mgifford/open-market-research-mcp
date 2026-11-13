/** Deterministic, public-data-only functions. No fetches, AI calls or persistence. */

export const LIMITS = Object.freeze({ sourceQuery: 120, publicNeed: 1200, category: 80, label: 100, limit: 20 });

const DIRECT_RESEARCH_URLS = Object.freeze({
  'sam-gov': 'https://sam.gov/',
  'sam-gov-mcp': 'https://sam.gov/',
  'usaspending-gov': 'https://www.usaspending.gov/',
  'usaspending-gov-mcp': 'https://www.usaspending.gov/',
  'gsa-calc-mcp': 'https://buy.gsa.gov/pricing/',
  'bls-oews-mcp': 'https://www.bls.gov/oes/',
  'acquisition-gov': 'https://www.acquisition.gov/',
  'acquisition-gov-mcp': 'https://www.acquisition.gov/',
  'ecfr-gov': 'https://www.ecfr.gov/',
  'ecfr-mcp': 'https://www.ecfr.gov/',
});

export function normalizeText(value, maxLength) {
  if (typeof value !== 'string') throw new TypeError('Expected text.');
  const clean = value.trim().replace(/\s+/g, ' ');
  if (clean.length > maxLength) throw new RangeError(`Text exceeds ${maxLength} characters.`);
  return clean;
}

function sourceRow(source) {
  return {
    id: source.id,
    name: source.name.replace(/ via 1102tools$/i, ''),
    category: source.category,
    research_url: DIRECT_RESEARCH_URLS[source.id] || source.url,
    catalog_reference_url: source.url,
    purpose: source.purpose,
    limitations: source.limitations,
    use_when: source.use_when || '',
    authentication: source.authentication || '',
    record_how: source.record_how || '',
    search_strategy: source.search_strategy || source.method || '',
    suggested_method: source.method,
    source_status: 'reference_only_not_searched',
  };
}

export function discoverSources(sources, { query = '', category = '', limit = 10 } = {}) {
  const q = normalizeText(query, LIMITS.sourceQuery).toLocaleLowerCase('en');
  const cat = normalizeText(category, LIMITS.category).toLocaleLowerCase('en');
  if (!Number.isInteger(limit) || limit < 1 || limit > LIMITS.limit) {
    throw new RangeError(`limit must be an integer between 1 and ${LIMITS.limit}.`);
  }
  const matching = sources.filter((source) => {
    if (cat && source.category.toLocaleLowerCase('en') !== cat) return false;
    if (!q) return true;
    return [source.id, source.name, source.category, source.purpose, source.method, source.use_when, source.questions, source.search_strategy, source.record_how]
      .some((part) => String(part || '').toLocaleLowerCase('en').includes(q));
  });
  return {
    status: 'curated_directory_only',
    search_performed: false,
    total_matches: matching.length,
    returned: Math.min(matching.length, limit),
    sources: matching.slice(0, limit).map(sourceRow),
    caution: 'These are starting points. The service has not queried SAM.gov, vendors, or any live system. A reference URL is not evidence that market research was performed.',
  };
}

function selectIds(sources, ids) {
  const wanted = new Set(ids);
  return sources.filter((source) => wanted.has(source.id)).map(sourceRow);
}

export function createPublicPlan(sources, {
  publicNeed,
  acquisitionType = 'digital-service',
  context = 'US federal',
  confirmedPublic = false,
} = {}) {
  if (confirmedPublic !== true) {
    throw new Error('Confirm that the need description is approved for public disclosure before sending it to this public server.');
  }
  const need = normalizeText(publicNeed, LIMITS.publicNeed);
  if (need.length < 10) throw new Error('Provide a public description of the need (at least 10 characters).');
  const agencyContext = normalizeText(context, LIMITS.label);
  const validTypes = ['digital-service', 'software', 'professional-services', 'other'];
  if (!validTypes.includes(acquisitionType)) throw new Error('Unsupported acquisitionType.');

  const sourceIds = acquisitionType === 'other'
    ? ['sam-gov', 'usaspending-gov', 'acquisition-gov', 'ecfr-gov']
    : acquisitionType === 'professional-services'
      ? ['sam-gov', 'usaspending-gov', 'gsa-calc-mcp', 'bls-oews-mcp', 'acquisition-gov']
      : ['cms-codejson', 'publiccode', 'sam-gov', 'usaspending-gov', 'gsa-art', 'gsa-buy', 'digital-first'];

  const questions = [
    { id: 'RQ-NEED', topic: 'Outcome and users', question: 'What outcomes and user tasks must be supported, including users with disabilities?', evidence_needed: 'Approved public requirements and user research; agency approval needed for restricted details.' },
    { id: 'RQ-REUSE', topic: 'Existing solutions', question: 'Can an existing agency or government solution be reused, adapted, or shared?', evidence_needed: 'Existing system inventory, actual reuse rights, fit and maintenance evidence.' },
    { id: 'RQ-MARKET', topic: 'Market breadth', question: 'Which technically distinct approaches are available without privileging an incumbent?', evidence_needed: 'Dated searches, source references, scope, and limitations for every approach.' },
    { id: 'RQ-COST', topic: 'Lifecycle cost', question: 'What are credible lifecycle cost drivers, transition costs, and exit risks?', evidence_needed: 'Comparable published benchmarks plus assumptions and omissions; not merely advertised price.' },
    { id: 'RQ-ACCESS', topic: 'Accessibility', question: 'Which accessibility requirements apply, and what version-matched ACR and other testing evidence exists?', evidence_needed: 'Requirements from GSA ART where applicable, ACR scope/version, independent evidence, and unresolved gaps.' },
    { id: 'RQ-OPEN', topic: 'Interoperability and stewardship', question: 'What open standards, interoperability, licensing, security, and maintenance questions affect suitability?', evidence_needed: 'Product-specific documentation, rights and governance records, and agency specialist review.' },
  ];

  return {
    status: 'proposed_plan_not_completed_research',
    search_performed: false,
    jurisdiction_note: `${agencyContext || 'Agency context unspecified'}: confirm applicable rules, agency deviations, security requirements and approval authorities with your agency.`,
    acquisition_type: acquisitionType,
    public_need: need,
    questions,
    suggested_sources: selectIds(sources, sourceIds),
    proposed_searches: [
      { id: 'S-REUSE', status: 'not-searched', instruction: 'Check actual agency holdings and public government software inventories; record access restrictions and date searched.' },
      { id: 'S-PUBLIC', status: 'not-searched', instruction: 'Search relevant public procurement and spending data; record scope, date, filters, and any failed/no-result searches.' },
      { id: 'S-INDUSTRY', status: 'not-searched', instruction: 'Investigate multiple viable approaches and published product evidence; record vendor assertions separately.' },
      { id: 'S-ACCESS', status: 'not-searched', instruction: 'Determine accessibility requirements and request the ACR for the exact product/version, plus any independent test results.' },
    ],
    next_steps: [
      'Review scope with the program and acquisition team.',
      'Perform searches in the authoritative services, then log what was actually searched.',
      'Record cited evidence and its date/limitations before writing findings.',
      'Have authorized officers and specialists review open decisions.',
    ],
    limitations: [
      'No live sources were queried; the source directory is not a complete market survey.',
      'This plan is not a legal determination, vendor assessment, Section 508 finding, or acquisition approval.',
      'Do not transmit procurement-sensitive, proprietary, CUI, personal, or protected information to this anonymous service.',
    ],
  };
}

export function accessibilityChecklist({ ictType = 'digital service', acrStatus = 'unknown' } = {}) {
  const type = normalizeText(ictType, LIMITS.label);
  if (!['unknown', 'available', 'missing', 'outdated'].includes(acrStatus)) {
    throw new Error('acrStatus must be unknown, available, missing, or outdated.');
  }
  return {
    status: 'questions_only_not_an_assessment',
    product_context: type || 'Unspecified ICT',
    acr_status: acrStatus,
    steps: [
      'Identify requirements relevant to this ICT acquisition using the GSA Accessibility Requirements Tool and agency guidance.',
      'Request an ACR covering the specific product, version, and functions being procured.',
      'Check the ACR evaluation methods, author, date, exceptions, partially supported criteria, and missing claims.',
      'Distinguish supplier statements from independently verified testing and observed user barriers.',
      'Request issue-level information and remediation timelines for partially supported or unsupported criteria.',
      'Determine whether additional manual testing, user evaluation, or agency Section 508 specialist review is required.',
      'Document unresolved gaps; never infer nonconformance solely from an absent ACR or claim conformance from its presence.',
    ],
    references: [
      { title: 'GSA Accessibility Requirements Tool', url: 'https://www.section508.gov/art/' },
      { title: 'Buying accessible ICT', url: 'https://www.section508.gov/buy-sell/' },
      { title: 'GSA ACR Editor', url: 'https://acreditor.section508.gov/' },
      { title: 'OpenACR format', url: 'https://github.com/GSA/openacr' },
    ],
    disclaimer: 'Guidance only. Human review and the agency authorization process are required.',
  };
}

export function methodologyGuide() {
  return {
    record_schema: 'https://github.com/mgifford/open-market-research-mcp/blob/main/schemas/research.schema.json',
    official_site: 'https://mgifford.github.io/open-market-research-mcp/',
    categories: [
      'Need and intended outcomes', 'Research questions', 'Search history',
      'Government reuse, open source, and commercial alternatives',
      'Supplier claims and independently verified evidence',
      'Accessibility requirements and ACR questions', 'Findings and contradictions',
      'Pending human decisions',
    ],
    required_provenance: [
      'A source URL and exact record identifier where available',
      'Date retrieved and source data-as-of date',
      'Query, filters, source and status for an actually performed search',
      'Scope, evidence type, verification status, reviewer, and limitations',
      'Relationships from findings to evidence and any contradicting evidence',
    ],
    key_distinctions: [
      'A suggested source is not a completed search.',
      'A failed search is not a completed search with no results.',
      'An award history is not proof of current supplier capability.',
      'An ACR is not independently verified conformance.',
      'AI prose is not a substitute for cited records or human review.',
    ],
    limitations: 'Read-only public reference service. No live searches, authenticated government data, storage, or agency approval.',
  };
}

export function reportTemplate() {
  return {
    status: 'blank_template_not_completed_report',
    headings: [
      'Draft status and human reviewers',
      'Acquisition need and intended users',
      'Applicable agency context (to be confirmed)',
      'Research methodology and actual search history',
      'Existing government services and software reuse options',
      'Other open-source and commercial approaches',
      'Evidence comparison and source dates',
      'Accessibility requirements and product-specific ACR evidence',
      'Interoperability, cost, maintenance and exit considerations',
      'Contradictory or insufficient evidence',
      'Questions requiring further research or specialist review',
      'Pending human decisions and approvals',
      'AI assistance disclosure, if applicable',
      'Evidence register and source links',
    ],
    instructions: [
      'Write only claims grounded in evidence that the researcher actually recorded.',
      'Label claims as supplier statements, official records, or independent evaluation.',
      'Do not invent URLs, search dates, sources, review results, or scores.',
      'Do not recommend a contract award or declare Section 508 conformance.',
      'Reference the versioned evidence record where possible.',
    ],
    resource: 'https://mgifford.github.io/open-market-research-mcp/',
  };
}

export function serviceInfo() {
  return {
    name: 'Open Market Research MCP (remote public reference edition)',
    transport: 'MCP Streamable HTTP',
    deployment: 'Optional Cloudflare Worker, independent of the GitHub Pages site',
    authorization: 'Anonymous and public references only; not approved for protected procurement content',
    data_processing: 'No storage, model requests, external API calls, or automatic live research in this implementation',
    tools: [
      'discover_research_sources', 'create_public_research_plan',
      'accessibility_evidence_checklist', 'research_methodology', 'report_outline',
    ],
    notice: 'Outputs are templates and research guidance, not completed research or an agency acquisition decision.',
  };
}
