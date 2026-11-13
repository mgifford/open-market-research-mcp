# Optional remote MCP deployment and client integration

**Status: reviewable implementation starter, not deployed. Local unit tests, Wrangler dry-run, disabled `/mcp` (503), and enabled `/healthz`/initialize/`tools/list` were exercised. Client interoperability and production security controls remain untested.**

The GitHub Pages app remains the default experience for procurement officers, with no installation or user account. A separate Cloudflare Worker provides a remote MCP endpoint for approved compatible AI clients. Neither component requires procurement officers to install Python or Node.js.

## Architecture

```text
                  Canonical GitHub repository
                  src/omr_mcp/sources.json
                    |                  |
       GitHub Actions build       Cloudflare Workers build
                    |                  |
             GitHub Pages           /mcp (HTTPS)
          Research UI + export      Public reference tools
                    |                  |
               Browser        Copilot / Claude / ChatGPT
                    |                  |
         No remote record sync      No record persistence
```

The Worker imports the existing source directory during its build. The Worker does not fetch pages or read private government systems. A returned research URL is a reference to investigate, not evidence that a search was performed.

## Tools and boundaries

| Tool | Public input | Output |
| --- | --- | --- |
| `discover_research_sources` | Optional query, source category, result limit | Curated official starting points, URLs and limitations |
| `create_public_research_plan` | A **publicly disclosable** need description plus explicit confirmation | Proposed questions, source suggestions, next steps; no completed searches |
| `accessibility_evidence_checklist` | Generic ICT type and ACR availability | Section 508 and ACR evidence questions and GSA links |
| `research_methodology` | None | Requirements for provenance and distinguishing evidence types |
| `report_outline` | None | Neutral draft report sections and review instructions |

All tools are read-only and deterministic. The source tool returns the current catalog's `use_when`, `authentication`, `record_how`, and `search_strategy` guidance alongside direct public research links. No model is invoked by the Worker. The remote server does **not**:

- search SAM.gov, USAspending, government systems, or vendors in real time;
- accept attachments, parse confidential ACRs, or retrieve non-public sources;
- store cases, research projects, procurement records, user identities or credentials;
- produce a vendor ranking, award recommendation or legal determination;
- declare Section 508 conformance or authorize exceptions;
- expose the existing Python MCP server's complete tool set.

The existing Python/local tools and browser functionality are preserved, but not automatically ported. This narrower scope is intentional: no anonymous hosted endpoint should become a receiving point for protected agency procurement records.

## Security and privacy

**Public mode has no authentication.** The `confirmedPublic` input is a self-declaration that an AI client can set; it is **not an enforceable data classification or user-consent control**. Anyone who learns the Worker URL may call its tools. Do not submit CUI, acquisition-sensitive drafts, bid information, proprietary supplier information, private code, personal information, or agency-protected records. Cloudflare will process network requests and may retain operational metadata under its own policies, even though this application contains no explicit storage or logging code.

Controls included in the starter:

- Public service opt-in flag is off by default.
- Only bounded tool inputs and static public reference data are accepted.
- No outbound fetch and no write tools.
- No application database, model API, tokens or repository secrets.
- Cross-origin browser requests are not enabled by the Worker.
- Basic request-size rejection and non-cacheable responses.
- No application-level request/body logging.

Before **any** production deployment, the maintainer must add and test infrastructure-level abuse controls (rate limits / WAF / quotas), identify operational ownership, review the dependency lockfile, and confirm Cloudflare service terms. The starter does not include a rate limiter or OAuth. CORS is not an authentication mechanism.

For handling real agency-sensitive material, build a separate **authenticated** Worker based on supported OAuth 2.0 / organizational authorization, data classification, retention rules, audit controls, threat modeling, and tenant isolation. Do not merely set another Boolean flag to expose procurement records. Do not assume that Cloudflare Access alone is compatible with every AI client's MCP authorization flow.

## Deployment options

### Option A: Cloudflare dashboard, maintained through Git

1. Add `remote-mcp/` to the existing GitHub repository, along with this documentation.
2. In Cloudflare, create a Worker and connect it to the GitHub repository with appropriate permissions.
3. Set the Worker project root to `remote-mcp` and confirm that the build has access to the repository root, including `src/omr_mcp/sources.json`.
4. Review the committed `remote-mcp/package-lock.json` and run `npm ci`; do not replace it with a floating install.
5. Run the `remote-mcp` unit tests and confirm a successful Worker build.
6. Review the security boundary and set `PUBLIC_MCP_ENABLED=true` only for the anonymous public tools.
7. Deploy to the Workers subdomain or an owned custom domain.
8. Verify the `/healthz` endpoint and then test `/mcp` with an MCP client.

The exact hostname is generated by Cloudflare. Do not hardcode a guessed URL in the website. Ensure the dashboard's build context supports relative imports from the parent repository; if not, adapt the build to copy the canonical catalog as a generated artifact rather than maintaining two catalogs.

### Option B: GitHub Actions manual deployment

The overlay includes `.github/workflows/test-remote-mcp.yml` for pull-request checks and `.github/workflows/deploy-remote-mcp.yml` for manual deployment. It is deliberately **manual-only** (`workflow_dispatch`) and requires repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. These are deployer credentials, **not** procurement officer credentials. Use a restricted Cloudflare API token.

The workflow uses the committed lockfile and `npm ci`. Put deployment behind a protected GitHub environment if possible. Do not deploy on every push until the project has operational ownership and rollback procedures.

## Connecting a client

After deployment, the endpoint will have this shape:

```text
https://YOUR-WORKER.YOUR-SUBDOMAIN.workers.dev/mcp
```

This is an **example URL**, not a live endpoint.

- **Claude:** Use its custom web connector flow, paste the real HTTPS `/mcp` URL, and select *No sign in* for this public edition. Account/organization restrictions can apply.
- **ChatGPT:** Use the custom MCP server connection flow where available. Workspace administrators may need to authorize the server. Plan-specific access varies.
- **Microsoft 365 Copilot:** An administrator/developer generally must register the remote MCP endpoint through the supported Copilot plugin/agent manifest and approve it. Ordinary officers should not be expected to configure an agent themselves.
- **Other clients:** Use a compatible remote MCP client and Streamable HTTP transport.

For the initial public implementation, ask the client: "List public government market research sources and explain which have actually been searched." The expected result identifies sources as references only.

Useful authoritative documentation:

- Cloudflare remote MCP: https://developers.cloudflare.com/agents/model-context-protocol/guides/remote-mcp-server/
- Cloudflare handler API: https://developers.cloudflare.com/agents/model-context-protocol/apis/handler-api/
- Claude remote connectors: https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp
- ChatGPT custom servers: https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt
- Microsoft 365 Copilot remote MCP plugins: https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/configure-plugin-mcp-servers

## Validation gates

**Automatable, before deployment**

1. `node --test remote-mcp/tests/*.test.mjs` passes (8 tests).
2. Node syntax checks pass.
3. `npm ci` with the committed lockfile succeeds.
4. Wrangler dry-run build succeeds with imports from the canonical `src/omr_mcp/sources.json`.
5. A test detects accidental drift or duplication of source catalog data.
6. Default `PUBLIC_MCP_ENABLED=false` returns `503` from `/mcp`.
7. Enabling the flag makes `/mcp` respond to a valid MCP initialization and `tools/list` request (locally checked).
8. Each tool is callable via a real MCP client, with valid structured results.
9. Invalid input, excessive payloads, and unsupported paths have appropriate errors.
10. Security scans and Cloudflare abuse limits are reviewed before launch.

**Manual, before publicizing**

- Confirm at least one remote client in Claude, ChatGPT, and Microsoft 365 Copilot, where account policy permits.
- Confirm browser-only users still have the complete GitHub Pages workflow without connecting MCP.
- Confirm no procurement-sensitive input or authorization tokens appear in application logs or artifacts.
- Test rate limiting, service downtime, incident response and rollback.
- Verify no tool implies a search was performed when it merely supplied a link or suggested query.

## What to build next, if demand is demonstrated

- OAuth-based access and organization-level approval for protected workflows.
- Optional verified read-only adapters to authoritative APIs, with provenance and caching/quotas.
- Portable evidence import/export with permission-aware storage.
- A reusable OpenAPI/MCP integration surface with 1102tools without copying or forking their tooling.
- Compatibility tests and documentation for agency-managed Copilot connectors.
- A hosted service ownership and governance model.

Do not conflate those future capabilities with the anonymous public endpoint.
