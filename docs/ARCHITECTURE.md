# Architecture and deployment boundaries

## Two ways to use the same research methodology

**GitHub Pages** serves static HTML, JavaScript, and JSON. The browser operates locally, and users intentionally import or export their records. There is no database, remote MCP endpoint, or AI API from the site.

**Local MCP** runs on the user's device through the official Python MCP SDK. It exposes curated public reference sources and deterministic helpers. The local MCP server does not call live government APIs or an LLM. An MCP host can use it alongside 1102tools.

**GitHub Actions** runs test/build jobs and produces the static deployment artifact. A workflow is not an interactive API server and cannot receive live MCP requests when its job is not running.

## Why the distinction matters

A browser-only Pages app cannot securely proxy requests containing Hugging Face or other provider secrets. A scheduled Action can precompute public index files or draft summaries with a secret, but it cannot offer authenticated live research sessions. Protected procurement data must not enter public CI logs, artifacts, or Pages builds.

## Canonical source model

- `src/omr_mcp/sources.json`: authoritative source directory. It describes where to research, not data obtained from a live search.
- `schemas/research.schema.json`: transport-independent working research record.
- `src/omr_mcp/engine.py`: MCP server's deterministic research helpers.
- `site/research.js`: browser equivalent for offline operation.

The duplication between Python and JavaScript evaluation questions is intentional only as a starter tradeoff. Next phase: define shared machine-readable decision rules in JSON and generate implementations/tests for both runtimes.

## Future source adapter contract

A future adapter should be an optional module with at least:

```json
{
  "adapter_id": "example",
  "authority": "official | public-repository | vendor | community",
  "query": "text or structured filters",
  "results": [{
    "id": "source-specific identifier",
    "title": "human-readable name",
    "source_url": "https://...",
    "retrieved_at": "2026-11-12T00:00:00Z",
    "source_as_of": "2026-11-01",
    "evidence_type": "government-record | product-claim | independent-test | metadata",
    "claims": [],
    "limitations": [],
    "verified_by": null
  }]
}
```

This is an illustrative envelope, not a proposed replacement for code.json, OpenACR, publiccode.yml, or other established schemas. Preserve raw records or stable source references and map only the fields needed for comparison.

## Hosted MCP, if needed later

A separate Cloudflare Worker or approved HTTPS host can expose Streamable HTTP with the official SDK's transport layer. It must have a documented authentication/authorization model, abuse safeguards, provenance checks, separate secrets, and agency approval before receiving non-public records. Nothing in the first release implements this endpoint.
