# Accessibility evidence

This directory holds the **manual** evidence pack for the static research app.
Automated checks live in `tests/browser/` and run in CI; they are not a
conformance result.

**Status (2026-11-12):** the pack is ready; **no manual screen-reader,
cross-browser, or native forced-colors audit has been completed**. Do not
describe the app as WCAG conformant, Section 508 conformant, or independently
accessibility-tested until results are recorded here.

## Files

- [Manual test pack](MANUAL-TEST-PACK.md) — environments, tasks, methods, and
  evidence rules.
- [Results template](RESULTS-TEMPLATE.md) — copy this for a real audit.
- [Issue template](ISSUE-TEMPLATE.md) — one record per confirmed barrier.

## Claim boundary

- A clean axe run means no detection in the tested state, not conformance.
- A single pass is not enough to close a finding; reproduce it or record it as
  inconclusive.
- Findings and fixes need matching evidence: keyboard evidence for keyboard
  behavior, screen-reader output for announcements, visual evidence for
  layout/contrast.
- Do not enter real acquisition, vendor, or personal data into the test app.
