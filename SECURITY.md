# Security and privacy

## Current boundary

- The GitHub Pages app is static, contains no runtime API keys, sends no submitted research data anywhere, and persists nothing to server or localStorage.
- Browser export files remain under the user's control and may contain sensitive procurement planning information. Users are responsible for their handling.
- The local MCP server reads bundled public source descriptors and processes data supplied by its MCP host. The *host's* model provider, logging, and retention policies are separate and must be evaluated.
- External source links open in new tabs with `rel="noopener noreferrer"`.
- The HF demonstration uses `HF_TOKEN` only within a manually triggered GitHub Action and transmits only a fictional case study to the selected provider. It never publishes model output to Pages.

## Not yet assessed

Production use, authorization to operate, accessibility conformance, supply-chain security, privacy impact, agency retention requirements, and user-submitted ACR document processing.

## Hard requirements for future endpoints

Authentication and authorization; per-user data isolation; input/output size limits; CORS and origin checks; SSRF defenses; rate limits and costs; redaction and retention controls; threat modelling; logging boundaries; and clear restrictions on private government records.

## Reporting

Until the repository has a maintainer contact, use GitHub private vulnerability reporting, if the repository owner enables it. Do not submit sensitive exploits or credentials to a public issue.
