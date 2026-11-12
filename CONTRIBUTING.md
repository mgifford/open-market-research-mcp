# Contributing

Issues, tests, documentation corrections, source adapters, accessibility feedback, and DITAP lesson feedback are welcome.

## Expectations

- Discuss major schema changes before implementing them.
- Use respectful, source-based critiques. No supplier endorsements or unsupported conformance claims.
- Keep source collection read-only unless an explicit contribution is requested.
- Document a source's authority, last review, coverage, license, and limitations.
- Include keyboard and screen reader impact in interface changes.
- Demonstrate how new fields export in JSON and Markdown.
- Run the test commands in README.md. Add regression tests for errors.
- Put behavior and wording in `src/omr_mcp/rules.json`, not in a second JS or Python copy. Update the schema and both test suites when a rule changes.
- Adapters must preserve authority, source URL, retrieval time, data-as-of date, license, access rights, and limitations. Do not fetch private repositories or invent a replacement metadata standard.
- OpenACR import is read-only. Do not use this project to generate, sign, or publish a final ACR, and do not turn a missing or not-evaluated claim into a failure.
- When the pinned OpenACR schema or catalog behavior changes, update the schema notice, the fixture, and the completeness tests together. Do not copy upstream catalogs into this repository.
- Browser tests use dev-only Playwright and OpenACR CLI dependencies. Keep the static site free of runtime npm dependencies.
- Accessibility claims need matching evidence. Automated axe results are not conformance; screen-reader and manual tests must be recorded separately.
- Never commit secrets, proprietary ACRs, procurement-sensitive files, or personally identifiable data.

This project is experimental and independent. Proposed integrations with external projects should be discussed upstream before copying code or claiming endorsement. Do not open an upstream issue, branch, or pull request without explicit human approval.
