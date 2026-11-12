"""Local MCP server exposing deterministic market research guidance.

GitHub Pages cannot run this program. Use it in an MCP client over stdio.
The MCP library is intentionally imported only here, so offline tests work
without installing the MCP transport dependency.
"""

from __future__ import annotations

import json
from .engine import (
    build_report,
    evidence_questions,
    market_research_plan,
    search_sources,
    source_catalog,
)

try:
    from mcp.server import MCPServer
except ImportError as exc:
    raise SystemExit("Install the MCP dependencies first: pip install -e .") from exc

mcp = MCPServer("Open Market Research MCP")


@mcp.tool()
def list_research_sources(category: str = "") -> list[dict[str, str]]:
    """List curated source descriptors. This does NOT query live government APIs."""
    return search_sources(category=category)


@mcp.tool()
def find_research_sources(query: str) -> list[dict[str, str]]:
    """Find relevant source directories, guidance, and upstream MCP servers."""
    return search_sources(term=query)


@mcp.tool()
def create_research_plan() -> list[dict[str, str]]:
    """Give a DITAP-compatible human-centered market research sequence."""
    return market_research_plan()


@mcp.tool()
def identify_accessibility_evidence_gaps(candidate_json: str) -> list[str]:
    """List verification questions for one candidate, without deciding conformance."""
    if len(candidate_json) > 50000:
        raise ValueError("Candidate input exceeds size limit")
    candidate = json.loads(candidate_json)
    if not isinstance(candidate, dict):
        raise ValueError("Candidate must be a JSON object")
    return evidence_questions(candidate)


@mcp.tool()
def draft_market_research_report(research_json: str) -> str:
    """Render a local research record into an unapproved Markdown draft."""
    if len(research_json) > 1000000:
        raise ValueError("Research input exceeds size limit")
    data = json.loads(research_json)
    return build_report(data)


@mcp.resource("research://sources")
def curated_sources() -> str:
    """Read the source directory and its limitations."""
    return json.dumps(source_catalog(), indent=2)


@mcp.resource("research://workflow")
def workflow() -> str:
    """Read the deterministic market research workflow."""
    return json.dumps(market_research_plan(), indent=2)


def main() -> None:
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
