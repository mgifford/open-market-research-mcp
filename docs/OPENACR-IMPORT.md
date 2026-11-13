# OpenACR import prototype

This is a **read-only importer**, not an ACR generator, conformance
assessment, certifier, or publication path. It reads a supplier- or
author-supplied OpenACR YAML file so a learner can inspect product, scope,
date, methods, author, component claims, completeness, and missing evidence.

## What it preserves

- product name, version, and description;
- report date, last-modified date, and catalog identifier;
- author and vendor contact fields present in the document;
- evaluation methods, notes, legal disclaimer, and license;
- each chapter (`notes` and `disabled`), criterion (`num`), component name,
  adherence level, and remarks.

## Claim states

The importer distinguishes:

| State | Meaning |
| --- | --- |
| `supports` | The ACR reports support |
| `partially-supports` | The ACR reports partial support |
| `does-not-support` | The ACR reports non-support |
| `not-applicable` | The ACR reports the criterion is not relevant |
| `not-evaluated` | The ACR reports no evaluation |
| `missing` | No adherence claim is present |

`missing` and `not-evaluated` are **not** failures.

## Schema and catalog checks

Every imported document is checked against the pinned upstream JSON schema in
`src/omr_mcp/schemas/openacr-0.1.0.json`. The file notice records the upstream
commit, package version, and licensing boundary.

Completeness is separate from schema validity. If a catalog YAML is supplied,
the importer compares its criteria list with the reported criteria and returns:

```json
{
  "catalog_supplied": true,
  "criteria_expected": 6,
  "criteria_reported": 5,
  "missing_criteria": [{"chapter": "success_criteria_level_a", "id": "2.1.1"}],
  "unexpected_criteria": [],
  "complete": false
}
```

A missing catalog criterion is a documentation gap, not a failure finding. If
no catalog is supplied, `complete` is `null` and the limitation is explicit;
the importer does not pretend to know which criteria are absent.

The fixture `examples/openacr.sample.yaml` is validated in CI with the pinned
upstream CLI:

```bash
npm run test:openacr
```

That script invokes `@openacr/openacr@0.3.8` against the
`2.4-edition-wcag-2.1-508-en` catalog. Python tests also compare the fixture
with the packaged upstream catalog when npm dependencies are installed.

## Local use

```bash
python scripts/import_openacr.py \
  --file examples/openacr.sample.yaml \
  --catalog examples/openacr.catalog.sample.yaml
```

The MCP server exposes the same operation as `import_openacr_report`, with an
optional `catalog_yaml` argument. Input is limited to 2 MB and is parsed with
`yaml.safe_load`. Neither path fetches a URL or publishes a document.

## Human review

An imported ACR is a claim, not an independent finding. Do not treat it as a
Section 508 conformance determination, an exception approval, or a supplier
ranking. Review scope, version, date, evaluator identity, sample, methods, and
any missing or not-evaluated criteria with an accessibility specialist.

The browser does not parse OpenACR YAML. Use the CLI or the local MCP tool;
browser support would require a separately reviewed YAML parser, schema
validator, and file-size controls.
