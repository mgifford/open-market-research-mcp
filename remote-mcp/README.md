# Optional Remote MCP (Cloudflare Worker)

This directory is an opt-in remote MCP companion to the existing GitHub Pages research application. It serves **public reference and planning tools only** over MCP Streamable HTTP. It does not replace the browser app or the local Python MCP.

**Not deployed by default.** `PUBLIC_MCP_ENABLED` is set to `false` in `wrangler.jsonc`. Explicitly enable it after reviewing the public-only data policy, package installation, and tests.

## Contents

- `src/index.mjs`: Cloudflare Worker and MCP tool registration with the official MCP server SDK and Cloudflare Agents handler.
- `src/core.mjs`: pure deterministic services (no networking or persistence).
- `tests/core.test.mjs`: Node built-in tests.
- `wrangler.jsonc`: Worker configuration.
- `../src/omr_mcp/sources.json`: original shared, canonical source directory; imported directly at build time.

## Development (maintainers only)

Work from the **existing repository**, with this directory added at the repository root. Do not deploy this directory as a standalone source tree: it imports the shared source catalog via a relative path.

```sh
cd remote-mcp
npm ci
npm test
npm run check
npm run dev
```

When local development is running, the MCP endpoint is `http://localhost:8787/mcp` (use the port Wrangler prints). It returns `503` until the opt-in configuration flag is changed. Do not enable the public service before you have reviewed its boundary.

After review:

1. Set `PUBLIC_MCP_ENABLED` to `true` in `wrangler.jsonc` (public reference tools only).
2. Run `npm test` and `npm run check`.
3. Run `npm run dev`, then inspect with an MCP client or Inspector.
4. Deploy manually using the Cloudflare Dashboard's Git integration or `npm run deploy` with an authorized developer account.
5. Record the actual `/mcp` HTTPS URL in the GitHub Pages documentation only after the endpoint has been deployed and tested.

**Dependency note:** `package-lock.json` is committed. The Worker uses `@modelcontextprotocol/server` 2.4.0, `agents` 0.33.0, and Wrangler 4. The 8 core tests pass, the Wrangler dry-run bundle succeeds, and local `/healthz`, disabled `/mcp` (503), enabled initialization, and `tools/list` were checked. This is still not a deployed or client-interoperability-tested service.

See `../docs/REMOTE-MCP.md` for security boundaries, clients, deployment workflow, and acceptance tests.
