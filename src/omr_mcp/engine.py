"""Deterministic, source-aware research helpers. No AI and no network calls.

Decision rules live in ``rules.json`` so the browser and Python implementations
share one versioned source for enums, limits, questions, and report text.
"""

from __future__ import annotations

import json
import re
from functools import lru_cache
from importlib.resources import files
from typing import Any
from urllib.parse import urlparse


@lru_cache(maxsize=1)
def decision_rules() -> dict[str, Any]:
    """Return the bundled decision rules shared with the browser app."""
    path = files("omr_mcp").joinpath("rules.json")
    return json.loads(path.read_text(encoding="utf-8"))


_RULES = decision_rules()
APP_VERSION = _RULES["schema_version"]
APPROACHES = tuple(_RULES["approaches"])
CLAIMS = tuple(_RULES["claims"])
EVALUATIONS = tuple(_RULES["evaluations"])
_CANDIDATE_FIELDS = ("id", "name", *[spec["field"] for spec in _RULES["report"]["candidate_fields"]])
_PROJECT_FIELDS = ("name", *[spec["field"] for spec in _RULES["report"]["project_fields"]])


def _format(template: str, values: dict[str, Any]) -> str:
    return re.sub(r"\{(\w+)\}", lambda match: str(values.get(match.group(1), match.group(0))), template)


def _message(name: str, **values: Any) -> str:
    return _format(_RULES["messages"][name], values)


def source_catalog() -> list[dict[str, str]]:
    """Return the bundled source directory, which also builds the static site."""
    path = files("omr_mcp").joinpath("sources.json")
    return json.loads(path.read_text(encoding="utf-8"))


def search_sources(term: str = "", category: str = "") -> list[dict[str, str]]:
    """Search descriptors, not government API responses."""
    term = term.casefold().strip()
    return [
        source for source in source_catalog()
        if (not category or source["category"] == category)
        and (not term or term in " ".join(str(v) for v in source.values()).casefold())
    ]


def is_https_link(value: str) -> bool:
    try:
        parsed = urlparse(value)
    except ValueError:
        return False
    return parsed.scheme == "https" and bool(parsed.netloc) and not parsed.username and not parsed.password


def _matches(when: dict[str, Any], candidate: dict[str, Any]) -> bool:
    kind = when.get("type")
    if kind == "always":
        return True
    if kind == "empty":
        return not candidate.get(when["field"])
    if kind == "claim":
        return candidate.get("accessibility_claim", "unknown") == when["value"]
    if kind == "evaluation":
        return candidate.get("independent_evaluation", "none") == when["value"]
    raise ValueError(f"Unknown question rule type: {kind}")


def evidence_questions(candidate: dict[str, Any]) -> list[str]:
    """Only emit questions. No vendor rankings or Section 508 determinations."""
    return [rule["text"] for rule in _RULES["questions"] if _matches(rule["when"], candidate)]


def validate_research(data: dict[str, Any]) -> None:
    """Validate the versioned research record against the shared rules."""
    if not isinstance(data, dict) or data.get("schema_version") != APP_VERSION:
        raise ValueError(_message("schema"))
    extra_top = next((key for key in data if key not in {"schema_version", "demonstration_only", "project", "candidates"}), None)
    if extra_top:
        raise ValueError(_message("extra", field=extra_top))
    if not isinstance(data.get("demonstration_only", False), bool):
        raise ValueError(_message("demonstration"))
    project = data.get("project")
    if not isinstance(project, dict):
        raise ValueError(_message("project"))
    if any(key not in _PROJECT_FIELDS for key in project) or any(key not in project for key in _PROJECT_FIELDS):
        raise ValueError(_message("project_fields"))
    for key, limit in _RULES["limits"]["project"].items():
        value = project.get(key)
        if not isinstance(value, str) or len(value) > limit:
            raise ValueError(_message("project_fields"))
    candidates = data.get("candidates")
    max_candidates = _RULES["limits"]["max_candidates"]
    if not isinstance(candidates, list) or len(candidates) > max_candidates:
        raise ValueError(_message("candidates", max=max_candidates))
    for candidate in candidates:
        if not isinstance(candidate, dict):
            raise ValueError(_message("candidate_object"))
        extra = next((key for key in candidate if key not in _CANDIDATE_FIELDS), None)
        if extra:
            raise ValueError(_message("extra", field=extra))
        missing = next((key for key in _CANDIDATE_FIELDS if key not in candidate), None)
        if missing:
            raise ValueError(_message("field", field=missing))
        candidate_id = candidate.get("id")
        if not isinstance(candidate_id, str) or not candidate_id.strip() or len(candidate_id) > _RULES["limits"]["candidate"]["id"]:
            raise ValueError(_message("field", field="id"))
        if candidate.get("approach") not in APPROACHES:
            raise ValueError(_message("approach"))
        if candidate.get("accessibility_claim") not in CLAIMS:
            raise ValueError(_message("claim"))
        if candidate.get("independent_evaluation") not in EVALUATIONS:
            raise ValueError(_message("evaluation"))
        name = candidate.get("name")
        name_limit = _RULES["limits"]["candidate"]["name"]
        if not isinstance(name, str) or not name.strip() or len(name) > name_limit:
            raise ValueError(_message("name"))
        for key, limit in _RULES["limits"]["candidate"].items():
            value = candidate.get(key)
            if not isinstance(value, str) or len(value) > limit:
                raise ValueError(_message("field", field=key))
        for key in ("url", "acr_url"):
            value = candidate.get(key, "")
            if value and not is_https_link(value):
                raise ValueError(_message("url", field=key))


def market_research_plan() -> list[dict[str, str]]:
    return [
        {"phase": "Define needs", "action": "Record users, jobs to be done, outcomes, and acquisition constraints."},
        {"phase": "Search alternatives", "action": "Review government reuse, open-source, commercial, and new-build options."},
        {"phase": "Establish requirements", "action": "Use GSA ART and agency specialists to determine relevant Section 508 requirements."},
        {"phase": "Collect evidence", "action": "Request version-specific ACRs and evaluate evidence quality and coverage."},
        {"phase": "Engage the market", "action": "Ask open, neutral questions and record missing information and response limitations."},
        {"phase": "Document research", "action": "Export sources, questions, assumptions, and decision points for human review."},
    ]


def build_report(data: dict[str, Any]) -> str:
    """Create a plain-language report for human review. Do not infer compliance."""
    validate_research(data)
    report = _RULES["report"]
    project = data["project"]
    lines = [
        _format(report["title"], {"name": project["name"] or report["untitled"]}),
        "",
        report["status"],
        "",
        report["demonstration"][str(bool(data.get("demonstration_only"))).lower()],
        "",
        report["headings"]["context"],
        "",
    ]
    for spec in report["project_fields"]:
        value = project.get(spec["field"]) or report["missing"]["project"]
        lines.append(f"- {spec['label']}: {value}")
    lines.extend(["", report["headings"]["options"], ""])
    if not data["candidates"]:
        lines.append(report["empty_candidates"])
    for index, candidate in enumerate(data["candidates"], start=1):
        lines.extend(["", f"### {index}. {candidate['name']}", ""])
        for spec in report["candidate_fields"]:
            value = candidate.get(spec["field"]) or report["missing"].get(spec["field"], report["missing"]["default"])
            lines.append(f"- {spec['label']}: {value}{spec.get('suffix', '')}")
        lines.extend(["", report["headings"]["questions"], ""])
        lines.extend(f"- {question}" for question in evidence_questions(candidate))
    lines.extend(["", report["headings"]["review"], ""])
    lines.extend(f"- {item}" for item in report["human_review"])
    lines.extend(["", report["headings"]["sources"], ""])
    lines.extend(_format(report["source_line"], {"name": source["name"], "url": source["url"]}) for source in source_catalog())
    return "\n".join(lines) + "\n"
