# Open Market Research MCP

An open-source, evidence-first market research companion for digital government acquisition and the [DITAP curriculum](https://github.com/usds/ditap-curriculum-update).

**Version:** 0.2.0, educational starter. Not affiliated with or endorsed by USDS, GSA, CMS, DITAP, or 1102tools.

## Start here

Open the published GitHub Pages site. You do not need an account, installation, API key, or AI subscription.

- **Start new research** asks for the problem, the product or service type, the agency context, and whether you prefer guided, manual, or approved-AI-assisted work.
- **Continue existing research** opens a saved JSON file.
- **Try a fictional DITAP example** loads the teaching case.

The browser workspace is static. Save a research file to resume after closing the browser; nothing is uploaded automatically. Use **AI help** to generate a prompt for an approved agency assistant, or open the **About** page for optional local MCP and local-LLM setup. None of these is required.

The practical objective is to help an acquisition professional answer:

1. What problem are we trying to solve, and for whom?
2. Could we reuse government software or existing open source before buying or building?
3. What comparable commercial and government solutions are available?
4. What accessibility requirements and product-specific evidence apply?
5. What questions and verifications are still needed?
6. How do we document sources, uncertainties, and agency approval points?

## What works today

- **Zero-install GitHub Pages app:** A plain-language landing page, simplified starting questions, source guidance, an approved-AI prompt assistant, and the seven-stage research workflow. Save or reopen a human-readable JSON file, use source cards to prefill a **not-searched** search form, and export JSON or a Markdown draft. No account or installation.
- **Approved-AI prompt assistant:** Generate, preview, and copy prompts for **Plan my research**, **Review my evidence**, and **Draft my report**. The page does not call a model. Prompts are built from the current record and require human verification.
- **AI-use disclosure:** Optionally record the approved tool, actions, and what a person verified; the report includes it only when AI use is explicitly marked.
- **Optional technical About page:** Local MCP and local-LLM setup are separated from the primary research task.
- **Evidence-backed research record (0.2.0):** Research questions, searches, evidence, findings, and pending decisions are linked by stable identifiers. Legacy 0.1.0 records import through a documented migration that does not invent history.
- **Static About the local MCP and AI guidance:** The About page explains the local stdio server, its tools/resources, and its boundaries without claiming live MCP data, and provides copyable AI prompt patterns that do not execute a model.
- **Shared decision rules:** `src/omr_mcp/rules.json` drives the browser and Python questions, validation limits, and report wording from one versioned source.
- **Optional remote MCP starter:** A separate Cloudflare Worker under `remote-mcp/` exposes 5 public read-only reference/planning tools. `PUBLIC_MCP_ENABLED` is false by default; it is not deployed. See [remote MCP deployment boundaries](docs/REMOTE-MCP.md).
- **Local MCP server:** Eight read-only/deterministic tools and two resources for source discovery, research planning, accessibility evidence questions, report drafting, public metadata normalization, OpenACR import, and fixture-based USAspending record mapping.
- **Public metadata adapters:** Read-only normalization of public `code.json`, `agency-index.json`, and `publiccode.yml` with source, retrieval date, data-as-of date, license, access rights, and limitations.
- **OpenACR import prototype:** Local CLI and MCP import of OpenACR YAML for human review, checked against the pinned upstream schema and optionally compared with a catalog for missing criteria. It distinguishes supports, partial support, non-support, not applicable, not evaluated, and missing claims, and does not create or certify an ACR.
- **DITAP workshop materials:** Expanded fictional case with a reuse conflict, open-source and commercial options, a partial ACR, missing ACRs, a no-result search, a failed search, and open decisions; facilitator guide, worksheet, rubric, pilot protocol, and [sample evidence-backed report](examples/ditap-case-management-report.md). These are prepared but **not yet learner-tested**.
- **GitHub Actions:** Tests Python, Node, MCP-over-stdio, browser behavior, axe/keyboard regressions, and the upstream OpenACR CLI; publishes the static app and can refresh an allowlisted public `code.json` sample as a reviewable artifact.
- **DITAP fixture:** Clearly fictional case management scenario, never a real vendor shortlist.
- **Optional 1102tools/USAspending mapping demo:** A selected public award record can be mapped to a search/evidence draft and applied to a local research file only with `--approve`. No live integration or copied 1102tools code. See the [applied sample report](examples/ditap-case-management-with-1102tools-report.md).
- **Optional Hugging Face Action:** Manual run on the fictional fixture, publishes an unverified artifact for review, never into the website.

**No live procurement, vendor, ACR, ART, CMS, or AI APIs are connected by the browser.** The source directory and public software sample are curated static metadata and links, not a comprehensive or live market search. A scheduled GitHub Action can refresh the public sample for review; it does not publish it automatically. OpenACR and public metadata are parsed only by local tools, not by the static site. The app never determines Section 508 conformance or approves exceptions.

**Accessibility status:** automated axe scans, keyboard/focus regression tests, 320 CSS px reflow, and forced-colors focus checks run in CI. Manual screen-reader testing with NVDA, JAWS, and VoiceOver has **not** been performed, and no WCAG conformance claim is made. The [manual evidence pack](docs/accessibility/README.md) provides the environments, tasks, issue record, and results template for a real audit. See [testing](docs/TESTING.md).

## Deploy to GitHub Pages

1. Create an empty GitHub repository named `open-market-research-mcp` or another name of your choice. Use `main` as the default branch.
2. Copy **all files and hidden directories** from this starter into the repository. Keep `.github/workflows/pages.yml`.
3. Commit and push to `main`.
4. Open **Settings > Pages > Build and deployment > Source > GitHub Actions**.
5. Open **Actions > Test and deploy GitHub Pages** and check the result. You can also run the workflow manually.
6. Visit the published project URL, typically `https://YOUR-USER.github.io/YOUR-REPO/`.

The deployment uses only relative URLs, so the repository name is not hard-coded.

## Run locally

**Interpreter note:** commands in this README use `python`. If your local interpreter is `python3`, substitute `python3` (and `python3 -m pip`) throughout. CI uses the interpreter installed by `actions/setup-python`.

### Static app

```bash
python scripts/build_site.py
python -m http.server 8000 --directory _site
```

Open `http://localhost:8000`. Opening the source HTML with `file://` will not load the JSON because browser security blocks local fetches.

### Python MCP server for an AI client

Requires Python 3.11+, network access to install packages, and an MCP-compatible client.

```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -e .
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

For host-specific setup with **LM Studio**, **Jan**, or **mcphost + Ollama**, see [Connect the local MCP server to a local LLM](docs/LOCAL-LLM.md). That guide also covers the no-MCP option of copying the static prompts and exported records.

### Run tests

```bash
pip install -e '.[dev]'
python -m pytest -q
node --test tests/research.test.mjs
python scripts/build_site.py
npm ci
npx playwright install chromium
npm test
```

`npm test` runs the Node unit tests, the pinned upstream OpenACR CLI
validation, and the Playwright/axe browser suite. Node 22 is used by CI. The
static site has **no runtime npm dependencies**; Playwright and the OpenACR CLI
are dev-only test tooling recorded in `package-lock.json`.

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

`src/omr_mcp/rules.json` is copied to the Pages build and loaded by the browser; the Python server reads the same file. Public metadata normalization and OpenACR import are local-only tools, not browser features and not live API calls.

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

See [Phase 1 assessment](docs/PHASE1-ASSESSMENT.md), [Phase 2 assessment](docs/PHASE2-ASSESSMENT.md), [procurement usability test plan](docs/USABILITY-TEST-PLAN.md), [Roadmap](docs/ROADMAP.md), [research schema](docs/SCHEMA.md), [migration](docs/MIGRATION.md), [DITAP alignment](docs/DITAP.md), [workshop materials](docs/workshop/README.md), [decision rules](docs/DECISION-RULES.md), [public metadata adapters](docs/ADAPTERS.md), [OpenACR import](docs/OPENACR-IMPORT.md), [1102tools integration proposal](docs/INTEGRATION-1102TOOLS.md), [remote MCP deployment](docs/REMOTE-MCP.md), [implementation agent prompt](docs/IMPLEMENTATION-PROMPT.md), [security](SECURITY.md), and [contributing](CONTRIBUTING.md).

## License

MIT for this starter's original code and writing. Upstream standards, records, trademarks, and external materials retain their own terms. No external source documents or ACRs are republished in this starter.
