"""Deterministic, source-aware research helpers. No AI and no network calls."""

from __future__ import annotations

import json
from importlib.resources import files
from typing import Any
from urllib.parse import urlparse

APP_VERSION = "0.1.0"
APPROACHES = ("government-reuse", "open-source", "commercial", "new-build")
CLAIMS = ("supports", "partially-supports", "does-not-support", "not-evaluated", "unknown")
EVALUATIONS = ("none", "planned", "completed")


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
    parsed = urlparse(value)
    return parsed.scheme == "https" and bool(parsed.netloc) and not parsed.username and not parsed.password


def evidence_questions(candidate: dict[str, Any]) -> list[str]:
    """Only emit questions. No vendor rankings or Section 508 determinations."""
    questions = []
    if not candidate.get("url"):
        questions.append("Identify an authoritative product or repository source for this option.")
    if not candidate.get("version"):
        questions.append("Confirm the exact product release and configuration being evaluated.")
    if not candidate.get("acr_url"):
        questions.append("Request a current, product- and version-matched Accessibility Conformance Report (ACR).")
    if not candidate.get("acr_date"):
        questions.append("Confirm the ACR date and the scope of the evaluation.")
    claim = candidate.get("accessibility_claim", "unknown")
    if claim == "supports":
        questions.append("Vendor-reported support is not independently verified; request supporting test evidence.")
    elif claim == "partially-supports":
        questions.append("Ask which tasks are affected, the impact on users, and the remediation plan.")
    elif claim == "does-not-support":
        questions.append("Document reported barriers, affected tasks, and feasible alternatives; obtain specialist review.")
    elif claim == "not-evaluated":
        questions.append("Not evaluated means evidence is missing, not that the option has failed.")
    else:
        questions.append("The accessibility claim is unknown; obtain structured evidence before comparing accessibility.")
    state = candidate.get("independent_evaluation", "none")
    if state == "none":
        questions.append("Plan independent evaluation of critical user tasks with appropriate assistive technology.")
    elif state == "planned":
        questions.append("Obtain the evaluation plan, methods, coverage, and completion date.")
    else:
        questions.append("Locate the actual independent evaluation report; verify its scope, date, and findings.")
    questions.append("Determine whether agency Section 508 reviewers must assess any possible exceptions.")
    return questions


def validate_research(data: dict[str, Any]) -> None:
    """Cheap validation for MCP callers. GitHub Actions runs the full JSON Schema."""
    if not isinstance(data, dict) or data.get("schema_version") != APP_VERSION:
        raise ValueError("Unsupported research schema version")
    project = data.get("project")
    if not isinstance(project, dict):
        raise ValueError("Missing project")
    expected = ("name", "need", "users", "constraints", "ict_type")
    if any(not isinstance(project.get(key), str) for key in expected):
        raise ValueError("Project fields must be strings")
    candidates = data.get("candidates")
    if not isinstance(candidates, list) or len(candidates) > 100:
        raise ValueError("Candidates must be a list with at most 100 items")
    for candidate in candidates:
        if not isinstance(candidate, dict):
            raise ValueError("Candidate must be an object")
        if candidate.get("approach") not in APPROACHES:
            raise ValueError("Unrecognized approach")
        if candidate.get("accessibility_claim") not in CLAIMS:
            raise ValueError("Unrecognized accessibility claim")
        if candidate.get("independent_evaluation") not in EVALUATIONS:
            raise ValueError("Unrecognized evaluation state")
        if not isinstance(candidate.get("name"), str) or not candidate["name"].strip():
            raise ValueError("Candidate name is required")
        for key in ("url", "acr_url"):
            value = candidate.get(key, "")
            if not isinstance(value, str) or (value and not is_https_link(value)):
                raise ValueError(f"{key} must be an HTTPS URL or empty")


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
    project = data["project"]
    lines = [
        f"# Market research working report: {project['name']}",
        "",
        "**Status:** Draft research notes. Not a solicitation, Section 508 conformance determination, vendor selection, or exception approval.",
        "",
        f"**Demonstration-only data:** {'Yes, fictional examples' if data.get('demonstration_only') else 'No label; validate evidence independently'}",
        "",
        "## Acquisition context",
        "",
        f"- Need: {project['need'] or 'Not described'}",
        f"- Users: {project['users'] or 'Not described'}",
        f"- Constraints: {project['constraints'] or 'Not described'}",
        f"- ICT type: {project['ict_type'] or 'Not described'}",
        "",
        "## Market options considered",
        "",
    ]
    if not data["candidates"]:
        lines.append("No candidate options have been recorded. A completed market research report needs broader discovery and verified source records.")
    for i, c in enumerate(data["candidates"], start=1):
        lines.extend([
            "",
            f"### {i}. {c['name']}",
            "",
            f"- Approach: {c['approach']}",
            f"- Version: {c.get('version') or 'Not supplied'}",
            f"- Scope: {c.get('scope') or 'Not supplied'}",
            f"- Product source: {c.get('url') or 'Not supplied'}",
            f"- ACR source: {c.get('acr_url') or 'Not supplied'}",
            f"- ACR date: {c.get('acr_date') or 'Not supplied'}",
            f"- Accessibility claim: {c['accessibility_claim']} (unverified claim; not a finding)",
            f"- Independent evaluation: {c['independent_evaluation']} (self-reported review status)",
            f"- Notes: {c.get('notes') or 'None'}",
            "",
            "**Questions and evidence gaps:**",
            "",
        ])
        lines.extend(f"- {q}" for q in evidence_questions(c))
    lines.extend([
        "",
        "## Required human review",
        "",
        "- Confirm source completeness, especially vendors not already in federal award records.",
        "- Determine applicable Section 508 requirements using GSA ART and agency expertise.",
        "- Verify ACR claims with appropriate product-specific evidence and user testing.",
        "- Assess reuse rights, interoperability, maintainability, data portability, and total cost.",
        "- Consider procurement-specific exceptions only through the agency process; none are approved here.",
        "- Evaluate applicable digital-first public service expectations.",
        "",
        "## Reference sources (not automatically queried)",
        "",
    ])
    lines.extend(f"- [{s['name']}]({s['url']})" for s in source_catalog())
    return "\n".join(lines) + "\n"
