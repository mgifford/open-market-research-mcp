"""Normalize publiccode.yml metadata without assuming reuse rights."""

from __future__ import annotations

from typing import Any

from .provenance import provenance

LIMITATIONS = (
    "publiccode.yml is project-supplied metadata and may be incomplete or stale.",
    "A declared license does not by itself establish that the project is suitable or reusable for an acquisition.",
)


def _localized(value: Any) -> str:
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        english = value.get("en")
        if isinstance(english, dict):
            for key in ("shortDescription", "longDescription", "genericName"):
                if english.get(key):
                    return str(english[key])
        for candidate in value.values():
            if isinstance(candidate, dict):
                for key in ("shortDescription", "longDescription", "genericName"):
                    if candidate.get(key):
                        return str(candidate[key])
    return ""


def normalize_publiccode(
    data: dict[str, Any],
    *,
    retrieved_at: str | None = None,
    source_url: str = "",
) -> dict[str, Any]:
    if not isinstance(data, dict):
        raise ValueError("publiccode.yml must be an object")
    name = data.get("name")
    if not isinstance(name, str) or not name.strip():
        raise ValueError("publiccode.yml needs a name")

    legal = data.get("legal") if isinstance(data.get("legal"), dict) else {}
    maintenance = data.get("maintenance") if isinstance(data.get("maintenance"), dict) else {}
    organisation = data.get("organisation") if isinstance(data.get("organisation"), dict) else {}
    url = str(data.get("url") or "")
    landing_url = str(data.get("landingURL") or "")
    license_name = str(legal.get("license") or "") or None
    result = {
        "name": name.strip()[:300],
        "description": _localized(data.get("description"))[:1500],
        "url": url[:2000],
        "landing_url": landing_url[:2000],
        "software_version": str(data.get("softwareVersion") or "")[:150],
        "release_date": str(data.get("releaseDate") or "")[:100],
        "maintenance_type": str(maintenance.get("type") or "")[:100],
        "organisation": str(organisation.get("name") or organisation.get("uri") or "")[:300],
        "publiccode_yml_version": str(data.get("publiccodeYmlVersion") or "")[:20],
        "legal": {"license": license_name} if license_name else {},
    }
    result.update(
        provenance(
            adapter_id="publiccode.yml",
            authority="public-repository",
            source_url=source_url or url or landing_url,
            retrieved_at=retrieved_at,
            source_as_of=result["release_date"] or None,
            evidence_type="metadata",
            license_name=license_name,
            access_rights="public",
            limitations=LIMITATIONS,
        )
    )
    return result
