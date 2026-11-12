"""Tolerant, read-only OpenACR YAML import for human review.

This module reads an OpenACR document; it does not create, certify, or publish
an ACR. Criteria or components without an adherence claim are reported as
``missing`` and are never treated as failures or conformance.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

import yaml

ADHERENCE_LEVELS = (
    "supports",
    "partially-supports",
    "does-not-support",
    "not-applicable",
    "not-evaluated",
)
MISSING = "missing"
CHAPTER_ORDER = (
    "success_criteria_level_a",
    "success_criteria_level_aa",
    "success_criteria_level_aaa",
    "functional_performance_criteria",
    "hardware",
    "software",
    "support_documentation_and_services",
)
MAX_BYTES = 2_000_000
LIMITATIONS = (
    "Imported from a supplier- or author-supplied OpenACR; claims are not independently verified.",
    "A missing or not-evaluated claim is not evidence of failure or nonconformance.",
    "Criteria omitted from the document cannot be inferred without the upstream catalog; compare against the catalog separately.",
    "This import is not a Section 508 conformance determination or an exception approval.",
)


class OpenACRError(ValueError):
    """Raised when input cannot be read as an OpenACR document."""


def _text(value: Any, limit: int = 5000) -> str:
    if value is None:
        return ""
    if isinstance(value, (dict, list)):
        return ""
    return str(value).strip()[:limit]


def _contact(value: Any) -> dict[str, str]:
    if not isinstance(value, dict):
        return {}
    fields = ("name", "company_name", "email", "address", "phone", "website")
    return {field: _text(value.get(field), 300) for field in fields if _text(value.get(field), 300)}


def _normalize_component(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        return {"name": "unnamed", "adherence": MISSING, "reported_level": None, "notes": ""}
    adherence = value.get("adherence")
    adherence = adherence if isinstance(adherence, dict) else {}
    reported_level = _text(adherence.get("level"), 100)
    level = reported_level if reported_level in ADHERENCE_LEVELS else MISSING
    return {
        "name": _text(value.get("name"), 100) or "unnamed",
        "adherence": level,
        "reported_level": reported_level or None,
        "notes": _text(adherence.get("notes"), 20_000),
    }


def parse_openacr_yaml(text: str) -> dict[str, Any]:
    """Parse an OpenACR YAML string into a provenance-aware inspection record."""
    if not isinstance(text, str):
        raise OpenACRError("OpenACR input must be text")
    if len(text.encode("utf-8")) > MAX_BYTES:
        raise OpenACRError(f"OpenACR input exceeds {MAX_BYTES:,} bytes")
    try:
        data = yaml.safe_load(text)
    except yaml.YAMLError as exc:
        raise OpenACRError(f"OpenACR YAML could not be parsed: {exc}") from exc
    if not isinstance(data, dict):
        raise OpenACRError("OpenACR document must be a YAML object")

    product = data.get("product")
    product = product if isinstance(product, dict) else {}
    product_name = _text(product.get("name"), 300)
    if not product_name:
        raise OpenACRError("OpenACR product.name is required")

    author = _contact(data.get("author"))
    if not author.get("email"):
        raise OpenACRError("OpenACR author.email is required")

    chapters = data.get("chapters")
    chapters = chapters if isinstance(chapters, dict) else {}
    ordered_keys = [key for key in CHAPTER_ORDER if key in chapters]
    ordered_keys.extend(key for key in chapters if key not in CHAPTER_ORDER)

    counts = {level: 0 for level in ADHERENCE_LEVELS}
    counts[MISSING] = 0
    criteria_out: list[dict[str, Any]] = []
    chapters_out: dict[str, dict[str, Any]] = {}
    for chapter_key in ordered_keys:
        chapter = chapters.get(chapter_key)
        if not isinstance(chapter, dict):
            continue
        chapters_out[chapter_key] = {
            "notes": _text(chapter.get("notes"), 10_000),
            "disabled": bool(chapter.get("disabled", False)),
        }
        criteria = chapter.get("criteria")
        if not isinstance(criteria, list):
            continue
        for criterion in criteria:
            if not isinstance(criterion, dict):
                continue
            number = _text(criterion.get("num", criterion.get("id")), 50)
            if not number:
                continue
            raw_components = criterion.get("components")
            components = [_normalize_component(item) for item in raw_components] if isinstance(raw_components, list) else []
            if not components:
                counts[MISSING] += 1
            for component in components:
                counts[component["adherence"]] += 1
            criteria_out.append({
                "id": number,
                "chapter": chapter_key,
                "components": components,
                "missing": not components or any(component["adherence"] == MISSING for component in components),
            })

    summary = {
        "criteria": len(criteria_out),
        "components": sum(counts.values()),
        "criteria_with_missing_claims": sum(1 for criterion in criteria_out if criterion["missing"]),
        **counts,
        "conformance_determination": False,
    }
    return {
        "adapter_id": "openacr",
        "authority": "vendor",
        "evidence_type": "product-claim",
        "independently_verified": False,
        "conformance_determination": False,
        "retrieved_at": datetime.now(UTC).isoformat(),
        "source_as_of": _text(data.get("report_date"), 100) or None,
        "title": _text(data.get("title"), 500) or f"{product_name} Accessibility Conformance Report",
        "product": {
            "name": product_name,
            "version": _text(product.get("version"), 150),
            "description": _text(product.get("description"), 2000),
        },
        "author": author,
        "vendor": _contact(data.get("vendor")),
        "document_version": data.get("version"),
        "report_date": _text(data.get("report_date"), 100),
        "last_modified_date": _text(data.get("last_modified_date"), 100),
        "catalog": _text(data.get("catalog"), 300),
        "evaluation_methods_used": _text(data.get("evaluation_methods_used"), 10_000),
        "notes": _text(data.get("notes"), 10_000),
        "legal_disclaimer": _text(data.get("legal_disclaimer"), 10_000),
        "license": _text(data.get("license"), 200) or None,
        "repository": _text(data.get("repository"), 2000),
        "chapters": chapters_out,
        "criteria": criteria_out,
        "summary": summary,
        "limitations": list(LIMITATIONS),
    }
