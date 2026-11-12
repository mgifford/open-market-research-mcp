import json
from pathlib import Path

import pytest
import yaml

from omr_mcp.adapters import (
    PROVENANCE_KEYS,
    normalize_agency_index,
    normalize_code_json,
    normalize_publiccode,
)
from omr_mcp.adapters.fetch import fetch_public_text

ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / "examples/adapters"


def assert_provenance(record):
    for key in PROVENANCE_KEYS:
        assert key in record, key
    assert record["adapter_id"]
    assert record["evidence_type"] == "metadata"
    assert record["access_rights"] in {"public", "unknown"}
    assert isinstance(record["limitations"], list) and record["limitations"]


def test_codejson_fixture_is_normalized_with_provenance():
    raw = json.loads((FIXTURES / "codejson.sample.json").read_text())
    row = normalize_code_json(raw, "example-org/example-benefits")
    assert row["name"] == "Example Benefits Portal"
    assert row["usage_type"] == ["openSource"]
    assert row["license_names"] == ["CC0-1.0"]
    assert row["source_as_of"] == "2026-10-01"
    assert row["metadata_url"] == "https://github.com/example-org/example-benefits/blob/main/code.json"
    assert row["license"] == "CC0-1.0"
    assert_provenance(row)


def test_codejson_handles_missing_and_null_fields():
    row = normalize_code_json(
        {"name": "Demo", "permissions": None, "date": None},
        "example-org/demo",
    )
    assert row["usage_type"] == []
    assert row["license_names"] == []
    assert row["source_as_of"] is None
    assert row["visibility"] == "Unknown"


def test_codejson_rejects_invalid_repository_and_record():
    with pytest.raises(ValueError):
        normalize_code_json({}, "not-a-repository")
    with pytest.raises(ValueError):
        normalize_code_json([], "example-org/demo")


def test_agency_index_preserves_agency_and_releases():
    raw = json.loads((FIXTURES / "agency-index.sample.json").read_text())
    index = normalize_agency_index(raw, source_url="https://example.gov/agency-index.json")
    assert index["agency"] == "EXAMPLE"
    assert index["measurement_method"] == "projects"
    assert len(index["releases"]) == 1
    assert index["releases"][0]["id"] == "example-org/example-benefits"
    assert index["source_url"] == "https://example.gov/agency-index.json"
    assert_provenance(index)


def test_agency_index_requires_repository_url():
    with pytest.raises(ValueError, match="repositoryURL"):
        normalize_agency_index({"agency": "EXAMPLE", "releases": [{"name": "No repo"}]})


def test_publiccode_preserves_localized_metadata():
    raw = yaml.safe_load((FIXTURES / "publiccode.sample.yml").read_text())
    row = normalize_publiccode(raw, source_url="https://github.com/example-org/example-benefits")
    assert row["name"] == "Example Benefits Portal"
    assert row["description"].startswith("Fictional public benefits portal")
    assert row["legal"]["license"] == "CC0-1.0"
    assert row["software_version"] == "1.2.0"
    assert row["maintenance_type"] == "internal"
    assert row["source_as_of"] == "2026-10-01"
    assert_provenance(row)


def test_publiccode_requires_name():
    with pytest.raises(ValueError, match="name"):
        normalize_publiccode({"publiccodeYmlVersion": "0.2"})


def test_fetch_rejects_unsafe_targets_without_network():
    for url in (
        "http://raw.githubusercontent.com/example-org/example/main/code.json",
        "https://user:secret@raw.githubusercontent.com/example-org/example/main/code.json",
        "https://example.com/code.json",
        "file:///etc/passwd",
    ):
        with pytest.raises(ValueError):
            fetch_public_text(url)
