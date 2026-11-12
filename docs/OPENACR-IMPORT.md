# OpenACR import prototype

This is a **read-only importer**, not an ACR generator, validator, certifier,
or publication path. It reads a supplier- or author-supplied OpenACR YAML file
so a learner can inspect product, scope, date, methods, author, component
claims, and missing evidence.

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

`missing` and `not-evaluated` are **not** failures. Criteria omitted from the
document cannot be inferred without the upstream catalog, so the importer
states that limitation rather than inventing a result.

## Upstream validation

The fixture `examples/openacr.sample.yaml` is validated in CI with the pinned
upstream CLI:

```bash
npm run test:openacr
```

That script invokes `@openacr/openacr@0.3.8` against the
`2.4-edition-wcag-2.1-508-en` catalog. The Python tests also validate the
fixture against the schema shipped in that package when it is installed.

## Local use

```bash
python scripts/import_openacr.py --file examples/openacr.sample.yaml
```

The MCP server exposes the same operation as `import_openacr_report`. Input is
limited to 2 MB and is parsed with `yaml.safe_load`. The tool never fetches a
URL and never publishes a document.

## Human review

An imported ACR is a claim, not an independent finding. Do not treat it as a
Section 508 conformance determination, an exception approval, or a supplier
ranking. Review scope, version, date, evaluator identity, sample, methods, and
any missing or not-evaluated criteria with an accessibility specialist.

The browser does not parse OpenACR YAML yet. Use the CLI or the local MCP tool;
browser support would require a separately reviewed YAML parser and file-size
controls.
