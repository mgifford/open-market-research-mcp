# Phase 2 assessment: source guidance and approved-AI prompts

**Date:** 2026-11-13
**Scope:** Phase 2 only.
**Status:** Implemented and automated-tested; not tested with procurement officers or a live approved AI deployment.

## What was reused

- The existing source directory and source cards.
- The 0.2.0 research record and shared validation rules.
- The browser report generator.
- The existing static AI guardrails on the About page.
- The existing local MCP and 1102tools work, unchanged.

## Source launcher

Every source in `src/omr_mcp/sources.json` now carries:

- `use_when` — when the source is useful.
- `questions` — questions it can help answer.
- `authentication` — whether public access or an approved account/host may be needed.
- `record_how` — what provenance and limitations to record.
- `search_strategy` — a neutral, source-specific search approach, not a fabricated deep link.

The source cards show this in a disclosure, retain the direct link, and provide **Use this source**. That action pre-fills the search form with the source and URL, sets the status to **not searched**, and does not create a search record. Proposed research remains distinct from a completed search.

Direct government links are used for SAM.gov, USAspending.gov, Acquisition.gov, eCFR, and Section508.gov. 1102tools entries remain optional technical references and say so.

## Approved-AI prompt generation

The primary workspace now has **Use an approved AI assistant** with three actions:

1. **Plan my research** — asks for strategies, source types, neutral queries, evidence requirements, and what remains unverified.
2. **Review my evidence** — asks for unsupported statements, contradictions, missing dates/references, stale sources, incomplete verification, and findings that should be questions.
3. **Draft my report** — asks for a neutral draft from recorded material only.

Each action:

- builds the prompt from the current project, questions, searches, evidence, findings, and decisions;
- shows a preview;
- enables **Copy prompt** only after generation;
- explains that an approved tool must be used separately;
- warns about CUI, PII, vendor-proprietary, and procurement-sensitive material.

The page does not call a model or network service. There is no API key or connector assumption. The generated prompt labels proposed searches as **PROPOSED**, not completed.

## AI-use disclosure

An optional `ai_assistance` object is added to the research record:

```json
{
  "used": true,
  "tool": "Approved agency assistant",
  "actions": ["plan", "review"],
  "notes": "A person checked the cited sources and removed unsupported suggestions."
}
```

- Existing records without this field remain valid.
- `prepareResearch()` / `prepare_research()` add a default false object.
- The report includes the disclosure only when `used` is true.
- Actions are limited to `plan`, `review`, and `draft`.
- The report states that AI output is assistance, not evidence.

## Safeguards in generated prompts

- Use only the provided research record.
- Do not invent sources, citations, dates, supplier capabilities, accessibility results, or determinations.
- Require source URLs/dates where findings depend on external records.
- Identify uncertainty.
- Do not rank suppliers, select a winner, declare Section 508 conformance, or approve an exception.
- Do not treat a source link or proposed search as a completed search.
- Require human verification.

## Verification

- Python: **52 passed**
- Node: **10 passed**
- Playwright: **33 passed**
- OpenACR CLI: **Valid!**
- Build and Ruff: clean

Browser coverage includes source guidance, source prefill, all three prompt actions, copy behavior, AI-use disclosure in the report, and no search record created by prompt generation.

## Deferred

- findings dashboard redesign;
- DOCX/PDF export;
- configurable policy context and effective dates;
- browser-local persistence;
- hosted MCP/Copilot integrations;
- manual accessibility testing;
- procurement-officer validation of prompt usefulness;
- testing prompts inside a specific Microsoft 365 Copilot or other approved deployment.

Do not claim a live Copilot integration or validated prompt quality.
