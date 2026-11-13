"""Local MCP server exposing deterministic market research guidance.

GitHub Pages cannot run this program. Use it in an MCP client over stdio.
The MCP library is intentionally imported only here, so offline tests work
without installing the MCP transport dependency.
"""

from __future__ import annotations

import json

import yaml

from .adapters import normalize_agency_index, normalize_code_json, normalize_publiccode
from .engine import (
    build_report,
    decision_rules,
    evidence_questions,
    market_research_plan,
    search_sources,
    source_catalog,
)
from .integrations import map_usaspending_award
from .openacr import parse_openacr_yaml

try:
    from mcp.server import MCPServer
    from mcp.server.mcpserver.exceptions import ToolError
except ImportError as exc:
    raise SystemExit("Install the MCP dependencies first: pip install -e .") from exc

mcp = MCPServer("Open Market Research MCP")


def _loads_object(raw: str, label: str, max_chars: int) -> dict:
    if len(raw) > max_chars:
        raise ToolError(f"{label} exceeds the {max_chars:,}-character input limit.")
    try:
        value = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ToolError(
            f"{label} is not valid JSON: {exc.msg} at line {exc.lineno}, column {exc.colno}."
        ) from exc
    if not isinstance(value, dict):
        raise ToolError(f"{label} must be a JSON object.")
    return value


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
    limits = decision_rules()["limits"]
    candidate = _loads_object(candidate_json, "candidate_json", limits["max_candidate_json_chars"])
    return evidence_questions(candidate)


@mcp.tool()
def draft_market_research_report(research_json: str) -> str:
    """Render a local research record into an unapproved Markdown draft."""
    limits = decision_rules()["limits"]
    data = _loads_object(research_json, "research_json", limits["max_research_json_chars"])
    try:
        return build_report(data)
    except ValueError as exc:
        raise ToolError(str(exc)) from exc


@mcp.tool()
def import_openacr_report(openacr_yaml: str, catalog_yaml: str = "") -> dict:
    """Import OpenACR YAML for inspection. Never creates or certifies an ACR."""
    if len(openacr_yaml) > 2_000_000:
        raise ToolError("OpenACR input exceeds the 2,000,000-character limit.")
    if len(catalog_yaml) > 2_000_000:
        raise ToolError("OpenACR catalog input exceeds the 2,000,000-character limit.")
    try:
        catalog = yaml.safe_load(catalog_yaml) if catalog_yaml else None
        return parse_openacr_yaml(openacr_yaml, catalog=catalog)
    except (ValueError, yaml.YAMLError) as exc:
        raise ToolError(str(exc)) from exc


@mcp.tool()
def normalize_public_metadata(
    metadata_text: str,
    metadata_format: str,
    source_url: str = "",
    repository: str = "",
) -> dict:
    """Normalize local code.json, agency-index.json, or publiccode.yml text.

    This performs no network request and does not treat metadata as proof of
    suitability, reuse rights, or accessibility conformance.
    """
    if len(metadata_text) > 500_000:
        raise ToolError("Metadata input exceeds the 500,000-character limit.")
    try:
        if metadata_format == "publiccode":
            data = yaml.safe_load(metadata_text)
        elif metadata_format in {"codejson", "agency-index"}:
            data = json.loads(metadata_text)
        else:
            raise ToolError("metadata_format must be codejson, agency-index, or publiccode")
        if metadata_format == "codejson":
            if not repository:
                raise ToolError("repository is required for codejson")
            return normalize_code_json(data, repository, source_url=source_url or None)
        if metadata_format == "agency-index":
            return normalize_agency_index(data, source_url=source_url)
        return normalize_publiccode(data, source_url=source_url)
    except ToolError:
        raise
    except (ValueError, yaml.YAMLError, json.JSONDecodeError) as exc:
        raise ToolError(str(exc)) from exc


@mcp.tool()
def map_1102tools_usaspending_record(
    record_json: str,
    question_id: str,
    retrieved_at: str,
    source_url: str = "",
    candidate_id: str = "",
) -> dict:
    """Map one selected public USAspending record into a reviewable evidence draft.

    This makes no network request and does not apply the record to a research
    file. The host must obtain explicit human approval before applying it.
    """
    record = _loads_object(record_json, "record_json", 200_000)
    try:
        return map_usaspending_award(
            record,
            question_id=question_id,
            retrieved_at=retrieved_at,
            source_url=source_url,
            candidate_id=candidate_id,
        )
    except ValueError as exc:
        raise ToolError(str(exc)) from exc


@mcp.resource("research://sources", mime_type="application/json")
def curated_sources() -> str:
    """Read the source directory and its limitations."""
    return json.dumps(source_catalog(), indent=2)


@mcp.resource("research://workflow", mime_type="application/json")
def workflow() -> str:
    """Read the deterministic market research workflow."""
    return json.dumps(market_research_plan(), indent=2)


def main() -> None:
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
