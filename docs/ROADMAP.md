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

## Phase 1: complete educational pilot

- [ ] Involve acquisition professionals and disabled participants in co-design and usability tests.
- [ ] Test with axe, keyboard, screen readers, reflow, zoom, forced colors, and reduced motion.
- [ ] Make decision rules a single machine-readable source rather than duplicated JS/Python text.
- [ ] Add report source selection and retrieval-as-of metadata.
- [ ] Add more DITAP fixtures, including small-business and open-source reuse scenarios.
- [ ] Expose issue-friendly data import errors and controlled export filename.
- [ ] Validate MCP protocol with a real client and pin the SDK after running CI.

## Phase 2: public-source discovery and ACR integration

- [ ] Integrate upstream `code.json` inventories and `publiccode.yml` metadata without inventing replacement standards.
- [ ] Connect 1102tools as an optional upstream MCP through a host adapter, not by copying servers.
- [ ] Build a read-only discovery adapter for ACR URLs, with source/version/time metadata.
- [ ] Parse machine-readable OpenACR using GSA's upstream schema and toolchain.
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
