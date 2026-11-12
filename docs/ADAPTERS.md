# Read-only public metadata adapters

The adapters normalize established public metadata into a small, inspectable
record. They do **not** create a new metadata standard, rank suppliers, verify
licenses, or decide whether software is suitable.

## Supported inputs

| Adapter | Input | Notes |
| --- | --- | --- |
| `codejson` | A public `code.json` object plus `owner/repository` | Reads permissions, usage, license names, visibility, status, version, and metadata date |
| `agency-index` | A public `agency-index.json` object | Reads the agency, measurement method, and each release; each release needs a GitHub `repositoryURL` |
| `publiccode` | A `publiccode.yml` mapping | Reads localized description, URL, version, release date, license, maintenance type, and organisation |

Fixtures are in `examples/adapters/` and are fictional. They are not agency
records or recommendations.

## Provenance envelope

Every normalized record includes:

- `adapter_id`
- `authority` (`official`, `public-repository`, `vendor`, or `community`)
- `source_url`
- `retrieved_at`
- `source_as_of`
- `evidence_type`
- `license`
- `access_rights`
- `limitations`

These fields are an internal provenance envelope, not a competing public
metadata schema. Format-specific fields stay alongside them so users can
inspect the original claims.

## CLI

```bash
python scripts/import_public_metadata.py \
  --format codejson \
  --file examples/adapters/codejson.sample.json \
  --repository example-org/example-benefits

python scripts/import_public_metadata.py \
  --format agency-index \
  --file examples/adapters/agency-index.sample.json \
  --source-url https://example.gov/agency-index.json

python scripts/import_public_metadata.py \
  --format publiccode \
  --file examples/adapters/publiccode.sample.yml
```

The CLI reads local files only. The optional fetch helper in
`src/omr_mcp/adapters/fetch.py` accepts HTTPS URLs on
`raw.githubusercontent.com` or `raw.github.com` only, rejects credentials,
rejects redirects outside that allowlist, enforces a size limit, and is used
by the scheduled code.json refresh.

## MCP

`normalize_public_metadata` accepts local text and a format. It makes no
network request. A separate MCP host may use 1102tools or another approved
source; this project does not copy or auto-call those servers.

## Limits

- Metadata is self-reported and may be stale or incomplete.
- A public repository or declared license does not establish reuse rights,
  security, maintenance, or fitness for a procurement need.
- The adapters do not parse private repositories, authenticated records, or
  agency-internal inventories.
- The browser does not fetch these formats; the site continues to use the
  reviewed static snapshot.
