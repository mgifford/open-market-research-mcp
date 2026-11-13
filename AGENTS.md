# Instructions for AI coding agents

## Mission

Build a small, inclusive, vendor-neutral market research companion useful in DITAP and similar public procurement training. It must be an evidence and workflow tool, not an autonomous procurement decision maker.

## Non-negotiable rules

1. Never claim this project is affiliated with USDS, DITAP, GSA, CMS, 1102tools, or another source unless explicitly authorized.
2. Do not generate supplier rankings, awards, Section 508 conformance declarations, legal conclusions, or exception approvals.
3. Do not treat missing evidence, an unevaluated ACR criterion, or a missing ACR as proven nonconformance.
4. Distinguish vendor-reported ACR claims from independent evaluation findings, and preserve scope, version, and date.
5. Preserve source URL, retrieval date, data-as-of date, and any limitations for future API integration. Never invent citations.
6. Reuse ART, OpenACR, CMS code.json, publiccode.yml, and existing 1102tools MCPs. Do not invent a new competing metadata standard.
7. Keep the browser functional without AI, secrets, subscriptions, or server infrastructure. Preserve relative links for arbitrary GitHub Pages repository names.
8. Never embed third-party tokens in JavaScript, build outputs, or public GitHub Pages. Never send live acquisition records to outside AI services by default.
9. Do not add nonessential dependencies or duplicate generated content by hand. `src/omr_mcp/sources.json` is the source directory. `scripts/build_site.py` copies it to Pages.
10. Follow accessible design and test with keyboard, screen reader, zoom, reflow, forced colors, and reduced motion. Accessibility claims must be demonstrated, not assumed.
11. Avoid publishing government-only source code or information from protected systems. Model permissions and exemptions explicitly.
12. Require human review of AI outputs and of each externally reported accessibility result.
13. Every finding must link to supporting evidence. A finding without evidence is an unresolved question or assumption, not a finding.
14. Keep search states distinct: not searched, completed with results, completed without matching records, partial, and failed. A reference link is not a completed search.
15. Preserve 0.1.0 imports through the documented migration. Do not invent search dates, evidence, reviewers, or verification results.
16. Update `schemas/research.schema.json`, `src/omr_mcp/rules.json`, both validators, fixtures, tests, and migration documentation together.

## Repository map

- `site/`: static HTML/CSS/JS, no build framework.
- `site/research.js`: browser research and report logic.
- `src/omr_mcp/engine.py`: deterministic Python research and report logic.
- `src/omr_mcp/server.py`: real local MCP v2 server.
- `src/omr_mcp/sources.json`: canonical source directory.
- `src/omr_mcp/rules.json`: shared decision rules copied to the Pages build.
- `schemas/research.schema.json`: 0.2.0 data exchange contract.
- `schemas/research-0.1.0.schema.json`: archived legacy contract for migration tests.
- `docs/SCHEMA.md`, `docs/MIGRATION.md`: model and migration documentation.
- `examples/`: fictional test data. Never label it as a real market scan.
- `scripts/build_site.py`: copies static site and canonical fixtures to `_site/`.
- `.github/workflows/pages.yml`: CI and Pages deployment.
- `.github/workflows/hf-demo.yml`: optional manual-only AI experiment.

## Standard workflow

1. Confirm a change serves a clearly named procurement user need.
2. Add or amend an acceptance test before changing logic.
3. Make the smallest reversible change with clear provenance.
4. Run `python -m pytest -q`, `node --test tests/research.test.mjs`, and `python scripts/build_site.py`.
5. Validate the site visually, with keyboard only, and at 400% zoom before claiming production accessibility.
6. Summarize what changed, what was omitted, assumptions, risks, and tests run.

## Contribution boundaries

- Add source adapters through documented interfaces and explicit user consent.
- Keep verified official sources separate from commercial and crowd-sourced descriptions.
- Do not move new regulatory wording into production without human confirmation.
- Prefer a small optional 1102tools integration, not copied implementations or unapproved fork maintenance.
- Make all research exports portable, inspectable, and usable without the original AI host.
