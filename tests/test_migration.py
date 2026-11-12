import copy
import json
from pathlib import Path

import pytest
from jsonschema import Draft202012Validator

from omr_mcp.engine import (
    build_report,
    migrate_research,
    prepare_research,
    validate_research,
)

ROOT = Path(__file__).resolve().parents[1]
LEGACY = ROOT / "examples/ditap-case-management-0.1.0.json"
CURRENT = ROOT / "examples/ditap-case-management.json"
SCHEMA = ROOT / "schemas/research.schema.json"
LEGACY_SCHEMA = ROOT / "schemas/research-0.1.0.schema.json"


def load(path):
    return json.loads(path.read_text())


def evidence_fixture():
    data = load(CURRENT)
    data["research_questions"] = [{
        "id": "rq-1",
        "question": "Are there reusable government systems?",
        "need_link": "Reduces new development risk.",
        "category": "government-reuse",
        "status": "answered",
        "search_ids": [],
        "evidence_ids": [],
        "uncertainties": "Maintenance ownership is unconfirmed.",
    }]
    data["searches"] = [{
        "id": "search-1",
        "question_id": "rq-1",
        "source_name": "Example public inventory",
        "source_url": "https://example.gov/inventory",
        "source_type": "public-repository",
        "authority": "public-repository",
        "query": "case management",
        "filters": "public",
        "method": "manual",
        "searched_at": "2026-11-12",
        "source_as_of": "2026-10-01",
        "result_count": 1,
        "status": "completed-with-results",
        "limitations": "Example fixture only.",
        "coverage_gaps": "No commercial market scan.",
    }]
    data["evidence"] = [{
        "id": "ev-1",
        "search_id": "search-1",
        "source_name": "Example public inventory",
        "source_url": "https://example.gov/inventory/record-1",
        "source_identifier": "record-1",
        "retrieved_at": "2026-11-12",
        "source_as_of": "2026-10-01",
        "evidence_type": "government-software-metadata",
        "candidate_id": data["candidates"][0]["id"],
        "product_version": "1.0",
        "requirement_ids": [],
        "claim": "A fictional reusable system is listed.",
        "limitations": "Metadata does not establish suitability.",
        "uncertainties": "Maintenance status is unverified.",
        "verification_state": "unverified",
        "reviewer": "",
    }]
    data["findings"] = [{
        "id": "finding-1",
        "description": "A listed government system may be reusable.",
        "supporting_evidence_ids": ["ev-1"],
        "contradicting_evidence_ids": [],
        "evidence_gap": "Ownership and maintenance need confirmation.",
        "question_ids": ["rq-1"],
        "candidate_ids": [data["candidates"][0]["id"]],
        "requires_verification": True,
        "reviewer_notes": "",
    }]
    data["decisions"] = [{
        "id": "decision-1",
        "description": "Ask the owning agency about reuse and maintenance.",
        "decision_type": "reuse-rights",
        "status": "pending",
        "owner": "Example owner",
        "rationale": "Reuse rights are not established by metadata.",
        "evidence_ids": ["ev-1"],
        "due_date": "",
        "resolved_at": "",
    }]
    return prepare_research(data)


def test_legacy_and_current_fixtures_validate():
    legacy = load(LEGACY)
    current = load(CURRENT)
    Draft202012Validator(load(LEGACY_SCHEMA)).validate(legacy)
    Draft202012Validator(load(SCHEMA)).validate(current)
    validate_research(legacy)
    validate_research(current)


def test_migration_preserves_scope_and_candidates_without_inventing_history():
    legacy = load(LEGACY)
    migrated = migrate_research(legacy)
    Draft202012Validator(load(SCHEMA)).validate(migrated)
    assert migrated["project"] == legacy["project"]
    assert [candidate["id"] for candidate in migrated["candidates"]] == [candidate["id"] for candidate in legacy["candidates"]]
    assert migrated["research_questions"] == []
    assert migrated["searches"] == []
    assert migrated["evidence"] == []
    assert migrated["findings"] == []
    assert migrated["decisions"] == []
    assert migrated["accessibility_requirements"]["identified"] is False
    assert migrated["migration"]["from_schema_version"] == "0.1.0"
    assert "searches" in migrated["migration"]["unavailable_fields"]
    assert all(candidate["acr"]["evaluation_methods"] == "" for candidate in migrated["candidates"])


def test_migration_report_discloses_what_cannot_be_recovered():
    report = build_report(load(LEGACY))
    assert "Migrated from 0.1.0" in report
    assert "No search, evidence, or verification history was invented" in report


def test_reference_validation_rejects_broken_links():
    data = evidence_fixture()
    broken = copy.deepcopy(data)
    broken["searches"][0]["question_id"] = "missing-question"
    with pytest.raises(ValueError, match="unknown research question"):
        validate_research(broken)

    broken = copy.deepcopy(data)
    broken["evidence"][0]["search_id"] = "missing-search"
    with pytest.raises(ValueError, match="unknown search"):
        validate_research(broken)

    broken = copy.deepcopy(data)
    broken["findings"][0]["supporting_evidence_ids"] = ["missing-evidence"]
    with pytest.raises(ValueError, match="unknown evidence"):
        validate_research(broken)


def test_search_status_distinguishes_attempted_without_results_and_failed():
    data = evidence_fixture()
    data["searches"][0].update({"status": "completed-without-results", "result_count": 0, "searched_at": "2026-11-12"})
    validate_research(data)
    report = build_report(data)
    assert "without matching records: 1" in report

    data["searches"][0].update({"status": "failed", "result_count": None, "searched_at": "2026-11-12"})
    validate_research(data)
    assert "failed: 1" in build_report(data)

    data["searches"][0]["searched_at"] = ""
    with pytest.raises(ValueError, match="searched-at"):
        validate_research(data)


def test_missing_provenance_and_reviewer_are_rejected():
    data = evidence_fixture()
    data["evidence"][0]["retrieved_at"] = ""
    with pytest.raises(ValueError, match="Evidence needs a retrieval date"):
        validate_research(data)

    data = evidence_fixture()
    data["evidence"][0]["verification_state"] = "reviewed"
    with pytest.raises(ValueError, match="Reviewed or independently verified"):
        validate_research(data)


def test_findings_require_evidence_and_resolved_decisions_require_dates():
    data = evidence_fixture()
    data["findings"][0]["supporting_evidence_ids"] = []
    with pytest.raises(ValueError, match="supporting evidence"):
        validate_research(data)

    data = evidence_fixture()
    data["decisions"][0]["status"] = "resolved"
    data["decisions"][0]["resolved_at"] = ""
    with pytest.raises(ValueError, match="resolved date"):
        validate_research(data)


def test_acr_found_needs_a_source_or_accessibility_evidence():
    data = evidence_fixture()
    data["candidates"][0]["acr"]["found"] = True
    with pytest.raises(ValueError, match="ACR marked as found"):
        validate_research(data)


def test_duplicate_ids_are_rejected():
    data = evidence_fixture()
    data["research_questions"].append(copy.deepcopy(data["research_questions"][0]))
    with pytest.raises(ValueError, match="Duplicate research question"):
        validate_research(data)
