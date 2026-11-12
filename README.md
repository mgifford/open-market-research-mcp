# Open Market Research MCP

An open-source, evidence-first market research companion for digital government acquisition and the [DITAP curriculum](https://github.com/usds/ditap-curriculum-update).

**Version:** 0.1.0, educational starter. Not affiliated with or endorsed by USDS, GSA, CMS, DITAP, or 1102tools.

The practical objective is to help an acquisition professional answer:

1. What problem are we trying to solve, and for whom?
2. Could we reuse government software or existing open source before buying or building?
3. What comparable commercial and government solutions are available?
4. What accessibility requirements and product-specific evidence apply?
5. What questions and verifications are still needed?
6. How do we document sources, uncertainties, and agency approval points?

## What works today

- **GitHub Pages browser app:** Define a need, browse curated research source descriptions and a small CMS public `code.json` example catalog, add market alternatives, track basic ACR metadata and evidence gaps, import/export JSON, and export a Markdown draft report.
- **Local MCP server:** Five read-only/deterministic tools and two resources for source discovery, research planning, accessibility evidence questions, and report drafting.
- **GitHub Actions:** Tests Python and browser logic, publishes the static app, and can refresh an allowlisted public `code.json` sample as a reviewable artifact.
- **DITAP fixture:** Clearly fictional case management scenario, never a real vendor shortlist.
- **Optional Hugging Face Action:** Manual run on the fictional fixture, publishes an unverified artifact for review, never into the website.

**No live procurement, vendor, ACR, ART, CMS, or AI APIs are connected in the initial release.** The source directory and public software sample are curated static metadata and links, not a comprehensive or live market search. A separate, scheduled GitHub Action can refresh the public sample for review; it does not publish it automatically. OpenACR documents are not parsed yet. The app never determines Section 508 conformance or approves exceptions.

## Deploy to GitHub Pages

1. Create an empty GitHub repository named `open-market-research-mcp` or another name of your choice. Use `main` as the default branch.
2. Copy **all files and hidden directories** from this starter into the repository. Keep `.github/workflows/pages.yml`.
3. Commit and push to `main`.
4. Open **Settings > Pages > Build and deployment > Source > GitHub Actions**.
5. Open **Actions > Test and deploy GitHub Pages** and check the result. You can also run the workflow manually.
6. Visit the published project URL, typically `https://YOUR-USER.github.io/YOUR-REPO/`.

The deployment uses only relative URLs, so the repository name is not hard-coded.

## Run locally

### Static app

```bash
python scripts/build_site.py
python -m http.server 8000 --directory _site
```

Open `http://localhost:8000`. Opening the source HTML with `file://` will not load the JSON because browser security blocks local fetches.

### Python MCP server for an AI client

Requires Python 3.11+, network access to install packages, and an MCP-compatible client.

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
omr-mcp
```

An MCP client's **stdio** configuration should point to the absolute path of the virtual environment executable. For example:

```json
{
  "mcpServers": {
    "open-market-research": {
      "command": "/absolute/path/to/repo/.venv/bin/omr-mcp"
    }
  }
}
```

The server uses the official MCP Python SDK v2 API. Its tool code is testable without a running model. It does not call 1102tools automatically. Use a client that connects both MCP servers, or add a future adapter with clear provenance.

### Run tests

```bash
pip install -e '.[dev]'
python -m pytest -q
node --test tests/research.test.mjs
python scripts/build_site.py
```

Node 22 is used by CI; no npm dependencies or JavaScript bundler required.

## Architecture: static Pages plus local MCP

```text
                            GitHub repository
                         (one canonical catalog)
                                  |
                 +----------------+----------------+
                 |                                 |
          GitHub Actions                     Python MCP v2
          validate and build               local / stdio server
                 |                                 |
           GitHub Pages                       MCP-capable AI
         no server, no keys                  assistant or client
                 |
      browser-only research notes
      import/export JSON, Markdown
```

GitHub Pages **cannot host a live MCP HTTP endpoint** or securely store AI API secrets. GitHub Actions run jobs and generate deployable files, not a continuously listening server. Hosted MCP would require a serverless/always-on runtime such as Cloudflare Workers, a container, or an approved agency host. See [Architecture](docs/ARCHITECTURE.md).

## Optional Hugging Face AI

AI is intentionally **not needed** for searching the static catalog, detecting missing evidence, or building draft reports. Do not put `HF_TOKEN` in JavaScript, repository files, client-side environment variables, or GitHub Pages artifacts.

If wanted, set repository secret `HF_TOKEN` with a fine-grained Hugging Face token granting Inference Providers calls. In GitHub Actions, manually dispatch **Optional HF fictional demo** and enter a provider-supported model identifier. The result is a downloadable workflow artifact, **not** an automatically published research finding. The Action sends only the explicitly fictional, public scenario, never real procurement content. Hosting AI for real records needs agency authorization, redaction, budget limits, and a separate security review.

See [AI decision record](docs/AI-POLICY.md). The optional weekly **Reviewable public code.json snapshot** workflow also downloads an allowlisted, public-only CMS metadata sample as an artifact; review and commit the JSON file to change the live site.

## Sources and standards to reuse

- [DITAP market research, Module 2 Sprint 4](https://github.com/usds/ditap-curriculum-update/tree/main/3_Curriculum/3A_DITAP-Core-Curriculum/Module-2/Sprint-4)
- [1102tools federal contracting MCPs](https://github.com/1102tools-dev/federal-contracting-mcps)
- [GSA Section 508 Buy/Sell](https://www.section508.gov/buy-sell/)
- [GSA Accessibility Requirements Tool](https://www.section508.gov/art/)
- [GSA ACR Editor](https://acreditor.section508.gov/)
- [GSA OpenACR](https://github.com/GSA/openacr)
- [Section 508 ICT exceptions](https://www.section508.gov/buy/determine-ict-exceptions/)
- [FY2025 Section 508 assessment recommendations](https://www.section508.gov/manage/section-508-assessment/2025/recommendations/)
- [SHARE IT Act](https://www.congress.gov/bill/118th-congress/house-bill/9566)
- [CMS gov-codejson](https://github.com/DSACMS/gov-codejson)
- [Digital-first public experience](https://digital.gov/resources/delivering-digital-first-public-experience)

These links are reference sources, not claims that any external program endorses this project.

## What to build next

See [Roadmap](docs/ROADMAP.md), [DITAP alignment](docs/DITAP.md), [implementation agent prompt](docs/IMPLEMENTATION-PROMPT.md), [security](SECURITY.md), and [contributing](CONTRIBUTING.md).

## License

MIT for this starter's original code and writing. Upstream standards, records, trademarks, and external materials retain their own terms. No external source documents or ACRs are republished in this starter.
