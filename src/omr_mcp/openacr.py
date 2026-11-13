"""Tolerant, read-only OpenACR YAML import for human review.

This module reads an OpenACR document; it does not create, certify, or publish
an ACR. Imported documents are checked against the pinned upstream schema.
Criteria or components without an adherence claim are reported as ``missing``
and are never treated as failures or conformance.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from functools import lru_cache
from importlib.resources import files
from typing import Any

import yaml
from jsonschema import Draft7Validator

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
    "Criteria omitted from the document cannot be inferred without a supplied catalog.",
    "This import is not a Section 508 conformance determination or an exception approval.",
)


class OpenACRError(ValueError):
    """Raised when input cannot be read as an OpenACR document."""


@lru_cache(maxsize=1)
def openacr_schema() -> dict[str, Any]:
    """Return the pinned upstream OpenACR JSON schema."""
    path = files("omr_mcp").joinpath("schemas/openacr-0.1.0.json")
    return json.loads(path.read_text(encoding="utf-8"))


def _validate_schema(data: dict[str, Any]) -> None:
    errors = sorted(
        Draft7Validator(openacr_schema()).iter_errors(data),
        key=lambda error: tuple(str(part) for part in error.path),
    )
    if not errors:
        return
    details = "; ".join(
        f"{'/'.join(str(part) for part in error.path) or '<root>'}: {error.message}"
        for error in errors[:5]
    )
    suffix = f" (+{len(errors) - 5} more)" if len(errors) > 5 else ""
    raise OpenACRError(f"OpenACR schema validation failed: {details}{suffix}")


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


def _catalog_index(catalog: Any) -> dict[str, list[str]]:
    if not isinstance(catalog, dict):
        raise OpenACRError("OpenACR catalog must be an object")
    chapters = catalog.get("chapters")
    if not isinstance(chapters, list):
        raise OpenACRError("OpenACR catalog must contain a chapters list")
    index: dict[str, list[str]] = {}
    for chapter in chapters:
        if not isinstance(chapter, dict):
            continue
        chapter_id = _text(chapter.get("id"), 100)
        if not chapter_id:
            continue
        criteria = chapter.get("criteria")
        ids: list[str] = []
        if isinstance(criteria, list):
            for criterion in criteria:
                if not isinstance(criterion, dict):
                    continue
                criterion_id = _text(criterion.get("id"), 50)
                if criterion_id:
                    ids.append(criterion_id)
        index[chapter_id] = ids
    return index


def _catalog_completeness(catalog: Any, criteria: list[dict[str, Any]]) -> dict[str, Any]:
    if catalog is None:
        return {
            "catalog_supplied": False,
            "catalog_title": None,
            "criteria_expected": None,
            "criteria_reported": len(criteria),
            "missing_criteria": [],
            "unexpected_criteria": [],
            "complete": None,
            "note": "No catalog was supplied; omitted criteria cannot be detected.",
        }
    index = _catalog_index(catalog)
    expected = {
        (chapter, criterion_id)
        for chapter, ids in index.items()
        for criterion_id in ids
    }
    reported = {(criterion["chapter"], criterion["id"]) for criterion in criteria}
    missing = sorted(expected - reported)
    unexpected = sorted(reported - expected)
    return {
        "catalog_supplied": True,
        "catalog_title": _text(catalog.get("title"), 300),
        "criteria_expected": len(expected),
        "criteria_reported": len(reported),
        "missing_criteria": [{"chapter": chapter, "id": criterion_id} for chapter, criterion_id in missing],
        "unexpected_criteria": [{"chapter": chapter, "id": criterion_id} for chapter, criterion_id in unexpected],
        "complete": not missing and not unexpected,
    }


def parse_openacr_yaml(text: str, catalog: dict[str, Any] | None = None) -> dict[str, Any]:
    """Parse and schema-check an OpenACR YAML string for human inspection."""
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

    _validate_schema(data)

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

    completeness = _catalog_completeness(catalog, criteria_out)
    limitations = list(LIMITATIONS)
    if not completeness["catalog_supplied"]:
        limitations.append("No catalog was supplied; omitted criteria were not checked.")
    elif completeness["missing_criteria"]:
        limitations.append(
            f"{len(completeness['missing_criteria'])} catalog criteria were not reported; this is a documentation gap, not a failure finding."
        )

    summary = {
        "criteria": len(criteria_out),
        "components": sum(counts.values()),
        "criteria_with_missing_claims": sum(1 for criterion in criteria_out if criterion["missing"]),
        "catalog_criteria_missing": len(completeness["missing_criteria"]) if completeness["catalog_supplied"] else None,
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
        "catalog_completeness": completeness,
        "evaluation_methods_used": _text(data.get("evaluation_methods_used"), 10_000),
        "notes": _text(data.get("notes"), 10_000),
        "legal_disclaimer": _text(data.get("legal_disclaimer"), 10_000),
        "license": _text(data.get("license"), 200) or None,
        "repository": _text(data.get("repository"), 2000),
        "chapters": chapters_out,
        "criteria": criteria_out,
        "summary": summary,
        "limitations": limitations,
    }
