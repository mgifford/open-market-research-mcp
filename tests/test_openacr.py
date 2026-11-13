import json
from pathlib import Path

import pytest
import yaml

from omr_mcp.openacr import MISSING, OpenACRError, parse_openacr_yaml

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / "examples/openacr.sample.yaml"
CATALOG = ROOT / "examples/openacr.catalog.sample.yaml"


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


def test_document_is_checked_against_the_pinned_upstream_schema():
    with pytest.raises(OpenACRError, match="schema validation failed"):
        parse_openacr_yaml(
            "title: Test\nproduct: {name: Demo}\nauthor: {email: test@example.invalid}\nversion: one"
        )
    with pytest.raises(OpenACRError, match="schema validation failed"):
        parse_openacr_yaml(
            "product: {name: Demo}\nauthor: {email: test@example.invalid}"
        )


def test_no_catalog_leaves_completeness_unknown(parsed):
    completeness = parsed["catalog_completeness"]
    assert completeness["catalog_supplied"] is False
    assert completeness["complete"] is None
    assert completeness["criteria_reported"] == 5
    assert parsed["summary"]["catalog_criteria_missing"] is None


def test_catalog_detects_missing_criteria(parsed):
    catalog = yaml.safe_load(CATALOG.read_text(encoding="utf-8"))
    checked = parse_openacr_yaml(FIXTURE.read_text(encoding="utf-8"), catalog=catalog)
    completeness = checked["catalog_completeness"]
    assert completeness["catalog_supplied"] is True
    assert completeness["criteria_expected"] == 6
    assert completeness["criteria_reported"] == 5
    assert completeness["missing_criteria"] == [{"chapter": "success_criteria_level_a", "id": "2.1.1"}]
    assert completeness["complete"] is False
    assert checked["summary"]["catalog_criteria_missing"] == 1
    assert any("documentation gap, not a failure" in limitation for limitation in checked["limitations"])


def test_catalog_detects_unexpected_criteria():
    catalog = {
        "title": "Tiny catalog",
        "chapters": [{"id": "success_criteria_level_a", "criteria": [{"id": "1.1.1"}]}],
    }
    checked = parse_openacr_yaml(FIXTURE.read_text(encoding="utf-8"), catalog=catalog)
    completeness = checked["catalog_completeness"]
    assert completeness["missing_criteria"] == []
    assert len(completeness["unexpected_criteria"]) == 4
    assert completeness["complete"] is False


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


def test_upstream_catalog_finds_large_gaps_when_installed():
    catalog_path = ROOT / "node_modules/@openacr/openacr/catalog/2.4-edition-wcag-2.1-508-en.yaml"
    if not catalog_path.exists():
        pytest.skip("Install npm dev dependencies to compare against the upstream catalog")
    catalog = yaml.safe_load(catalog_path.read_text(encoding="utf-8"))
    checked = parse_openacr_yaml(FIXTURE.read_text(encoding="utf-8"), catalog=catalog)
    completeness = checked["catalog_completeness"]
    assert completeness["catalog_supplied"] is True
    assert completeness["criteria_expected"] > 5
    assert any(item["id"] == "2.1.1" for item in completeness["missing_criteria"])
    assert completeness["complete"] is False
    assert checked["summary"]["catalog_criteria_missing"] > 0


def test_fixture_matches_the_pinned_upstream_schema():
    from jsonschema import Draft7Validator

    schema_path = ROOT / "src/omr_mcp/schemas/openacr-0.1.0.json"
    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    document = yaml.safe_load(FIXTURE.read_text(encoding="utf-8"))
    Draft7Validator(schema).validate(document)
