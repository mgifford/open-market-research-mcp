# Migrating 0.1.0 research records

Schema 0.1.0 records remain importable. Import runs through
`prepare_research()` in Python and `prepareResearch()` in the browser, which:

1. validates the legacy record;
2. migrates it to 0.2.0;
3. rebuilds question links;
4. validates the migrated record;
5. returns the record that replaces the current session, only after the
   existing replacement confirmation.

The archived schema is `schemas/research-0.1.0.schema.json`.

## What is preserved

- project name, need, users, constraints, and ICT type;
- candidate identifiers, names, approaches, versions, scope, URLs, ACR URLs and
  dates, claims, evaluation status, and notes;
- the fictional-demonstration marker.

## What is added

- empty `research_questions`, `searches`, `evidence`, `findings`, and
  `decisions` collections;
- an accessibility-requirements record marked not identified;
- a candidate `acr` object with `found` derived from the legacy ACR URL and
  product version/functions/date copied from existing candidate fields.

## What is not invented

No search activity, search date, evidence record, evidence retrieval date,
finding, reviewer, or verification result is created. The migration object
lists the fields that cannot be recovered:

```json
{
  "migration": {
    "from_schema_version": "0.1.0",
    "migrated_at": "2026-11-12T00:00:00+00:00",
    "unavailable_fields": [
      "research_questions", "searches", "evidence", "findings", "decisions",
      "accessibility_requirements", "candidate.acr.evaluation_methods",
      "candidate.acr.catalog_id", "candidate.acr.completeness"
    ],
    "notes": "Legacy records contained project scope and candidate notes only. No search, evidence, or verification history was invented."
  }
}
```

## Reports

Migrated reports state the source schema and the unavailable fields. Empty
search and evidence sections are shown as empty, not as a completed search.
The reference-source section remains separate and is not evidence that a
source was investigated.

## Tests

- `tests/test_migration.py` covers preservation, missing-history behavior,
  broken references, search-status distinctions, missing dates/reviewers,
  finding support, resolved decisions, ACR consistency, and duplicate IDs.
- `tests/research.test.mjs` covers the browser migration path and report.
- `schemas/research-0.1.0.schema.json` is validated against the legacy fixture.

## Limits

The migration cannot reconstruct research that was never recorded. An officer
who used 0.1.0 must add questions, searches, evidence, findings, and decisions
in the 0.2.0 workflow. The migration does not upgrade an ACR claim into
independent evidence and does not infer Section 508 status.
