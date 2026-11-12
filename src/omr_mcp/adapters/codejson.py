"""Normalize public CMS-style code.json records without inventing claims."""

from __future__ import annotations

import re
from typing import Any

from .provenance import provenance

REPOSITORY = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")
LIMITATIONS = (
    "Metadata is self-reported in code.json and is not independently verified.",
    "A public repository does not establish reuse rights, maintenance, or fitness for a procurement need.",
)


def valid_repository(repository: str) -> bool:
    return bool(REPOSITORY.fullmatch(repository))


def normalize_code_json(
    record: dict[str, Any],
    repository: str,
    *,
    retrieved_at: str | None = None,
    source_url: str | None = None,
) -> dict[str, Any]:
    """Return a flat, inspectable record with provenance attached."""
    if not isinstance(record, dict):
        raise ValueError("code.json record must be an object")
    if not valid_repository(repository):
        raise ValueError("Repository must use the form owner/name")

    permissions = record.get("permissions")
    permissions = permissions if isinstance(permissions, dict) else {}
    usage = permissions.get("usageType", [])
    if isinstance(usage, str):
        usage = [usage]
    if not isinstance(usage, list):
        usage = []
    license_rows = permissions.get("licenses", [])
    if not isinstance(license_rows, list):
        license_rows = []

    _, repo = repository.split("/", 1)
    licenses = [
        str(row.get("name", "")).strip()[:100]
        for row in license_rows
        if isinstance(row, dict) and str(row.get("name", "")).strip()
    ]
    visibility = str(record.get("repositoryVisibility") or "Unknown")[:100]
    date_block = record.get("date")
    date_block = date_block if isinstance(date_block, dict) else {}
    metadata_last_updated = str(date_block.get("metadataLastUpdated") or "Not stated")[:150]
    source = source_url or f"https://github.com/{repository}"

    result = {
        "id": repository,
        "name": str(record.get("name") or repo)[:300],
        "description": str(record.get("description") or "No description supplied in code.json")[:1500],
        "url": f"https://github.com/{repository}",
        "metadata_url": f"https://github.com/{repository}/blob/main/code.json",
        "organization": str(record.get("organization") or "Not stated")[:300],
        "status": str(record.get("status") or "Unknown")[:100],
        "visibility": visibility,
        "usage_type": [str(item)[:100] for item in usage if isinstance(item, str)],
        "license_names": licenses,
        "version": str(record.get("version") or "")[:150],
        "metadata_last_updated": metadata_last_updated,
    }
    result.update(
        provenance(
            adapter_id="code.json",
            authority="public-repository",
            source_url=source,
            retrieved_at=retrieved_at,
            source_as_of=None if metadata_last_updated == "Not stated" else metadata_last_updated,
            evidence_type="metadata",
            license_name=", ".join(licenses) if licenses else None,
            access_rights="public" if visibility.casefold() == "public" else "unknown",
            limitations=LIMITATIONS,
        )
    )
    return result
