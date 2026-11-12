# Testing and verification

## Automated

```bash
python -m pip install -e '.[dev]'
python -m pytest -q
node --test tests/research.test.mjs
python scripts/build_site.py
python -m http.server 8000 --directory _site
```

CI runs Python and JavaScript tests before deploying a site. These cover deterministic data structures, non-approval language, safe URLs, and the fictional fixture. They are not exhaustive security, accessibility, or integration tests.

## Manual interface checks, required before public promotion

- At 320 CSS px and 400% zoom, all fields and controls remain usable without horizontal page scrolling (wide tables may scroll inside their own region).
- Use keyboard only through main navigation, both forms, filters, file import, table removal, export, and report preview.
- Test with NVDA + Firefox or VoiceOver + Safari (at minimum) and verify field names, errors, status updates, and table relationships.
- Test forced colors, reduced motion, text spacing, browser light/dark preference, and 200% zoom.
- Load and export the fictional case; confirm every result is clearly labelled fictional and unverified.
- Import an invalid JSON document and an unsafe URL; confirm understandable errors without changing existing research.
- Confirm that browser requests go only to files within the static Pages site. No hidden provider calls or telemetry.
- Confirm public Pages artifacts do not include `.env`, secrets, example sensitive records, or source server configuration.
- Validate accessibility with axe-core and independent manual review; no WCAG conformance claim is made yet.

## Source adapter release gates

An adapter must document authority, rate limits, data freshness, source links, licensing, privacy, error cases, exclusions, and tests against fixtures. Missing answers must be marked missing, not guessed. Production sources should never be searched on every keystroke without limits.
