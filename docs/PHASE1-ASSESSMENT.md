# Phase 1 assessment: zero-install procurement experience

**Date:** 2026-11-13
**Scope:** Phase 1 only, against the procurement-officer implementation prompt.
**Status:** Implemented and automated-tested; **not** user-tested or manually AT-tested.

## 1. What already existed and was reused

The Phase 2 work already provides the difficult parts of the research record. Phase 1 did not replace them.

| Capability | Reused component |
| --- | --- |
| Versioned research records | `schemas/research.schema.json`, `src/omr_mcp/rules.json` |
| Browser validation and report | `site/research.js`, `site/rules.js` |
| Python validation and report | `src/omr_mcp/engine.py` |
| Questions, searches, evidence, findings, decisions | Existing tables, forms, and `prepareResearch()` normalization |
| Government reuse, open source, commercial, new build | Existing candidate approach values |
| Accessibility requirements and ACR evidence | Existing accessibility and ACR forms |
| JSON/Markdown import/export | Existing download/import code, now with clearer save/open actions |
| Source directory | Existing `src/omr_mcp/sources.json` and source cards |
| DITAP exercise | Existing expanded fictional fixture and sample reports |
| Automated accessibility | Existing Playwright, axe, keyboard, reflow, forced-colors tests |
| Optional local MCP | Kept unchanged; moved out of the primary page |

## 2. Gaps found against the prompt

1. The first screen was a dense seven-stage workspace with a technical framing.
2. There was no single zero-install starting action; “Start blank” was a reset button, not a landing-page task.
3. The project form asked for a title and ICT category before the user could describe the problem, and did not ask for agency context or research mode.
4. MCP installation, local-LLM setup, and AI prompt guidance were interleaved with the research workflow.
5. Saving was buried at the report stage; file names were generic; resume guidance was thin.
6. Source cards linked out but did not help a user start a search record from a source without treating the link as a completed search.
7. There was no plain-language Phase 1 assessment, accessibility design plan, or procurement-officer usability plan.
8. Automated tests did not cover the landing page, save/resume, About-page separation, or source prefill.

## 3. What Phase 1 changed

### Landing page

- New heading: **Research a government purchase**.
- Plain description of identifying solutions, investigating the market, comparing evidence, and preparing a report.
- Three primary actions: **Start new research**, **Continue existing research**, **Try a fictional DITAP example**.
- **Save research file** is visible on the landing page, with a short explanation that a downloaded JSON file is the dependable resume path.
- No account, installation, API key, or AI subscription is required.

### Simplified start

The first research form now asks:

1. What problem are you trying to solve?
2. What type of product or service are you researching?
3. Which government or agency procurement context applies?
4. How would you like to work — guided, manual, or with an approved AI tool?

A research title, users, and constraints are optional under **More context**. The need and ICT fields are no longer required before saving. Unknown is explicitly allowed.

The report includes agency context and research approach only when recorded. Existing 0.2.0 records without those fields remain valid; `prepareResearch()` adds empty optional values so the form can display them.

### Progressive disclosure and separation

- The glossary and “more context” remain disclosures.
- MCP installation, local-LLM setup, and AI prompt guidance moved to `site/about.html`.
- The primary header now links **About** instead of exposing MCP/AI engineering topics as stages.
- The local MCP and AI sections remain available and tested on the About page. No MCP functionality was removed.

### Save, resume, and filenames

- **Save research file** downloads JSON named from the research title or need, plus the date, for example `modern-case-management-2026-11-13.json`.
- **Continue existing research** is a visible file control; the file input remains keyboard reachable with a visible focus ring on its label.
- Exported Markdown uses the same human-readable base name.
- Destructive replacement (start new, demo, import) still confirms when work is present.
- The page states that there is no automatic storage or upload and that a downloaded file is the reliable resume mechanism.

### Source launcher

Direct government links were added for SAM.gov, USAspending.gov, Acquisition.gov, eCFR, and Section508.gov; the 1102tools entries remain optional technical references.

Each source card now has **Use this source**. It:

- requires an existing research question;
- fills the search form as **not searched**;
- does not create a search or evidence record;
- moves focus to the source-name field and announces the distinction.

Direct source links remain links to the source, not claims of live API integration.

## 4. Backward compatibility

- Schema version remains **0.2.0**.
- `agency_context` and `research_mode` are optional additive project properties.
- Existing 0.2.0 records validate without them.
- 0.1.0 migration preserves the original project exactly; `prepareResearch()` adds empty optional values after migration.
- No migration invents a research approach or agency context.
- Existing example records were updated with fictional context only to demonstrate the fields.
- The 1102tools and OpenACR interfaces are unchanged.

## 5. Deliberately deferred

These are prompt phases 2–5 and are **not** claimed as delivered:

- generated Copilot prompts and one-click copy;
- richer source cards with authentication and recording guidance;
- findings dashboard redesign;
- DOCX/PDF export;
- configurable policy context and effective dates;
- browser-local persistence;
- hosted MCP or Copilot-agent integration;
- procurement-officer usability sessions;
- manual NVDA, JAWS, VoiceOver, text-spacing, forced-colors, and cross-browser audits.

## 6. Verification

Local results on this branch:

- Python: **51 passed**
- Node: **9 passed**
- Playwright: **32 passed**
- OpenACR CLI: **Valid!**
- Build: pass
- Ruff: pass

Browser coverage now includes the landing heading and start action, focus after start, optional procurement context and report output, human-readable JSON download, file chooser, source prefill without a recorded search, About-page MCP/AI sections, About-page axe scan, and existing workflow/accessibility tests.

Automated tests do not establish WCAG conformance or usability. See [the accessibility design plan](a11y-plans/2026-11-13-phase1-landing-a11y-plan.md) and [the procurement usability test plan](USABILITY-TEST-PLAN.md).

## 7. Primary files

- `site/index.html` — landing, simplified start, save/resume.
- `site/about.html` — moved technical and AI guidance.
- `site/app.js` — start/continue/save, filenames, source prefill.
- `site/research.js` — optional project fields.
- `src/omr_mcp/rules.json` — optional fields, modes, labels.
- `schemas/research.schema.json` — optional project properties.
- `src/omr_mcp/engine.py` — optional validation and report lines.
- `tests/browser/` — landing/save/about/source coverage.
