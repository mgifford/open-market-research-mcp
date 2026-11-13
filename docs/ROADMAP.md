# Roadmap

The public application is a static, zero-install research workspace. The local MCP server, OpenACR import, and source adapters remain optional. Automated checks are not a substitute for manual accessibility or procurement-officer testing.

## Shipped foundation

- [x] Static GitHub Pages workspace with local-only data and portable JSON/Markdown.
- [x] Evidence-backed 0.2.0 record: questions, searches, evidence, findings, decisions, accessibility requirements.
- [x] 0.1.0 migration that preserves project/candidates and invents no research history.
- [x] Seven-stage guided workflow with evidence-linked findings and decisions.
- [x] Government reuse, open-source, commercial, and new-build alternatives; ACR scope and claims.
- [x] Shared decision rules for browser and Python; deterministic validation and report draft.
- [x] Source directory, public metadata adapters, OpenACR import prototype, optional 1102tools/USAspending fixture mapping.
- [x] Local stdio MCP server (8 tools, 2 resources) and local-LLM guide.
- [x] Automated Python, Node, Playwright, MCP, OpenACR, build, and axe/keyboard/reflow checks.
- [x] Expanded fictional DITAP case, worksheet, facilitator guide, rubric, pilot protocol, and sample reports.

## Phase 1 — zero-install usability (implemented, validation pending)

- [x] Landing page **Research a government purchase** with Start, Continue, and fictional-example actions.
- [x] Simplified start questions: problem, product/service, agency context, and guided/manual/AI-assisted preference.
- [x] Progressive disclosure for title, users, and constraints; incomplete answers allowed.
- [x] Optional `agency_context` and `research_mode` record fields, backward-compatible with existing 0.2.0 records.
- [x] Visible **Save research file** and **Continue existing research** with human-readable dated JSON filenames and resume guidance.
- [x] Technical MCP/local-LLM/AI guidance moved to a secondary About page.
- [x] Direct government source links (SAM.gov, USAspending, Acquisition.gov, eCFR, Section508.gov) and source cards that prefill a **not-searched** search form without creating a search record.
- [x] Phase 1 assessment, accessibility design plan, and procurement usability test plan.
- [ ] Manual NVDA/JAWS/VoiceOver, zoom, text-spacing, forced-colors, and cross-browser testing.
- [ ] Procurement-officer usability sessions on restricted devices.

Completion criterion: a nontechnical officer can begin and save research without an account or installation. This is implemented but not yet demonstrated with users.

## Phase 2 — source discovery and AI assistance (implemented, validation pending)

- [x] Expand source cards with what the source answers, when to use it, authentication expectations, recording guidance, and a search strategy.
- [x] Add prepared, documented search strategies without fabricating deep links or API behavior.
- [x] Generate context-sensitive prompts for **Plan my research**, **Review my evidence**, and **Draft my report**.
- [x] Add preview and one-click copy with sensitive-information warnings.
- [x] Record AI assistance in the research methodology when it materially contributes.
- [x] Keep proposed searches distinct from performed searches in prompts, source prefill, and the report.
- [x] Add automated tests for generated prompts, copy behavior, source guidance, and AI-use disclosure.
- [ ] Validate prompt usefulness with procurement officers and approved AI tools.

## Phase 3 — evidence and reporting

- [ ] Plain-language findings dashboard linking summaries to evidence and source dates.
- [ ] Clearer evidence-gap explanations and supplier/specialist questions.
- [ ] DOCX and PDF export, accessible print layout, and optional comparison CSV.
- [ ] Human review and approval fields with draft-status labeling.
- [ ] Generate all formats deterministically in the browser; no hosted backend.
- [ ] Preserve provenance, verification status, limitations, and open decisions in every export.

## Phase 4 — policy context and pilot validation

- [ ] Configurable jurisdiction, agency, acquisition category, policies, deviations, effective dates, and reviewer.
- [ ] Current FAR/FAR Overhaul and agency sources, with binding/policy/recommendation/educational distinctions.
- [ ] Test with DITAP participants and practicing procurement officers.
- [ ] Complete manual accessibility testing and document observed problems.
- [ ] Revise the interface from pilot evidence and record limitations.

Completion criterion: pilot evidence shows nontechnical procurement professionals can complete the principal workflow with limited assistance.

## Phase 5 — optional institutional integrations

Only after demonstrated demand:

- [ ] Explore a Microsoft 365 Copilot agent integration with agency approval.
- [x] Add a reviewable, disabled-by-default Cloudflare Worker starter for public read-only MCP tools; not deployed.
- [ ] Deploy and operate a centrally hosted, read-only MCP service with an authentication, authorization, privacy, security, and operations model.
- [ ] Coordinate with 1102tools maintainers; do not copy implementations.
- [ ] Investigate approved government API integrations and secure organizational storage.
- [ ] Establish governance for shared templates and research records.

None of these may become a prerequisite for the public application.

## Deferred or explicitly not planned

- No supplier ranking, automatic winner, Best Meets decision, Section 508 conformance determination, or exception approval.
- No fabricated confidence score or research-completeness percentage.
- No mandatory account, database, API key, hosted model, or installation.
- No claim that automated tests establish WCAG conformance.
- No publication of confidential research records through public Actions.
