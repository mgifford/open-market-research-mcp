"""Deterministic, source-aware research helpers. No AI and no network calls.

Decision rules live in ``rules.json``. Schema 0.2.0 adds research questions,
searches, evidence, findings, decisions, and accessibility requirements while
continuing to accept and migrate 0.1.0 records.
"""

from __future__ import annotations

import copy
import json
import re
from collections import Counter
from datetime import UTC, datetime
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
LEGACY_VERSIONS = tuple(_RULES.get("legacy_schema_versions", ()))
PROJECT_FIELDS = ("name", *[spec["field"] for spec in _RULES["report"]["project_fields"]])
CANDIDATE_FIELDS = ("id", "name", *[spec["field"] for spec in _RULES["report"]["candidate_fields"]], "acr")
LEGACY_CANDIDATE_FIELDS = (
    "id", "name", "approach", "version", "scope", "url", "acr_url", "acr_date",
    "accessibility_claim", "independent_evaluation", "notes",
)
ACR_FIELDS = (
    "found", "product_version", "functions_covered", "publication_date",
    "evaluation_methods", "catalog_id", "completeness", "notes",
)
QUESTION_FIELDS = (
    "id", "question", "need_link", "category", "status", "search_ids",
    "evidence_ids", "uncertainties",
)
SEARCH_FIELDS = (
    "id", "question_id", "source_name", "source_url", "source_type", "authority",
    "query", "filters", "method", "searched_at", "source_as_of", "result_count",
    "status", "limitations", "coverage_gaps",
)
EVIDENCE_FIELDS = (
    "id", "search_id", "source_name", "source_url", "source_identifier",
    "retrieved_at", "source_as_of", "evidence_type", "candidate_id",
    "product_version", "requirement_ids", "claim", "limitations",
    "uncertainties", "verification_state", "reviewer",
)
FINDING_FIELDS = (
    "id", "description", "supporting_evidence_ids", "contradicting_evidence_ids",
    "evidence_gap", "question_ids", "candidate_ids", "requires_verification",
    "reviewer_notes",
)
DECISION_FIELDS = (
    "id", "description", "decision_type", "status", "owner", "rationale",
    "evidence_ids", "due_date", "resolved_at",
)
TOP_LEVEL_FIELDS = (
    "schema_version", "demonstration_only", "migration", "project",
    "accessibility_requirements", "research_questions", "searches", "evidence",
    "findings", "decisions", "candidates",
)
ACCESSIBILITY_FIELDS = ("identified", "tool", "reviewer", "as_of", "requirement_ids", "notes")
# Backward-compatible names used by tests and older callers.
_CANDIDATE_FIELDS = CANDIDATE_FIELDS
_PROJECT_FIELDS = PROJECT_FIELDS


def _format(template: str, values: dict[str, Any]) -> str:
    return re.sub(r"\{(\w+)\}", lambda match: str(values.get(match.group(1), match.group(0))), template)


def _message(name: str, **values: Any) -> str:
    return _format(_RULES["messages"][name], values)


def _label(group: str, value: str) -> str:
    return _RULES["labels"].get(group, {}).get(value, value.replace("-", " "))


def _text_fields(item: dict[str, Any], limits: dict[str, int]) -> None:
    for field, limit in limits.items():
        value = item.get(field)
        if not isinstance(value, str) or len(value) > limit:
            raise ValueError(_message("field", field=field))


def _id_list(item: dict[str, Any], field: str, max_items: int = 1000) -> list[str]:
    value = item.get(field)
    if not isinstance(value, list) or len(value) > max_items or any(not isinstance(entry, str) or len(entry) > 100 for entry in value):
        raise ValueError(_message("field", field=field))
    return value


def _unique_ids(records: list[dict[str, Any]], kind: str) -> set[str]:
    ids = [record["id"] for record in records]
    if len(ids) != len(set(ids)):
        duplicate = next(item for item, count in Counter(ids).items() if count > 1)
        raise ValueError(_message("duplicate_id", kind=kind, id=duplicate))
    return set(ids)


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


def _validate_legacy(data: dict[str, Any]) -> None:
    """Validate a 0.1.0 record without inventing 0.2.0 fields."""
    if not isinstance(data, dict) or data.get("schema_version") != "0.1.0":
        raise ValueError(_message("schema"))
    if not isinstance(data.get("demonstration_only", False), bool):
        raise ValueError(_message("demonstration"))
    project = data.get("project")
    if not isinstance(project, dict) or any(key not in PROJECT_FIELDS for key in project) or any(key not in project for key in PROJECT_FIELDS):
        raise ValueError(_message("project"))
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
        extra = next((key for key in candidate if key not in LEGACY_CANDIDATE_FIELDS), None)
        if extra:
            raise ValueError(_message("extra", field=extra))
        missing = next((key for key in LEGACY_CANDIDATE_FIELDS if key not in candidate), None)
        if missing:
            raise ValueError(_message("field", field=missing))
        if not isinstance(candidate.get("id"), str) or not candidate["id"].strip():
            raise ValueError(_message("field", field="id"))
        if candidate.get("approach") not in _RULES["approaches"]:
            raise ValueError(_message("approach"))
        if candidate.get("accessibility_claim") not in _RULES["claims"]:
            raise ValueError(_message("claim"))
        if candidate.get("independent_evaluation") not in _RULES["evaluations"]:
            raise ValueError(_message("evaluation"))
        _text_fields({key: candidate.get(key) for key in _RULES["limits"]["candidate"]}, _RULES["limits"]["candidate"])
        if not isinstance(candidate.get("name"), str) or not candidate["name"].strip():
            raise ValueError(_message("name"))
        for key in ("url", "acr_url"):
            value = candidate.get(key, "")
            if value and not is_https_link(value):
                raise ValueError(_message("url", field=key))


def _legacy_candidate_acr(candidate: dict[str, Any]) -> dict[str, Any]:
    return {
        "found": bool(candidate.get("acr_url")),
        "product_version": candidate.get("version", ""),
        "functions_covered": candidate.get("scope", ""),
        "publication_date": candidate.get("acr_date", ""),
        "evaluation_methods": "",
        "catalog_id": "",
        "completeness": "unknown",
        "notes": "",
    }


def migrate_research(data: dict[str, Any]) -> dict[str, Any]:
    """Return a 0.2.0 record, migrating 0.1.0 without inventing history."""
    if not isinstance(data, dict):
        raise ValueError(_message("schema"))
    if data.get("schema_version") == APP_VERSION:
        return copy.deepcopy(data)
    if data.get("schema_version") not in LEGACY_VERSIONS:
        raise ValueError(_message("schema"))
    _validate_legacy(data)
    migrated = {
        "schema_version": APP_VERSION,
        "demonstration_only": bool(data.get("demonstration_only", False)),
        "migration": {
            "from_schema_version": data["schema_version"],
            "migrated_at": datetime.now(UTC).isoformat(),
            "unavailable_fields": [
                "research_questions",
                "searches",
                "evidence",
                "findings",
                "decisions",
                "accessibility_requirements",
                "candidate.acr.evaluation_methods",
                "candidate.acr.catalog_id",
                "candidate.acr.completeness",
            ],
            "notes": "Legacy records contained project scope and candidate notes only. No search, evidence, or verification history was invented.",
        },
        "project": copy.deepcopy(data["project"]),
        "accessibility_requirements": {
            "identified": False,
            "tool": "",
            "reviewer": "",
            "as_of": "",
            "requirement_ids": [],
            "notes": "Not recorded in the migrated 0.1.0 record.",
        },
        "research_questions": [],
        "searches": [],
        "evidence": [],
        "findings": [],
        "decisions": [],
        "candidates": [],
    }
    for candidate in data["candidates"]:
        migrated_candidate = {key: copy.deepcopy(candidate.get(key, "")) for key in LEGACY_CANDIDATE_FIELDS}
        migrated_candidate["acr"] = _legacy_candidate_acr(candidate)
        migrated["candidates"].append(migrated_candidate)
    return migrated


def relink(data: dict[str, Any]) -> None:
    """Rebuild question link arrays from searches and evidence."""
    questions = {question["id"]: question for question in data.get("research_questions", [])}
    for question in questions.values():
        question["search_ids"] = []
        question["evidence_ids"] = []
    searches = {search["id"]: search for search in data.get("searches", [])}
    for search in searches.values():
        question = questions.get(search.get("question_id", ""))
        if question:
            question["search_ids"].append(search["id"])
    for evidence in data.get("evidence", []):
        search = searches.get(evidence.get("search_id", ""))
        question = questions.get(search.get("question_id", "")) if search else None
        if question:
            question["evidence_ids"].append(evidence["id"])


def _validate_references(data: dict[str, Any]) -> None:
    questions = data["research_questions"]
    searches = data["searches"]
    evidence = data["evidence"]
    findings = data["findings"]
    decisions = data["decisions"]
    candidates = data["candidates"]

    question_ids = _unique_ids(questions, "research question")
    search_ids = _unique_ids(searches, "search")
    evidence_ids = _unique_ids(evidence, "evidence")
    _unique_ids(findings, "finding")
    _unique_ids(decisions, "decision")
    _unique_ids(candidates, "candidate")

    for question in questions:
        for field, allowed in (("search_ids", search_ids), ("evidence_ids", evidence_ids)):
            for linked in question[field]:
                if linked not in allowed:
                    raise ValueError(_message("reference", field=field, kind="record", id=linked))
    for search in searches:
        if search["question_id"] not in question_ids:
            raise ValueError(_message("reference", field="question_id", kind="research question", id=search["question_id"]))
    for item in evidence:
        if item["search_id"] not in search_ids:
            raise ValueError(_message("reference", field="search_id", kind="search", id=item["search_id"]))
        if item.get("candidate_id") and item["candidate_id"] not in {candidate["id"] for candidate in candidates}:
            raise ValueError(_message("reference", field="candidate_id", kind="candidate", id=item["candidate_id"]))
    for finding in findings:
        for field, allowed in (("supporting_evidence_ids", evidence_ids), ("contradicting_evidence_ids", evidence_ids)):
            for linked in finding[field]:
                if linked not in allowed:
                    raise ValueError(_message("reference", field=field, kind="evidence", id=linked))
        for field, allowed in (("question_ids", question_ids), ("candidate_ids", {candidate["id"] for candidate in candidates})):
            for linked in finding[field]:
                if linked not in allowed:
                    raise ValueError(_message("reference", field=field, kind="record", id=linked))
    for decision in decisions:
        for linked in decision["evidence_ids"]:
            if linked not in evidence_ids:
                raise ValueError(_message("reference", field="evidence_ids", kind="evidence", id=linked))


def _validate_current(data: dict[str, Any]) -> None:
    if not isinstance(data, dict) or data.get("schema_version") != APP_VERSION:
        raise ValueError(_message("schema"))
    extra = next((key for key in data if key not in TOP_LEVEL_FIELDS), None)
    if extra:
        raise ValueError(_message("extra", field=extra))
    if not isinstance(data.get("demonstration_only", False), bool):
        raise ValueError(_message("demonstration"))

    project = data.get("project")
    if not isinstance(project, dict) or any(key not in PROJECT_FIELDS for key in project) or any(key not in project for key in PROJECT_FIELDS):
        raise ValueError(_message("project"))
    for key, limit in _RULES["limits"]["project"].items():
        value = project.get(key)
        if not isinstance(value, str) or len(value) > limit:
            raise ValueError(_message("project_fields"))

    accessibility = data.get("accessibility_requirements")
    if (
        not isinstance(accessibility, dict)
        or any(key not in ACCESSIBILITY_FIELDS for key in accessibility)
        or any(key not in accessibility for key in ACCESSIBILITY_FIELDS)
    ):
        raise ValueError(_message("field", field="accessibility_requirements"))
    if not isinstance(accessibility["identified"], bool):
        raise ValueError(_message("field", field="identified"))
    _text_fields({key: accessibility[key] for key in ("tool", "reviewer", "as_of", "notes")}, _RULES["limits"]["accessibility_requirements"])
    _id_list(accessibility, "requirement_ids", 500)
    if accessibility["identified"] and not (accessibility["tool"].strip() or accessibility["reviewer"].strip()):
        raise ValueError(_message("accessibility_tool"))

    max_questions = _RULES["limits"]["max_questions"]
    questions = data.get("research_questions")
    if not isinstance(questions, list) or len(questions) > max_questions:
        raise ValueError(_message("max_items", collection="research_questions", max=max_questions))
    for question in questions:
        if not isinstance(question, dict) or any(key not in QUESTION_FIELDS for key in question) or any(key not in question for key in QUESTION_FIELDS):
            raise ValueError(_message("field", field="research_questions"))
        _text_fields({key: question[key] for key in ("id", "question", "need_link", "uncertainties")}, _RULES["limits"]["question"])
        if not question["id"].strip() or not question["question"].strip():
            raise ValueError(_message("question"))
        if question["category"] not in _RULES["question_categories"]:
            raise ValueError(_message("field", field="category"))
        if question["status"] not in _RULES["question_statuses"]:
            raise ValueError(_message("question_status"))
        _id_list(question, "search_ids", 500)
        _id_list(question, "evidence_ids", 1000)

    max_searches = _RULES["limits"]["max_searches"]
    searches = data.get("searches")
    if not isinstance(searches, list) or len(searches) > max_searches:
        raise ValueError(_message("max_items", collection="searches", max=max_searches))
    for search in searches:
        if (
            not isinstance(search, dict)
            or any(key not in SEARCH_FIELDS for key in search)
            or any(key not in search for key in SEARCH_FIELDS)
        ):
            raise ValueError(_message("field", field="searches"))
        search_text_fields = ("id", "source_name", "source_url", "query", "filters", "searched_at", "source_as_of", "limitations", "coverage_gaps")
        _text_fields({key: search[key] for key in search_text_fields}, _RULES["limits"]["search"])
        if (
            not search["id"].strip()
            or not search["source_name"].strip()
            or not search["question_id"].strip()
        ):
            raise ValueError(_message("search"))
        if search["source_url"] and not is_https_link(search["source_url"]):
            raise ValueError(_message("url", field="source_url"))
        search_enums = (
            ("source_type", _RULES["source_types"]),
            ("authority", _RULES["authorities"]),
            ("method", _RULES["search_methods"]),
            ("status", _RULES["search_statuses"]),
        )
        for field, values in search_enums:
            if search[field] not in values:
                raise ValueError(_message("field", field=field))
        if search["status"] != "not-searched" and not search["searched_at"].strip():
            raise ValueError(_message("search_date"))
        if not isinstance(search["result_count"], int) and search["result_count"] is not None:
            raise ValueError(_message("field", field="result_count"))
        if isinstance(search["result_count"], int) and search["result_count"] < 0:
            raise ValueError(_message("field", field="result_count"))

    max_evidence = _RULES["limits"]["max_evidence"]
    evidence = data.get("evidence")
    if not isinstance(evidence, list) or len(evidence) > max_evidence:
        raise ValueError(_message("max_items", collection="evidence", max=max_evidence))
    for item in evidence:
        if (
            not isinstance(item, dict)
            or any(key not in EVIDENCE_FIELDS for key in item)
            or any(key not in item for key in EVIDENCE_FIELDS)
        ):
            raise ValueError(_message("field", field="evidence"))
        evidence_text_fields = (
            "id", "source_name", "source_url", "source_identifier", "retrieved_at",
            "source_as_of", "product_version", "claim", "limitations",
            "uncertainties", "reviewer",
        )
        _text_fields({key: item[key] for key in evidence_text_fields}, _RULES["limits"]["evidence"])
        if (
            not item["id"].strip()
            or not item["source_name"].strip()
            or not item["search_id"].strip()
        ):
            raise ValueError(_message("evidence"))
        if not item["retrieved_at"].strip():
            raise ValueError(_message("evidence_date"))
        if item["source_url"] and not is_https_link(item["source_url"]):
            raise ValueError(_message("url", field="source_url"))
        if item["evidence_type"] not in _RULES["evidence_types"]:
            raise ValueError(_message("evidence_type"))
        if item["verification_state"] not in _RULES["verification_states"]:
            raise ValueError(_message("verification"))
        if item["verification_state"] != "unverified" and not item["reviewer"].strip():
            raise ValueError(_message("reviewer"))
        _id_list(item, "requirement_ids", 500)

    max_findings = _RULES["limits"]["max_findings"]
    findings = data.get("findings")
    if not isinstance(findings, list) or len(findings) > max_findings:
        raise ValueError(_message("max_items", collection="findings", max=max_findings))
    for finding in findings:
        if not isinstance(finding, dict) or any(key not in FINDING_FIELDS for key in finding) or any(key not in finding for key in FINDING_FIELDS):
            raise ValueError(_message("field", field="findings"))
        _text_fields({key: finding[key] for key in ("id", "description", "evidence_gap", "reviewer_notes")}, _RULES["limits"]["finding"])
        if not finding["id"].strip() or not finding["description"].strip():
            raise ValueError(_message("finding_evidence"))
        for field in ("supporting_evidence_ids", "contradicting_evidence_ids", "question_ids", "candidate_ids"):
            _id_list(finding, field, 500)
        if not finding["supporting_evidence_ids"]:
            raise ValueError(_message("finding_evidence"))
        if not isinstance(finding["requires_verification"], bool):
            raise ValueError(_message("field", field="requires_verification"))

    max_decisions = _RULES["limits"]["max_decisions"]
    decisions = data.get("decisions")
    if not isinstance(decisions, list) or len(decisions) > max_decisions:
        raise ValueError(_message("max_items", collection="decisions", max=max_decisions))
    for decision in decisions:
        if not isinstance(decision, dict) or any(key not in DECISION_FIELDS for key in decision) or any(key not in decision for key in DECISION_FIELDS):
            raise ValueError(_message("field", field="decisions"))
        _text_fields({key: decision[key] for key in ("id", "description", "owner", "rationale", "due_date", "resolved_at")}, _RULES["limits"]["decision"])
        if not decision["id"].strip() or not decision["description"].strip():
            raise ValueError(_message("decision"))
        if decision["decision_type"] not in _RULES["decision_types"]:
            raise ValueError(_message("field", field="decision_type"))
        if decision["status"] not in _RULES["decision_statuses"]:
            raise ValueError(_message("decision_status"))
        _id_list(decision, "evidence_ids", 500)
        if decision["status"] == "resolved" and not decision["resolved_at"].strip():
            raise ValueError(_message("resolved_date"))

    max_candidates = _RULES["limits"]["max_candidates"]
    candidates = data.get("candidates")
    if not isinstance(candidates, list) or len(candidates) > max_candidates:
        raise ValueError(_message("candidates", max=max_candidates))
    accessibility_evidence_candidates = {item["candidate_id"] for item in evidence if item["evidence_type"] == "accessibility-report" and item["candidate_id"]}
    for candidate in candidates:
        if not isinstance(candidate, dict):
            raise ValueError(_message("candidate_object"))
        extra = next((key for key in candidate if key not in CANDIDATE_FIELDS), None)
        if extra:
            raise ValueError(_message("extra", field=extra))
        missing = next((key for key in CANDIDATE_FIELDS if key not in candidate), None)
        if missing:
            raise ValueError(_message("field", field=missing))
        _text_fields({key: candidate[key] for key in _RULES["limits"]["candidate"]}, _RULES["limits"]["candidate"])
        if not candidate["id"].strip() or not candidate["name"].strip():
            raise ValueError(_message("name"))
        for field, values in (("approach", _RULES["approaches"]), ("accessibility_claim", _RULES["claims"]), ("independent_evaluation", _RULES["evaluations"])):
            if candidate[field] not in values:
                raise ValueError(_message("approach" if field == "approach" else "claim" if field == "accessibility_claim" else "evaluation"))
        for key in ("url", "acr_url"):
            if candidate[key] and not is_https_link(candidate[key]):
                raise ValueError(_message("url", field=key))
        acr = candidate["acr"]
        if not isinstance(acr, dict) or any(key not in ACR_FIELDS for key in acr) or any(key not in acr for key in ACR_FIELDS):
            raise ValueError(_message("field", field="acr"))
        _text_fields({key: acr[key] for key in _RULES["limits"]["acr"]}, _RULES["limits"]["acr"])
        if not isinstance(acr["found"], bool):
            raise ValueError(_message("field", field="acr.found"))
        if acr["completeness"] not in _RULES["acr_completeness"]:
            raise ValueError(_message("field", field="acr.completeness"))
        if acr["found"] and not (candidate["acr_url"] or candidate["id"] in accessibility_evidence_candidates):
            raise ValueError(_message("acr_found"))

    _validate_references(data)


def validate_research(data: dict[str, Any]) -> None:
    """Validate a 0.1.0 or 0.2.0 research record."""
    if isinstance(data, dict) and data.get("schema_version") == "0.1.0":
        _validate_legacy(data)
        return
    _validate_current(data)


def prepare_research(data: dict[str, Any]) -> dict[str, Any]:
    """Migrate, relink, validate, and return a 0.2.0 record."""
    prepared = migrate_research(data)
    relink(prepared)
    _validate_current(prepared)
    return prepared


def market_research_plan() -> list[dict[str, str]]:
    return [
        {"phase": "Define needs", "action": "Record users, jobs to be done, outcomes, and acquisition constraints."},
        {"phase": "Plan research", "action": "Write the questions that must be answered and the sources that could answer them."},
        {"phase": "Search alternatives", "action": "Record each search, its date, source, query, and result, including no-result and failed searches."},
        {"phase": "Establish requirements", "action": "Use GSA ART and agency specialists to determine relevant Section 508 requirements."},
        {"phase": "Collect evidence", "action": "Request version-specific ACRs and record claims, dates, methods, and limitations."},
        {"phase": "Document findings", "action": "Link findings to evidence, record contradictions, and identify decisions for human review."},
    ]


def _counts(records: list[dict[str, Any]], field: str, values: tuple[str, ...] | list[str]) -> str:
    counts = Counter(record.get(field, "") for record in records)
    return "; ".join(f"{_label(f'{field}s', value)}: {counts.get(value, 0)}" for value in values)


def build_report(data: dict[str, Any]) -> str:
    """Create a plain-language, evidence-linked report for human review."""
    prepared = prepare_research(data)
    report = _RULES["report"]
    project = prepared["project"]
    questions = prepared["research_questions"]
    searches = prepared["searches"]
    evidence = prepared["evidence"]
    findings = prepared["findings"]
    decisions = prepared["decisions"]
    candidates = prepared["candidates"]
    accessibility = prepared["accessibility_requirements"]

    lines = [
        _format(report["title"], {"name": project["name"] or report["untitled"]}),
        "",
        report["status"],
        "",
        report["demonstration"][str(bool(prepared.get("demonstration_only"))).lower()],
        "",
    ]
    if prepared.get("migration"):
        lines.extend([_format(report["migration_note"], prepared["migration"]), prepared["migration"]["notes"], ""])

    lines.extend([report["headings"]["summary"], ""])
    question_counts = Counter(question["status"] for question in questions)
    search_counts = Counter(search["status"] for search in searches)
    evidence_counts = Counter(item["verification_state"] for item in evidence)
    pending_decisions = sum(1 for decision in decisions if decision["status"] != "resolved")
    question_summary = (
        f"- Research questions: {len(questions)} (answered: {question_counts.get('answered', 0)}; "
        f"in progress: {question_counts.get('in-progress', 0)}; unresolved: {question_counts.get('unresolved', 0)}; "
        f"not started: {question_counts.get('not-started', 0)})."
    )
    search_summary = (
        f"- Searches recorded: {len(searches)} (with results: {search_counts.get('completed-with-results', 0)}; "
        f"without matching records: {search_counts.get('completed-without-results', 0)}; "
        f"partial: {search_counts.get('partial', 0)}; failed: {search_counts.get('failed', 0)}; "
        f"not searched: {search_counts.get('not-searched', 0)})."
    )
    evidence_summary = (
        f"- Evidence records: {len(evidence)} (reviewed: {evidence_counts.get('reviewed', 0)}; "
        f"independently verified: {evidence_counts.get('independently-verified', 0)}; "
        f"unverified: {evidence_counts.get('unverified', 0)}; withdrawn: {evidence_counts.get('withdrawn', 0)})."
    )
    lines.extend([
        question_summary,
        search_summary,
        f"- Candidate options: {len(candidates)}.",
        evidence_summary,
        f"- Findings: {len(findings)}; decisions or follow-up items: {len(decisions)} (open: {pending_decisions}).",
        "- This is a working draft. It does not recommend a supplier, establish accessibility conformance, or approve an exception.",
        "",
    ])

    lines.extend([report["headings"]["need"], ""])
    for spec in report["project_fields"]:
        value = project.get(spec["field"]) or report["missing"]["project"]
        lines.append(f"- {spec['label']}: {value}")
    lines.extend(["", report["headings"]["research_questions"], ""])
    if not questions:
        lines.append(report["no_data"]["questions"])
    for index, question in enumerate(questions, start=1):
        lines.extend([
            f"### RQ{index}: {question['question']}",
            "",
            f"- ID: {question['id']}",
            f"- Category: {_label('question_categories', question['category'])}",
            f"- Status: {_label('question_statuses', question['status'])}",
            f"- Relationship to need: {question['need_link'] or report['missing']['default']}",
            f"- Searches: {', '.join(question['search_ids']) or 'None recorded'}",
            f"- Evidence: {', '.join(question['evidence_ids']) or 'None recorded'}",
            f"- Remaining uncertainties: {question['uncertainties'] or 'None recorded'}",
            "",
        ])

    lines.extend([report["headings"]["methodology"], ""])
    methods = Counter(search["method"] for search in searches)
    sources = Counter(search["source_type"] for search in searches)
    method_text = ", ".join(f"{_label('search_methods', key)} ({count})" for key, count in sorted(methods.items())) or "None recorded"
    source_text = ", ".join(f"{_label('source_types', key)} ({count})" for key, count in sorted(sources.items())) or "None recorded"
    lines.extend([
        f"- Search methods: {method_text}.",
        f"- Source types: {source_text}.",
        "- Only the searches recorded in this file count as investigations. A reference link is not evidence that a search was performed.",
        "- No result, no matching record, partial coverage, and a failed search are recorded as different states.",
        "",
    ])

    investigated = [search for search in searches if search["status"] != "not-searched"]
    lines.extend([report["headings"]["investigated_sources"], ""])
    if not investigated:
        lines.append(report["no_data"]["searches"])
    for search in investigated:
        lines.extend([
            f"### {search['source_name']} ({search['id']})",
            "",
            f"- Status: {_label('search_statuses', search['status'])}",
            f"- Question: {search['question_id']}",
            f"- URL: {search['source_url'] or report['missing']['default']}",
            f"- Searched: {search['searched_at'] or report['missing']['default']}",
            f"- Source as of: {search['source_as_of'] or report['missing']['default']}",
            f"- Method: {_label('search_methods', search['method'])}",
            f"- Query: {search['query'] or 'Not recorded'}",
            f"- Filters: {search['filters'] or 'Not recorded'}",
            f"- Result count: {search['result_count'] if search['result_count'] is not None else 'Not recorded'}",
            f"- Limitations: {search['limitations'] or 'None recorded'}",
            f"- Coverage gaps: {search['coverage_gaps'] or 'None recorded'}",
            "",
        ])

    lines.extend([report["headings"]["searches"], ""])
    if not searches:
        lines.append(report["no_data"]["searches"])
    for search in searches:
        lines.append(
            f"- {search['id']} | {search['source_name']} | {_label('search_statuses', search['status'])} | "
            f"searched: {search['searched_at'] or 'not recorded'} | results: {search['result_count'] if search['result_count'] is not None else 'not recorded'}"
        )
    lines.append("")

    for heading, approaches in (("reuse", ("government-reuse", "open-source")), ("commercial", ("commercial", "new-build"))):
        lines.extend([report["headings"][heading], ""])
        selected = [candidate for candidate in candidates if candidate["approach"] in approaches]
        if not selected:
            lines.append(report["no_data"]["candidates"])
        for candidate in selected:
            lines.extend(["", f"### {candidate['name']}", ""])
            for spec in report["candidate_fields"]:
                value = candidate.get(spec["field"]) or report["missing"].get(spec["field"], report["missing"]["default"])
                lines.append(f"- {spec['label']}: {value}{spec.get('suffix', '')}")
            acr = candidate["acr"]
            acr_lines = [
                f"- ACR found: {'Yes' if acr['found'] else 'No'}",
                f"- ACR product version: {acr['product_version'] or report['missing']['default']}",
                f"- ACR functions covered: {acr['functions_covered'] or report['missing']['default']}",
                f"- ACR evaluation methods: {acr['evaluation_methods'] or report['missing']['default']}",
                f"- ACR catalog / completeness: {acr['catalog_id'] or 'not recorded'} / "
                f"{_label('acr_completeness', acr['completeness'])}",
            ]
            lines.extend([*acr_lines, "", report["headings"]["questions"], ""])
            lines.extend(f"- {question}" for question in evidence_questions(candidate))
            lines.append("")

    lines.extend([report["headings"]["accessibility"], ""])
    lines.extend([
        f"- Requirements identified: {'Yes' if accessibility['identified'] else 'No'}",
        f"- Tool or process: {accessibility['tool'] or report['missing']['default']}",
        f"- Reviewer: {accessibility['reviewer'] or report['missing']['default']}",
        f"- As of: {accessibility['as_of'] or report['missing']['default']}",
        f"- Requirement identifiers: {', '.join(accessibility['requirement_ids']) or 'None recorded'}",
        f"- Notes: {accessibility['notes'] or 'None recorded'}",
    ])
    accessibility_evidence = [item for item in evidence if item["evidence_type"] in {"accessibility-report", "independent-test"}]
    if not accessibility_evidence:
        lines.append(report["no_data"]["accessibility"])
    for item in accessibility_evidence:
        lines.extend([
            f"- {item['id']} | {_label('evidence_types', item['evidence_type'])} | {item['source_name']} | retrieved: {item['retrieved_at']} | "
            f"as of: {item['source_as_of'] or 'not recorded'} | verification: {_label('verification_states', item['verification_state'])}",
        ])
    lines.append("")
    lines.append("A missing or not-evaluated ACR claim is not a failed accessibility test. A valid ACR is not a Section 508 conformance determination.")
    lines.append("")

    lines.extend([report["headings"]["findings"], ""])
    if not findings:
        lines.append(report["no_data"]["findings"])
    for index, finding in enumerate(findings, start=1):
        lines.extend([
            f"### F{index}: {finding['description']}",
            "",
            f"- ID: {finding['id']}",
            f"- Supporting evidence: {', '.join(finding['supporting_evidence_ids']) or 'None'}",
            f"- Contradictory evidence: {', '.join(finding['contradicting_evidence_ids']) or 'None recorded'}",
            f"- Evidence gaps: {finding['evidence_gap'] or 'None recorded'}",
            f"- Related questions: {', '.join(finding['question_ids']) or 'None recorded'}",
            f"- Related candidates: {', '.join(finding['candidate_ids']) or 'None recorded'}",
            f"- Further verification required: {'Yes' if finding['requires_verification'] else 'No'}",
            f"- Reviewer notes: {finding['reviewer_notes'] or 'None recorded'}",
            "",
        ])

    supplier_types = {"supplier-question", "market-engagement", "acr-request"}
    review_types = {"section-508-review", "reuse-rights", "security-privacy", "exception-review", "other"}
    for heading, decision_types in (("supplier_questions", supplier_types), ("review_items", review_types)):
        lines.extend([report["headings"][heading], ""])
        selected = [decision for decision in decisions if decision["decision_type"] in decision_types]
        if not selected:
            lines.append(report["no_data"]["decisions"])
        for decision in selected:
            lines.extend([
                f"- {decision['id']} | {_label('decision_types', decision['decision_type'])} | {_label('decision_statuses', decision['status'])} | "
                f"owner: {decision['owner'] or 'not assigned'} | due: {decision['due_date'] or 'not recorded'}",
                f"  - {decision['description']}",
                f"  - Rationale: {decision['rationale'] or 'None recorded'}",
                f"  - Evidence: {', '.join(decision['evidence_ids']) or 'None recorded'}",
            ])
        lines.append("")

    lines.extend([report["headings"]["appendix"], ""])
    if not evidence and not searches:
        lines.append(report["no_data"]["evidence"])
    for search in searches:
        lines.append(
            f"- Search {search['id']}: {search['source_name']} ({search['source_url'] or 'no URL'}), "
            f"searched {search['searched_at'] or 'not recorded'}, source as of "
            f"{search['source_as_of'] or 'not recorded'}, method "
            f"{_label('search_methods', search['method'])}, status "
            f"{_label('search_statuses', search['status'])}."
        )
    for item in evidence:
        lines.append(
            f"- Evidence {item['id']}: {item['source_name']} ({item['source_url'] or 'no URL'}), "
            f"identifier {item['source_identifier'] or 'not recorded'}, retrieved {item['retrieved_at']}, "
            f"source as of {item['source_as_of'] or 'not recorded'}, type "
            f"{_label('evidence_types', item['evidence_type'])}, verification "
            f"{_label('verification_states', item['verification_state'])}."
        )
        lines.append(f"  - Claim: {item['claim'] or 'None recorded'}")
    if prepared.get("migration"):
        migration = prepared["migration"]
        lines.append(
            f"- Migrated from {migration['from_schema_version']} on {migration['migrated_at']}. "
            f"Fields not recoverable: {', '.join(migration['unavailable_fields']) or 'none listed'}."
        )
    lines.append("")

    lines.extend([report["headings"]["review"], ""])
    lines.extend(f"- {item}" for item in report["human_review"])
    lines.extend(["", report["headings"]["reference_sources"], ""])
    lines.append("These links were not searched by this application unless a search record above says otherwise.")
    lines.extend(_format(report["source_line"], {"name": source["name"], "url": source["url"]}) for source in source_catalog())
    return "\n".join(lines) + "\n"
