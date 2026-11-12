# Testing and verification

## Automated

```bash
python -m pip install -e '.[dev]'
python -m pytest -q
node --test tests/research.test.mjs
python scripts/build_site.py
npm ci
npx playwright install chromium
npm test
```

`npm test` runs the Node unit tests, the pinned upstream OpenACR CLI
validation, and the Playwright/axe browser suite. CI also runs the MCP stdio
protocol tests through `pytest`.

### Coverage added in the pilot-hardening pass

- Python: shared decision rules, 0.2.0 schema and migration, reference
  validation, search-status distinctions, provenance dates/reviewers, report
  language, adapters, OpenACR parser, and MCP stdio protocol.
- Node: rules-driven validation, required fields and limits, questions, report
  content, safe URLs.
- Browser: axe scans in default and loaded states; 320 CSS px reflow; table
  region keyboard scroll; focus-indicator contrast; visible file-input focus;
  forced-colors focus; unsaved-field retention; demo/import confirmation;
  import without a runtime error; focus after row removal; unique accessible
  names; URL error association; no cross-origin requests; debounced source
  result announcements; the full question-search-evidence-finding-decision
  workflow; edit/remove focus; legacy import migration; and accessibility
  requirement entry.
- OpenACR: every import validated against the pinned upstream JSON schema;
  optional catalog comparison for missing/unexpected criteria; fixture
  validated by `@openacr/openacr@0.3.8` against the
  `2.4-edition-wcag-2.1-508-en` catalog; comparison against the packaged
  upstream catalog when installed.

### Baseline and current evidence (2026-11-12)

Before the hardening changes, the local browser audit found:

- a `TypeError` after every import and an uncleared file input;
- unsaved project fields erased when an option was added;
- no confirmation before replacing work with the demo;
- focus lost to `<body>` after keyboard row removal;
- a focus ring at 1.54–1.64:1 on light surfaces;
- a 1×1 clipped file input with no visible focus;
- repeated “Record as research option” button names.

The regression suite covers each of those behaviors. The current local run
(2026-11-12) is green: **44 Python tests**, **8 Node unit tests**, **24
Playwright browser tests**, the upstream OpenACR fixture validation, the
build, and Ruff. axe reports no automated WCAG A/AA violations in the tested
states, but axe covers only a subset of WCAG and is not a conformance result.

## Manual and assistive-technology status

Use the [manual accessibility test pack](accessibility/MANUAL-TEST-PACK.md) and
copy [RESULTS-TEMPLATE.md](accessibility/RESULTS-TEMPLATE.md) for a real audit.
The status table below describes what has actually been run, not what the pack
makes possible.

| Check | Status |
| --- | --- |
| Keyboard-only navigation, forms, import, row removal | Automated Playwright tests plus manual spot checks |
| 320 CSS px / 400% zoom equivalent reflow | Automated page-level check; table scrolls in its own keyboard-operable region |
| Forced colors | Chromium emulation checks focus outline; native Windows High Contrast not run |
| Reduced motion / prefers-contrast | CSS present; not independently verified |
| Screen reader NVDA + Firefox | **Not performed in this environment** |
| Screen reader VoiceOver + Safari | **Not performed in this environment** |
| JAWS / mobile screen readers | **Not performed** |
| Real learner workshop | **Not performed**; see `docs/workshop/PILOT-PROTOCOL.md` |
| Browser matrix beyond Chromium | **Not performed** |

No WCAG conformance claim is made. Manual screen-reader, zoom, text-spacing,
and cross-browser testing are required before a public accessibility claim.

## Manual checklist before promotion

- At 320 CSS px and 400% zoom, all fields and controls remain usable without
  horizontal page scrolling; the wide table may scroll inside its labelled
  region.
- Use keyboard only through main navigation, both forms, filters, file import,
  table removal, export, and report preview.
- Test with NVDA + Firefox and VoiceOver + Safari at minimum; verify field
  names, errors, status updates, table relationships, and focus order.
- Test forced colors with a native OS setting, reduced motion, text spacing,
  browser light/dark preference, and 200% zoom.
- Load and export the fictional case; confirm every result is clearly labelled
  fictional and unverified.
- Import an invalid JSON document and an unsafe URL; confirm understandable
  errors without changing existing research.
- Confirm browser requests go only to files within the static Pages site.
- Confirm public Pages artifacts do not include `.env`, secrets, example
  sensitive records, or source server configuration.
- Re-import an OpenACR fixture through the CLI and MCP tool; confirm missing
  and not-evaluated claims remain distinct and no conformance language appears.

## Source adapter release gates

An adapter must document authority, rate limits, data freshness, source links,
licensing, privacy, error cases, exclusions, and tests against fixtures.
Missing answers must be marked missing, not guessed. Production sources should
never be searched on every keystroke without limits. See
[ADAPTERS.md](ADAPTERS.md).
