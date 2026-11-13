# Integration proposal: 1102tools federal contracting MCPs

**Status:** proposal plus a fixture-based USAspending mapping demonstration.
No live 1102tools connection, upstream endorsement, copied code, or upstream
issue/branch/pull request. Any external action needs explicit human approval.

## Why integrate

The local Open Market Research MCP is deliberately deterministic and small.
It does not search SAM.gov, USAspending, GSA CALC+, BLS, Acquisition.gov, or
the eCFR. The existing 1102tools MCP servers already expose those public
sources. A host that connects both servers can let a researcher retrieve a
record from 1102tools and then record its provenance, limitations, and
accessibility evidence in this tool.

The goal is interoperability, not a competing catalog and not a fork.

## Recommended boundary

```text
MCP host (user-approved AI client or local client)
  |-- Open Market Research MCP (this project, local stdio)
  |     deterministic questions, rules, validation, report draft
  |-- 1102tools MCP servers (separate, upstream)
        SAM.gov, USAspending, CALC+, BLS, Acquisition.gov, eCFR
```

- Keep both servers separate.
- Do not copy 1102tools implementations into this repository.
- Do not make this repository's MCP server depend on a network call to
  1102tools at startup or during every keystroke.
- Let the user choose which server to call and which records to bring back.
- Preserve the upstream record URL, retrieval time, data-as-of date, and
  limitations in the research record.

## Minimal adapter boundary

A future optional adapter should be a thin translation layer with this shape:

```json
{
  "adapter_id": "1102tools.sam-gov",
  "authority": "official",
  "source_url": "https://sam.gov/...",
  "retrieved_at": "2026-11-12T00:00:00Z",
  "source_as_of": "2026-11-01",
  "evidence_type": "government-record",
  "license": null,
  "access_rights": "public",
  "limitations": ["Registration is not proof of delivery capability."],
  "record": {}
}
```

The envelope is the same thin provenance shape used by the public metadata
adapters. It is not a replacement for SAM.gov, USAspending, code.json,
publiccode.yml, or OpenACR.

### Candidate tool sequence

1. The host asks the user whether to query the external 1102tools server.
2. The host calls the relevant upstream tool with a narrow query.
3. The host maps only the fields needed for research:
   title, identifier, agency, dates, source URL, record type, and stated
   limitations.
4. The user reviews the mapped record before adding it to a candidate.
5. The report draft cites the source and keeps the unverified/limitation
   language.

Do not automatically merge a search result into a report. Do not rank results.
Do not infer a supplier's accessibility, suitability, or responsibility from
an award record.

## Implemented fixture demonstration

The demonstrator is deliberately offline and narrow:

- `src/omr_mcp/integrations/usaspending.py` maps **one selected** USAspending
  record into a 0.2.0 search/evidence draft.
- `examples/integrations/usaspending-award.sample.json` is a fictional record
  using the field names a host would pass through.
- `examples/integrations/usaspending-award.mapped.json` is the reviewable draft.
- `examples/ditap-case-management-with-1102tools.json` and its
  [report](../examples/ditap-case-management-with-1102tools-report.md) show the
  record applied only after approval.
- The MCP tool `map_1102tools_usaspending_record` returns the draft. It makes no
  network request and does not apply the record.

```bash
python scripts/map_1102tools_record.py \
  --file examples/integrations/usaspending-award.sample.json \
  --question-id rq-commercial \
  --retrieved-at 2026-11-12T10:00 \
  --source-url https://example.gov/usaspending/FICTIONAL-AWARD-001 \
  --out /tmp/mapped.json

python scripts/apply_1102tools_record.py \
  --research examples/ditap-case-management.json \
  --mapped /tmp/mapped.json \
  --out /tmp/research-with-award.json \
  --approve
```

`--approve` is required; without it, the application function raises. The
mapped draft preserves the award identifier, recipient, amount, agency, dates,
description, source URL, retrieval time, source-as-of date, and limitations.
It creates a completed search and an `official-record` evidence record, not a
finding or a candidate ranking.

### Field mapping

| Upstream field | Mapped field |
| --- | --- |
| `Award ID` / `generated_internal_id` | Evidence `source_identifier` and stable IDs |
| `Recipient Name` | Neutral claim text and source record |
| `Award Amount` | Neutral claim text and source record |
| `Awarding Agency` | Neutral claim text and source record |
| `Last Modified Date` / `End Date` | `source_as_of` |
| Host-provided retrieval time | `retrieved_at` and `searched_at` |
| Host-provided award URL | Search/evidence `source_url` |
| Selected record | `source_record` in the draft |

The demo does not establish live compatibility with a specific 1102tools
version. The host must verify the actual upstream output against this fixture
contract before claiming a live integration.

## Mapping examples

| 1102tools source | Useful research question | Provenance limitation |
| --- | --- | --- |
| SAM.gov | Is there a comparable notice, registered entity, or exclusion? | Registration is not capability or past performance |
| USAspending | What comparable awards exist, and what was their scope? | Past awards do not prove current fitness |
| GSA CALC+ | What ceiling labor rates apply? | Ceiling rates are not actual paid rates |
| BLS OEWS | What occupational wage benchmark applies? | Wages are not vendor billing rates |
| Acquisition.gov | What current rule or deviation is relevant? | Model text does not decide applicability |
| eCFR | What does the operative regulation say as of a date? | A summary is not a legal determination |

## Security and privacy

- Do not put provider tokens or 1102tools credentials in the Pages app or in
  this repository.
- Do not send protected acquisition records to an external AI service without
  agency authorization, redaction, and a documented retention decision.
- Keep the MCP host's authorization, logging, and retention policies separate.
- Treat retrieved records as untrusted input; render them as text, not HTML.
- Do not enable a live hosted endpoint merely because the local integration
  works.

## Compatibility and testing

- Pin and test the upstream MCP versions in a real client, not only in unit
  tests.
- Add fixture-based mapping tests; do not fake a live network test.
- Record failures as "source unavailable" rather than silently returning an
  empty result.
- Keep the Open Market Research record import/export schema stable.
- Re-run the accessibility and browser regression suite when the UI changes.

## Open questions for upstream discussion

- Which 1102tools tools have stable machine-readable outputs suitable for
  mapping?
- What are the documented rate limits, freshness, and usage terms?
- Does 1102tools want an adapter maintained upstream, or a documented
  consumer contract?
- How should an upstream record identify its own provenance and data-as-of
  date?
- What is the review and security process for an optional integration?

Do not open an upstream issue or submit a patch until the maintainers and this
project's human reviewers approve that specific action.
