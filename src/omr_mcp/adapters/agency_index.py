"""Normalize public agency-index.json inventories into provenance records."""

from __future__ import annotations

from typing import Any
from urllib.parse import urlparse

from .codejson import normalize_code_json
from .provenance import provenance

LIMITATIONS = (
    "The agency index is a published inventory, not evidence of software quality or reuse permissions.",
    "Each release inherits the limitations of its code.json metadata.",
)


def _repository_from(record: dict[str, Any]) -> str:
    for key in ("repositoryURL", "repository", "url"):
        value = record.get(key)
        if not isinstance(value, str):
            continue
        parsed = urlparse(value)
        if parsed.netloc not in {"github.com", "www.github.com"}:
            continue
        parts = [part for part in parsed.path.strip("/").split("/") if part]
        if len(parts) >= 2:
            repository = f"{parts[0]}/{parts[1].removesuffix('.git')}"
            return repository
    raise ValueError("Each agency-index release needs a GitHub repositoryURL")


def normalize_agency_index(
    data: dict[str, Any],
    *,
    retrieved_at: str | None = None,
    source_url: str = "",
) -> dict[str, Any]:
    if not isinstance(data, dict):
        raise ValueError("agency-index.json must be an object")
    agency = data.get("agency")
    releases = data.get("releases")
    if not isinstance(agency, str) or not agency.strip():
        raise ValueError("agency-index.json needs an agency")
    if not isinstance(releases, list):
        raise ValueError("agency-index.json needs a releases list")

    records = []
    for release in releases:
        if not isinstance(release, dict):
            raise ValueError("Each agency-index release must be an object")
        records.append(
            normalize_code_json(
                release,
                _repository_from(release),
                retrieved_at=retrieved_at,
            )
        )

    measurement = data.get("measurementType")
    measurement = measurement if isinstance(measurement, dict) else {}
    result = {
        "agency": agency.strip()[:100],
        "index_version": str(data.get("version") or "")[:50],
        "measurement_method": str(measurement.get("method") or "Unknown")[:50],
        "releases": records,
    }
    result.update(
        provenance(
            adapter_id="agency-index.json",
            authority="public-repository",
            source_url=source_url,
            retrieved_at=retrieved_at,
            source_as_of=None,
            evidence_type="metadata",
            license_name=None,
            access_rights="public",
            limitations=LIMITATIONS,
        )
    )
    return result
