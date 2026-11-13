# Connect the local MCP server to a local LLM

The browser app is static and does **not** run an LLM. To let a local model use
this project's deterministic tools, run the local MCP server and connect it to
an MCP-capable host. You can also skip MCP entirely and paste the static
prompts and exported records into any local LLM.

Host instructions below were checked against the linked official documentation
on 2026-11-13. The server side is tested over stdio by
`tests/test_mcp_server.py`; the specific desktop-host steps were not executed
in this environment.

## Option A — no MCP (works with any local LLM)

Use this when your local model cannot call tools yet, or when you only want help
structuring the research.

1. Open the published site, choose **About**, and read **Engaging an AI on this research**.
2. Copy one of the prompt patterns.
3. Replace the placeholders with your neutral need, questions, and constraints.
4. To discuss evidence, export the research JSON or Markdown from the site and
   paste or attach it to your local chat.
5. Redact CUI, PII, vendor-proprietary, and procurement-sensitive material
   before pasting anything into a local or remote model.

This option gives the model no live sources and no tools. It can still help
critique structure and identify gaps, but every citation and claim must be
checked by a person.

## Option B — run the server and connect an MCP host

### 1. Install the server

Requires Python 3.11 or later. Commands use `python3`; substitute your local
interpreter if needed.

```bash
cd /absolute/path/to/open-market-research-mcp
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
python3 -m pip install -e .
```

Find the absolute server command:

```bash
# macOS / Linux
which omr-mcp

# Windows PowerShell
where.exe omr-mcp
```

It will usually be:

```text
/absolute/path/to/open-market-research-mcp/.venv/bin/omr-mcp
```

or on Windows:

```text
C:\absolute\path\to\open-market-research-mcp\.venv\Scripts\omr-mcp.exe
```

Verify the server independent of any host:

```bash
python3 -m pytest tests/test_mcp_server.py -q
```

The server is **stdio only**. It is not a URL and cannot be deployed on GitHub
Pages.

### 2a. LM Studio (native MCP support)

LM Studio 0.3.17 or later supports local MCP servers. It reads Cursor-style
`mcp.json`.

1. Open **Program** in the right sidebar.
2. Choose **Install → Edit mcp.json**.
3. Add:

```json
{
  "mcpServers": {
    "open-market-research": {
      "command": "/absolute/path/to/open-market-research-mcp/.venv/bin/omr-mcp",
      "args": []
    }
  }
}
```

Windows path example:

```json
{
  "mcpServers": {
    "open-market-research": {
      "command": "C:\\absolute\\path\\to\\open-market-research-mcp\\.venv\\Scripts\\omr-mcp.exe",
      "args": []
    }
  }
}
```

The file is normally at `~/.lmstudio/mcp.json` on macOS/Linux and
`%USERPROFILE%\.lmstudio\mcp.json` on Windows. Save it and confirm the server
loads. Choose a local model that supports tool/function calling; LM Studio asks
you to confirm tool calls.

Official reference: <https://lmstudio.ai/blog/lmstudio-v0.3.17>

### 2b. Jan (native MCP support)

1. Open **Settings → MCP Servers**.
2. Click **+ Add MCP Server**.
3. Set **Transport** to `STDIO`.
4. Set **Command** to the absolute `omr-mcp` path above.
5. Leave **Args** empty and add no environment variables.
6. Enable the server and use a tool-capable local model.

Official reference: <https://docs.jan.ai/desktop/integrations/mcp-servers>

### 2c. mcphost + Ollama

Ollama is a model runtime, not an MCP host by itself. Use an MCP host such as
[`mcphost`](https://github.com/mark3labs/mcphost) with Ollama.

Install mcphost (Go):

```bash
go install github.com/mark3labs/mcphost@latest
```

Create `~/.mcphost.json`:

```json
{
  "mcpServers": {
    "open-market-research": {
      "type": "local",
      "command": ["/absolute/path/to/open-market-research-mcp/.venv/bin/omr-mcp"]
    }
  },
  "model": "ollama/qwen2.5:7b"
}
```

Start Ollama, pull a tool-capable model, and run:

```bash
ollama serve
ollama pull qwen2.5:7b
mcphost -m ollama/qwen2.5:7b
```

Model tags and tool-calling quality vary. If the model cannot call tools,
choose another model; the server is not the limitation.

Official reference: <https://github.com/mark3labs/mcphost>

### 2d. Other MCP hosts

Claude Desktop, Continue, Cline, Roo Code, and other MCP-capable clients accept
a local stdio command. Use the same absolute `omr-mcp` path, with no arguments
and no API key. Configuration locations and formats differ by host; use that
host's current MCP documentation.

Claude Desktop, for reference, uses
`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS,
`%APPDATA%\Claude\claude_desktop_config.json` on Windows, and
`~/.config/Claude/claude_desktop_config.json` on Linux.

## 3. Verify the tools

Ask the host:

> List the tools and resources available from the open-market-research server.

You should see **8 tools** and **2 resources**:

- Tools: `list_research_sources`, `find_research_sources`,
  `create_research_plan`, `identify_accessibility_evidence_gaps`,
  `draft_market_research_report`, `normalize_public_metadata`,
  `import_openacr_report`, `map_1102tools_usaspending_record`.
- Resources: `research://sources`, `research://workflow`.

Try:

> Use the open-market-research server to list sources for accessibility
> evidence. Do not invent sources. Then propose three research questions and
> what would remain unverified.

The model must be allowed to call tools. The tools are deterministic and make
no network requests; the model's text is still unverified and needs review.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `omr-mcp: command not found` | Use the absolute path. Activate the venv and run `which omr-mcp` / `where.exe omr-mcp`. |
| `ModuleNotFoundError: mcp` | The host is using the wrong Python. Point it at `.venv/bin/omr-mcp`, not a system Python. |
| No tools appear | Confirm the host version supports MCP; restart the host after editing `mcp.json`; check host logs. |
| Model ignores tools | Choose a model with tool/function calling; some small models do not support it. |
| Server starts then waits | That is correct for stdio. The host, not a browser, must connect to it. |
| JSON path error on Windows | Use double backslashes in JSON and the `.venv\\Scripts\\omr-mcp.exe` path. |
| “Live MCP data” expected on Pages | Pages is static. It cannot reach stdio; use a local host. |

## Boundaries

- The local server exposes deterministic tools, not an AI model.
- It does not search live procurement systems or fetch ACRs.
- OpenACR import preserves claims and does not certify conformance.
- 1102tools/USAspending mapping creates a draft; applying it requires explicit
  human approval.
- Do not put real acquisition records into a model or service without agency
  authorization, redaction, and a retention decision.
- No API key is required for the core server.
