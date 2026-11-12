import json
from pathlib import Path

import pytest
from jsonschema import Draft202012Validator

from omr_mcp.engine import (
    build_report,
    evidence_questions,
    is_https_link,
    market_research_plan,
    search_sources,
    source_catalog,
    validate_research,
)

ROOT = Path(__file__).resolve().parents[1]


def test_sources_are_unique_and_secure():
    sources = source_catalog()
    assert len(sources) >= 12
    assert len({s["id"] for s in sources}) == len(sources)
    assert all(is_https_link(s["url"]) for s in sources)
    assert search_sources(term="OpenACR")
    assert search_sources(category="software-reuse")
    assert len(market_research_plan()) == 6


def test_demo_matches_schema():
    sample = json.loads((ROOT / "examples/ditap-case-management.json").read_text())
    schema = json.loads((ROOT / "schemas/research.schema.json").read_text())
    Draft202012Validator(schema).validate(sample)
    validate_research(sample)


def test_report_does_not_approve_or_rank_vendors():
    sample = json.loads((ROOT / "examples/ditap-case-management.json").read_text())
    report = build_report(sample)
    assert "Draft research notes" in report
    assert "fictional examples" in report
    assert "Not a solicitation" in report
    assert "Request a current" in report
    assert "Fictional commercial case management system" in report
    assert "approved" in report.lower()
    assert "Recommended supplier" not in report


def test_missing_evidence_not_a_failure():
    questions = evidence_questions({"name": "X", "accessibility_claim": "not-evaluated"})
    assert any("not that the option has failed" in q for q in questions)
    assert any("not independently" in q for q in evidence_questions({"name": "X", "accessibility_claim": "supports"}))


def test_rejects_unsafe_urls():
    for u in ["javascript:alert(1)", "http://example.com", "https://name:secret@example.com"]:
        assert not is_https_link(u)
    sample = json.loads((ROOT / "examples/ditap-case-management.json").read_text())
    sample["candidates"][0]["url"] = "javascript:alert(1)"
    with pytest.raises(ValueError, match="HTTPS"):
        validate_research(sample)


def test_public_metadata_snapshot():
    from scripts.verify_catalog import verify
    assert verify() >= 1


def test_normalize_code_json_handles_usage_and_missing_fields():
    from scripts.refresh_public_code import normalize
    raw = {
        "name": "Demo", "permissions": {"usageType": "openSource", "licenses": [{"name": "MIT"}]},
        "date": {"metadataLastUpdated": "2026-11-01"}
    }
    row = normalize(raw, "DSACMS/demo")
    assert row["usage_type"] == ["openSource"]
    assert row["license_names"] == ["MIT"]
    assert row["metadata_url"].startswith("https://github.com/")
