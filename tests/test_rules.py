import json
from pathlib import Path

import pytest

from omr_mcp.engine import (
    _CANDIDATE_FIELDS,
    _PROJECT_FIELDS,
    build_report,
    decision_rules,
    evidence_questions,
    is_https_link,
    validate_research,
)

ROOT = Path(__file__).resolve().parents[1]
RULES = decision_rules()


def test_rules_have_versioned_unique_questions():
    assert RULES["version"]
    assert RULES["schema_version"] == "0.1.0"
    ids = [rule["id"] for rule in RULES["questions"]]
    assert len(ids) == len(set(ids))
    for rule in RULES["questions"]:
        assert rule["when"]["type"] in {"always", "empty", "claim", "evaluation"}
        assert rule["text"].strip()


def test_validator_field_lists_are_derived_from_rules():
    assert set(_CANDIDATE_FIELDS) == {"id", "name"} | {
        spec["field"] for spec in RULES["report"]["candidate_fields"]
    }
    assert set(_PROJECT_FIELDS) == {"name"} | {
        spec["field"] for spec in RULES["report"]["project_fields"]
    }


def test_schema_and_rules_agree_on_contract():
    schema = json.loads((ROOT / "schemas/research.schema.json").read_text())
    candidate = schema["properties"]["candidates"]
    assert candidate["maxItems"] == RULES["limits"]["max_candidates"]
    properties = candidate["items"]["properties"]
    assert properties["approach"]["enum"] == RULES["approaches"]
    assert properties["accessibility_claim"]["enum"] == RULES["claims"]
    assert properties["independent_evaluation"]["enum"] == RULES["evaluations"]
    for field, limit in RULES["limits"]["candidate"].items():
        assert properties[field]["maxLength"] == limit
    for field, limit in RULES["limits"]["project"].items():
        assert schema["properties"]["project"]["properties"][field]["maxLength"] == limit


def test_question_text_comes_from_rules():
    candidate = {"accessibility_claim": "supports", "independent_evaluation": "none"}
    texts = evidence_questions(candidate)
    assert RULES["questions"][0]["text"] in texts
    assert any(rule["text"] in texts for rule in RULES["questions"] if rule["id"] == "claim-supports")


def test_report_text_comes_from_rules():
    data = {
        "schema_version": "0.1.0",
        "project": {"name": "", "need": "", "users": "", "constraints": "", "ict_type": ""},
        "candidates": [],
    }
    report = build_report(data)
    assert RULES["report"]["untitled"] in report
    assert RULES["report"]["status"] in report
    assert RULES["report"]["empty_candidates"] in report


def test_python_validator_enforces_shared_limits_and_fields():
    sample = json.loads((ROOT / "examples/ditap-case-management.json").read_text())
    validate_research(sample)

    too_long = json.loads(json.dumps(sample))
    too_long["candidates"][0]["name"] = "x" * (RULES["limits"]["candidate"]["name"] + 1)
    with pytest.raises(ValueError):
        validate_research(too_long)

    missing_id = json.loads(json.dumps(sample))
    del missing_id["candidates"][0]["id"]
    with pytest.raises(ValueError):
        validate_research(missing_id)

    extra = json.loads(json.dumps(sample))
    extra["candidates"][0]["ranking"] = 1
    with pytest.raises(ValueError, match="Unrecognized field"):
        validate_research(extra)

    unsafe = json.loads(json.dumps(sample))
    unsafe["candidates"][0]["url"] = "javascript:alert(1)"
    with pytest.raises(ValueError, match="HTTPS"):
        validate_research(unsafe)


def test_url_parser_does_not_crash_on_malformed_input():
    assert is_https_link("https://example.gov/path") is True
    assert is_https_link("https://[::1") is False
    assert is_https_link("https://user:secret@example.gov") is False
