# Follow-up implementation prompt for another coding agent

You are continuing the `open-market-research-mcp` repository, a GitHub Pages + local MCP educational market research companion for DITAP. Review `README.md`, `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/DITAP.md`, `docs/ROADMAP.md`, and all tests before editing code. Do not discard existing working content.

## Goal

Complete a reliable, accessible first DITAP pilot and then extend it to public-source evidence discovery without duplicating 1102tools, GSA ART, OpenACR, CMS gov-codejson, or publiccode.yml.

## Required work, in order

1. Run baseline tests and document outcomes. Inspect UI at mobile size, 200%/400% zoom, keyboard only, forced colors, and screen readers. Fix barriers and add regression checks.
2. Resolve any MCP Python SDK compatibility issues against the currently released v2 SDK. Verify tools and resources in a real MCP client and add a protocol-level CI smoke test. Do not fake a passing network test.
3. Bring browser and Python report logic under one versioned, machine-readable decision-rules data source, retaining explanatory tests. Keep the current JSON record import/export compatible.
4. Design and implement a read-only public code.json / agency-index.json / publiccode.yml adapter with sample public fixtures. Preserve authority, URL, as-of date, retrieval timestamp, license, access rights, and limitations. Never fetch private repos or assume code is publicly reusable.
5. Prototype an OpenACR YAML import using the upstream schema and existing GSA tools, not a homegrown alternative. Distinguish supported, partially supported, non-supported, not applicable, not evaluated, and missing claims. Preserve evaluation scope, product/version, date, methods, and author.
6. Test a DITAP Module 2 Sprint 4 workshop with fictional case management alternatives, short worksheets, and instructor assessment. Use feedback to simplify the flow and report.
7. Prepare an integration proposal for 1102tools with a minimal adapter boundary. No copying of its existing MCP implementations and no assumption of upstream adoption.

## Constraints

- GitHub Pages remains useful without backend or AI and with arbitrary repository names.
- A live MCP endpoint cannot run on Pages. Keep local stdio MCP functional; add hosted server only if justified and separately secured.
- No procurement decisions, Section 508 conformance conclusions, legal applicability judgments, or exception approvals by AI.
- Never expose keys or send user data to external AI without informed opt-in and agency approval.
- No silent ACR scraping, hidden incomplete-source search, or invented citations.
- Follow Google-style clarity, DRY, small functions, accessible UI, and source-first test-driven development.
- Do not add new standards; normalize into existing schemas with a thin provenance envelope.

## Definition of done

A new learner can load the fictional DITAP case, record multiple solution approaches, see why ACR evidence matters, inspect source provenance, and export an accurate, clearly unapproved report. CI tests pass, Pages deploys with no special secrets, local MCP tools work in a real client, and documentation describes all remaining limitations. Stop after one reviewable PR with a clear summary of changes, omissions, and test evidence.
