import json
from pathlib import Path

import pytest
import yaml

from omr_mcp.openacr import MISSING, OpenACRError, parse_openacr_yaml

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / "examples/openacr.sample.yaml"


@pytest.fixture(scope="module")
def parsed():
    return parse_openacr_yaml(FIXTURE.read_text(encoding="utf-8"))


def test_preserves_product_evaluation_and_author_metadata(parsed):
    assert parsed["product"]["name"] == "Example Civic Forms"
    assert parsed["product"]["version"] == "1.0"
    assert parsed["report_date"] == "2026-10-15"
    assert parsed["document_version"] == 1
    assert parsed["author"]["email"] == "tester@example.invalid"
    assert parsed["evaluation_methods_used"].startswith("Fictional demonstration only")
    assert parsed["catalog"] == "2.4-edition-wcag-2.1-508-en"
    assert parsed["source_as_of"] == "2026-10-15"
    assert "success_criteria_level_a" in parsed["chapters"]


def test_distinguishes_all_adherence_states_and_missing(parsed):
    levels = {component["adherence"] for criterion in parsed["criteria"] for component in criterion["components"]}
    assert {"supports", "partially-supports", "does-not-support", "not-applicable", "not-evaluated", MISSING} <= levels
    assert parsed["summary"]["supports"] == 1
    assert parsed["summary"]["partially-supports"] == 1
    assert parsed["summary"]["does-not-support"] == 1
    assert parsed["summary"]["not-applicable"] == 3
    assert parsed["summary"]["not-evaluated"] == 1
    assert parsed["summary"][MISSING] == 1
    assert parsed["summary"]["criteria"] == 5
    assert parsed["summary"]["criteria_with_missing_claims"] == 1


def test_never_asserts_conformance_or_treats_missing_as_failure(parsed):
    assert parsed["conformance_determination"] is False
    assert parsed["summary"]["conformance_determination"] is False
    assert any("not evidence of failure" in limitation for limitation in parsed["limitations"])
    missing = next(component for criterion in parsed["criteria"] for component in criterion["components"] if component["adherence"] == MISSING)
    assert missing["reported_level"] is None


def test_rejects_invalid_yaml_and_missing_required_fields():
    with pytest.raises(OpenACRError):
        parse_openacr_yaml("not: [valid")
    with pytest.raises(OpenACRError):
        parse_openacr_yaml("- a list")
    with pytest.raises(OpenACRError, match="product.name"):
        parse_openacr_yaml("title: Test\nproduct: {}\nauthor: {email: test@example.invalid}")
    with pytest.raises(OpenACRError, match="author.email"):
        parse_openacr_yaml("title: Test\nproduct: {name: Demo}\nauthor: {}")


def test_rejects_oversized_input():
    with pytest.raises(OpenACRError, match="exceeds"):
        parse_openacr_yaml("x" * 2_000_001)


def test_fixture_matches_the_upstream_schema_when_installed():
    schema_path = ROOT / "node_modules/@openacr/openacr/schema/openacr-0.1.0.json"
    if not schema_path.exists():
        pytest.skip("Install npm dev dependencies to validate against the upstream OpenACR schema")
    from jsonschema import Draft7Validator

    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    document = yaml.safe_load(FIXTURE.read_text(encoding="utf-8"))
    Draft7Validator(schema).validate(document)
