# Security and privacy

## Current boundary

- The GitHub Pages app is static, contains no runtime API keys, sends no submitted research data anywhere, and persists nothing to server or localStorage.
- Browser export files remain under the user's control and may contain sensitive procurement planning information. Users are responsible for their handling.
- The local MCP server reads bundled public source descriptors and processes data supplied by its MCP host. The *host's* model provider, logging, and retention policies are separate and must be evaluated.
- External source links open in new tabs with `rel="noopener noreferrer"`.
- The HF demonstration uses `HF_TOKEN` only within a manually triggered GitHub Action and transmits only a fictional case study to the selected provider. It never publishes model output to Pages.
- Public metadata adapters read local text by default. The optional fetch helper accepts HTTPS only, rejects credentials, limits response size, and permits only `raw.githubusercontent.com` and `raw.github.com`.
- OpenACR import uses `yaml.safe_load`, a 2 MB input limit, local input only, and validation against a pinned upstream schema vendored in `src/omr_mcp/schemas/`. It preserves author/vendor fields present in the document; users must treat an ACR according to its handling requirements.
- The optional 1102tools/USAspending demonstration performs no network call. It maps one selected public record into a draft search/evidence pair and applies it only when `approved=True` or `--approve` is supplied after human review.
- Browser tests assert that the site makes no cross-origin requests. The static site has no runtime npm dependencies; Playwright and the OpenACR CLI are dev-only and recorded in `package-lock.json`.
- GitHub Actions are pinned to commit SHAs and use least-privilege `contents: read` except the Pages deployment job.

## Not yet assessed

Production use, authorization to operate, accessibility conformance, full supply-chain review, privacy impact, agency retention requirements, and processing of non-public or protected ACR documents. The OpenACR importer is a prototype; it has not been assessed for hostile YAML beyond `safe_load`, decompression, or very large catalogs.

## Hard requirements for future endpoints

Authentication and authorization; per-user data isolation; input/output size limits; CORS and origin checks; SSRF defenses; rate limits and costs; redaction and retention controls; threat modelling; logging boundaries; and clear restrictions on private government records.

## Reporting

Until the repository has a maintainer contact, use GitHub private vulnerability reporting, if the repository owner enables it. Do not submit sensitive exploits or credentials to a public issue.
