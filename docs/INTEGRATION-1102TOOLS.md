# Integration proposal: 1102tools federal contracting MCPs

**Status:** proposal for review. No upstream endorsement, no copied code, and
no upstream issue, branch, or pull request has been opened. Any external
action needs explicit human approval.

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
