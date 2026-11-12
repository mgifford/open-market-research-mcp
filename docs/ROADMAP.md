# Roadmap

The first release is intentionally an educational prototype, not a procurement system.

## Phase 0: shipped starter

- [x] Accessible-oriented static Pages interface (not yet independently accessibility tested)
- [x] Fictional DITAP scenario and exportable working record
- [x] Curated official and upstream source directory
- [x] Small allowlisted CMS public code.json example snapshot, optionally refreshed by Actions
- [x] Deterministic source search, evidence questions, and Markdown drafts
- [x] Python MCP tools for local AI clients
- [x] CI test/build/deploy GitHub Pages workflow
- [x] Optional manual HF fiction-only Action
- [x] Shared versioned decision rules for browser and Python
- [x] Read-only public `code.json`, `agency-index.json`, and `publiccode.yml` adapters with provenance
- [x] OpenACR YAML import prototype, validated with the pinned upstream CLI
- [x] MCP stdio protocol smoke test against the v2 SDK
- [x] Playwright/axe/keyboard browser regression suite
- [x] DITAP workshop facilitator guide, worksheet, and pilot protocol (not yet learner-tested)

## Phase 1: complete educational pilot

- [ ] Involve acquisition professionals and disabled participants in co-design and usability tests.
- [x] Automated axe, keyboard, reflow, and forced-colors regression checks.
- [x] Manual accessibility test pack and learner pilot report templates prepared.
- [ ] Manual screen-reader, zoom, text-spacing, and cross-browser testing.
- [x] Make decision rules a single machine-readable source rather than duplicated JS/Python text.
- [x] 0.2.0 evidence model for questions, searches, evidence, findings, and decisions.
- [x] 0.1.0 migration that preserves project/candidates and does not invent research history.
- [x] Guided seven-stage research interface and evidence-linked report.
- [ ] Expanded fictional DITAP scenario and pilot acceptance materials.
- [ ] Add report source selection and retrieval-as-of metadata.
- [ ] Add more DITAP fixtures, including small-business and open-source reuse scenarios.
- [ ] Expose issue-friendly data import errors and controlled export filename.
- [x] Validate MCP protocol with a real client over stdio. The SDK is constrained to `mcp>=2.3,<3` and tested against 2.3.0; consider an exact pin after a release review.

## Phase 2: public-source discovery and ACR integration

- [x] Prototype read-only `code.json`, `agency-index.json`, and `publiccode.yml` adapters without inventing replacement standards.
- [x] Prepare an integration proposal for 1102tools with a minimal adapter boundary; no upstream connection or copied code.
- [ ] Build a read-only discovery adapter for ACR URLs, with source/version/time metadata.
- [x] Prototype machine-readable OpenACR import using GSA's upstream schema, pinned CLI validation, and optional catalog completeness checks.
- [ ] Support Word/PDF ACR only with documented parsing limitations and human confirmation.
- [ ] Support ART outputs and product-specific criteria mapping, subject to API compatibility.
- [ ] Preserve a clear separation between claims, third-party tests, and procurement judgments.

## Phase 3: acquisition evidence package

- [ ] Research report with source attachments, coverage notes, and reproducibility manifest.
- [ ] Compare total cost, reuse rights, sustainability, accessibility evidence, and digital-first fit without an automatic winner.
- [ ] Gather GSA Issue Detail Supplement data and remediation questions.
- [ ] Document possible exceptions and route to agency reviewers; never issue determinations.
- [ ] Add reviewed, optional language-model synthesis, with provenance and redaction gates.

## Phase 4: production decision

- [ ] Decide whether hosted MCP is justified by demonstrated use.
- [ ] Complete threat model, privacy assessment, operational ownership, rate limits, and accessibility verification.
- [ ] Explore upstream contributions with 1102tools, GSA, and CMS before creating competing services.
