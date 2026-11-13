# Research record schema 0.2.0

`schemas/research.schema.json` defines the evidence-backed research record. The
browser and Python engine share the validation values and report wording in
`src/omr_mcp/rules.json`.

## Top-level entities

| Field | Purpose |
| --- | --- |
| `project` | Acquisition need, intended users, constraints, ICT category, and optional agency/research context |
| `ai_assistance` | Optional record of whether an approved AI assistant was used, which prompt actions it supported, and what a person verified |
| `accessibility_requirements` | Whether Section 508 requirements were identified, by which tool/reviewer, and as of when |
| `research_questions` | Questions that must be answered before the research can support a decision |
| `searches` | What was actually searched, how, when, and with what result |
| `evidence` | Source-backed records attached to searches and candidates |
| `findings` | Traceable conclusions linked to supporting and contradictory evidence |
| `decisions` | Human follow-up, specialist review, or unresolved decisions |
| `candidates` | Government reuse, open-source, commercial, and new-build alternatives |

### Optional project context

`project.agency_context` and `project.research_mode` are optional additive
0.2.0 properties. Existing records without them remain valid. `research_mode`
is one of `guided`, `manual`, or `ai-assisted`; an empty string means the user
has not chosen. `prepareResearch()` / `prepare_research()` add empty values
when a record is loaded so the browser form can display them without inventing
a choice. Reports include these lines only when a value is present.

## AI assistance

`ai_assistance` is optional. Existing records without it remain valid;
`prepareResearch()` / `prepare_research()` adds a default false record.
When `used` is true, the record can name the approved tool, list the prompt
actions (`plan`, `review`, `draft`), and note what a person verified. The
report includes this disclosure only when `used` is true. AI output is
assistance, not evidence; it does not create searches, findings, or
determinations.

## Search status

| Status | Meaning |
| --- | --- |
| `not-searched` | Planned or listed but not performed |
| `completed-with-results` | Search completed and returned relevant records |
| `completed-without-results` | Search completed and returned no matching records |
| `partial` | Search covered only part of the intended scope |
| `failed` | Search was attempted but did not complete |

A source in the reference directory is not a completed search. A failed search
is not the same as a search that returned no matching records.

## Evidence

Each evidence record must identify its source, retrieval date, evidence type,
and linked search. Verification states are `unverified`, `reviewed`,
`independently-verified`, and `withdrawn`. `reviewed` and
`independently-verified` require a reviewer.

Evidence types are:

- `official-record`
- `supplier-claim`
- `accessibility-report`
- `independent-test`
- `government-software-metadata`
- `community-evidence`
- `human-observation`

Multiple records with conflicting findings stay separate. The findings section
links supporting and contradictory evidence; it does not collapse them into a
single conclusion.

## Findings and decisions

Every finding must have at least one supporting evidence identifier. A finding
without evidence is an unresolved question or assumption, not a finding.
Findings can also link contradictory evidence, questions, and candidates.

Decisions have a type, status (`pending`, `under-review`, `resolved`), owner,
rationale, and optional evidence. A resolved decision needs a resolved date.
No decision status implies agency approval; the record is a working note.

## References and validation

Identifiers must be unique within each collection. Cross-references must point
to existing records. The Python and browser validators check:

- required fields and shared length limits;
- enum values;
- HTTPS or empty source URLs;
- search/question/evidence/finding/decision references;
- search-date requirements for attempted searches;
- evidence retrieval dates and reviewers;
- finding evidence support;
- resolved-decision dates;
- ACR-found consistency.

The JSON Schema is the exchange contract. The runtime validators add the
cross-reference and conditional rules that JSON Schema does not express here.

## Report

The Markdown report includes the need, questions, methodology, sources
actually investigated, searches and results, reuse/open-source alternatives,
commercial/development alternatives, accessibility evidence, findings and
contradictions, supplier questions, specialist review items, and an appendix
with dates and source records. Reference links are in a separate section and
are not presented as searches.

The report is a draft working record. It is not a FAR Part 10 determination, a
Section 508 conformance assessment, or an agency approval.
