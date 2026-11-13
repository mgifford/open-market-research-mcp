import copy
import json
from pathlib import Path

import pytest

from omr_mcp.engine import build_report, prepare_research
from omr_mcp.integrations import apply_mapped_record, map_usaspending_award

ROOT = Path(__file__).resolve().parents[1]
AWARD = json.loads((ROOT / "examples/integrations/usaspending-award.sample.json").read_text())
RESEARCH = json.loads((ROOT / "examples/ditap-case-management.json").read_text())


def mapped():
    return map_usaspending_award(
        AWARD,
        question_id="rq-commercial",
        retrieved_at="2026-11-12T10:00",
        source_url="https://example.gov/usaspending/FICTIONAL-AWARD-001",
    )


def test_mapping_preserves_source_dates_and_neutral_claim():
    result = mapped()
    search = result["search"]
    evidence = result["evidence"]
    assert result["integration"]["requires_user_approval"] is True
    assert result["integration"]["network_access"] is False
    assert search["status"] == "completed-with-results"
    assert search["method"] == "mcp"
    assert search["source_as_of"] == "2026-10-30"
    assert evidence["evidence_type"] == "official-record"
    assert evidence["source_identifier"] == "FAKE-2020-001"
    assert evidence["retrieved_at"] == "2026-11-12T10:00"
    assert "Fictional Civic Systems LLC" in evidence["claim"]
    assert "does not establish current capability" in evidence["limitations"]
    assert result["source_record"]["award_amount"] == 1250000


def test_required_fields_are_not_invented():
    with pytest.raises(ValueError, match="Award ID"):
        map_usaspending_award({}, question_id="rq-commercial", retrieved_at="2026-11-12")
    with pytest.raises(ValueError, match="retrieved_at"):
        map_usaspending_award(AWARD, question_id="rq-commercial", retrieved_at="")
    with pytest.raises(ValueError, match="question_id"):
        map_usaspending_award(AWARD, question_id="", retrieved_at="2026-11-12")
    with pytest.raises(ValueError, match="HTTPS"):
        map_usaspending_award(
            AWARD, question_id="rq-commercial", retrieved_at="2026-11-12", source_url="http://example.gov/award"
        )


def test_application_requires_explicit_approval():
    with pytest.raises(ValueError, match="approval"):
        apply_mapped_record(RESEARCH, mapped())


def test_applied_record_is_valid_and_appears_in_report():
    updated = apply_mapped_record(RESEARCH, mapped(), approved=True)
    prepare_research(updated)
    search = next(item for item in updated["searches"] if item["id"].startswith("search-1102tools"))
    evidence = next(item for item in updated["evidence"] if item["id"].startswith("ev-1102tools"))
    assert search["question_id"] == "rq-commercial"
    assert evidence["search_id"] == search["id"]
    report = build_report(updated)
    assert "FAKE-2020-001" in report
    assert "Fictional Civic Systems LLC" in report
    assert "recommended supplier" not in report.lower()


def test_application_rejects_unknown_question_and_duplicate_record():
    with pytest.raises(ValueError, match="existing research question"):
        apply_mapped_record(RESEARCH, map_usaspending_award(
            AWARD, question_id="missing-question", retrieved_at="2026-11-12"
        ), approved=True)

    updated = apply_mapped_record(RESEARCH, mapped(), approved=True)
    with pytest.raises(ValueError, match="already present"):
        apply_mapped_record(updated, mapped(), approved=True)


def test_mapping_does_not_mutate_input():
    record = copy.deepcopy(AWARD)
    before = copy.deepcopy(record)
    map_usaspending_award(record, question_id="rq-commercial", retrieved_at="2026-11-12")
    assert record == before
