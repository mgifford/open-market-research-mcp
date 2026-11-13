"""Protocol-level smoke tests for the local MCP v2 stdio server.

This test launches the real server process and speaks MCP over stdio. It does
not use the network and does not mock the transport.
"""

import asyncio
import json
import sys
from pathlib import Path

import pytest

pytest.importorskip("mcp")

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

ROOT = Path(__file__).resolve().parents[1]

MINIMAL_RESEARCH = {
    "schema_version": "0.1.0",
    "project": {
        "name": "Protocol test",
        "need": "Verify the stdio transport",
        "users": "Test users",
        "constraints": "None",
        "ict_type": "Web application",
    },
    "candidates": [],
}


def _run_session(callback):
    async def runner():
        params = StdioServerParameters(
            command=sys.executable,
            args=["-m", "omr_mcp.server"],
            cwd=str(ROOT),
        )
        async with stdio_client(params) as (read_stream, write_stream):
            async with ClientSession(read_stream, write_stream) as session:
                await session.initialize()
                return await callback(session)

    return asyncio.run(asyncio.wait_for(runner(), timeout=30))


def test_stdio_lists_tools_and_resources():
    async def check(session):
        tools = await session.list_tools()
        assert {tool.name for tool in tools.tools} == {
            "list_research_sources",
            "find_research_sources",
            "create_research_plan",
            "identify_accessibility_evidence_gaps",
            "draft_market_research_report",
            "import_openacr_report",
            "normalize_public_metadata",
        }
        resources = await session.list_resources()
        assert {str(resource.uri) for resource in resources.resources} == {
            "research://sources",
            "research://workflow",
        }
        read = await session.read_resource("research://sources")
        assert read.contents[0].mime_type == "application/json"
        assert json.loads(read.contents[0].text)

    _run_session(check)


def test_stdio_calls_tools_and_returns_actionable_errors():
    async def check(session):
        plan = await session.call_tool("create_research_plan", {})
        assert plan.is_error is False
        assert len(plan.content) == 6

        report = await session.call_tool(
            "draft_market_research_report",
            {"research_json": json.dumps(MINIMAL_RESEARCH)},
        )
        assert report.is_error is False
        assert "Draft research notes" in report.content[0].text

        bad_json = await session.call_tool(
            "identify_accessibility_evidence_gaps",
            {"candidate_json": "not json"},
        )
        assert bad_json.is_error is True
        assert "not valid JSON" in bad_json.content[0].text

        bad_schema = await session.call_tool(
            "draft_market_research_report",
            {"research_json": json.dumps({"schema_version": "9.9.9"})},
        )
        assert bad_schema.is_error is True
        assert "schema version" in bad_schema.content[0].text.lower()

        openacr = (ROOT / "examples/openacr.sample.yaml").read_text()
        catalog = (ROOT / "examples/openacr.catalog.sample.yaml").read_text()
        imported = await session.call_tool(
            "import_openacr_report",
            {"openacr_yaml": openacr, "catalog_yaml": catalog},
        )
        assert imported.is_error is False
        payload = json.loads(imported.content[0].text)
        assert payload["summary"]["missing"] == 1
        assert payload["catalog_completeness"]["missing_criteria"] == [
            {"chapter": "success_criteria_level_a", "id": "2.1.1"}
        ]
        assert payload["conformance_determination"] is False

        metadata = (ROOT / "examples/adapters/codejson.sample.json").read_text()
        normalized = await session.call_tool(
            "normalize_public_metadata",
            {"metadata_text": metadata, "metadata_format": "codejson", "repository": "example-org/example-benefits"},
        )
        assert normalized.is_error is False
        assert json.loads(normalized.content[0].text)["adapter_id"] == "code.json"

    _run_session(check)
