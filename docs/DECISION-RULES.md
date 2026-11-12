# Decision rules

`src/omr_mcp/rules.json` is the single versioned source for the values and
wording that both the Python engine and the browser use:

- approach, claim, and evaluation values;
- project and candidate field limits;
- the questions generated from missing fields, claims, and evaluation states;
- report headings, labels, missing-value text, status language, and the human
  review checklist.

The browser receives a copy at `_site/data/rules.json`, produced by
`scripts/build_site.py`. The Python engine reads the same file from the
installed package. There is no second hand-maintained copy of the question or
report text.

## Files

| File | Role |
| --- | --- |
| `src/omr_mcp/rules.json` | Canonical rules |
| `site/rules.js` | Loads rules in the browser and formats placeholders |
| `site/research.js` | Browser validation, questions, and Markdown report |
| `src/omr_mcp/engine.py` | Python validation, questions, and Markdown report |
| `schemas/research.schema.json` | Portable JSON record contract |

## Changing a rule

1. Change `rules.json` and explain the procurement or accessibility reason.
2. If a field, limit, enum, or schema version changes, update
   `schemas/research.schema.json` and the version in both places.
3. Update tests that describe the behavior, not only the string.
4. Run:

   ```bash
   python -m pytest -q
   node --test tests/research.test.mjs
   python scripts/build_site.py
   npm run test:browser
   ```

5. Keep old exported JSON records readable. A breaking record change needs a
   new `schema_version`, a migration note, and explicit review.

## Boundaries

- The rules are not a legal or Section 508 applicability engine.
- A missing claim is not a failed claim.
- The report text is a draft-review scaffold, not an approval.
- `rules.version` tracks the rules content; `schema_version` tracks the
  imported/exported research record.
