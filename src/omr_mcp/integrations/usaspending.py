"""Map one selected USAspending record into the research evidence model.

This module is deliberately offline. It does not call USAspending or 1102tools;
a host may retrieve a public record through the upstream 1102tools MCP and pass
only the selected record here. Applying it to a research record requires an
explicit approval flag.
"""

from __future__ import annotations

import copy
import re
from typing import Any

from ..engine import is_https_link, prepare_research

ADAPTER_ID = "1102tools.usaspending"
ADAPTER_VERSION = "0.1.0"
SOURCE_NAME = "USAspending.gov via 1102tools"
NAME = re.compile(r"[^a-z0-9]+")


def _slug(value: str) -> str:
    return NAME.sub("-", value.casefold()).strip("-")[:80] or "record"


def _money(value: Any) -> str:
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return f"${value:,.0f}"
    return "an award of unstated amount"


def map_usaspending_award(
    record: dict[str, Any],
    *,
    question_id: str,
    retrieved_at: str,
    source_url: str = "",
    candidate_id: str = "",
) -> dict[str, Any]:
    """Return a reviewable search/evidence draft for one award record."""
    if not isinstance(record, dict):
        raise ValueError("USAspending record must be an object")
    award_id = str(record.get("Award ID") or record.get("generated_internal_id") or "").strip()
    if not award_id:
        raise ValueError("USAspending record needs an Award ID or generated_internal_id")
    if not question_id.strip():
        raise ValueError("A question_id is required to preserve traceability")
    if not retrieved_at.strip():
        raise ValueError("A retrieved_at value is required; it is never inferred")

    source = source_url.strip() or f"https://example.gov/usaspending/award/{_slug(award_id)}"
    if not is_https_link(source):
        raise ValueError("source_url must be an HTTPS URL")

    source_as_of = str(record.get("Last Modified Date") or record.get("End Date") or "")
    recipient = str(record.get("Recipient Name") or "an unnamed recipient")
    agency = str(record.get("Awarding Agency") or "an unstated agency")
    description = str(record.get("Description") or "no description supplied").rstrip(".")
    amount = _money(record.get("Award Amount"))
    identifier = _slug(award_id)
    search_id = f"search-1102tools-{identifier}"
    evidence_id = f"ev-1102tools-{identifier}"

    search = {
        "id": search_id,
        "question_id": question_id,
        "source_name": SOURCE_NAME,
        "source_url": source,
        "source_type": "official",
        "authority": "official",
        "query": f"Comparable awards for {question_id}",
        "filters": "Selected public record only",
        "method": "mcp",
        "searched_at": retrieved_at,
        "source_as_of": source_as_of,
        "result_count": 1,
        "status": "completed-with-results",
        "limitations": "The researcher selected one public award record; this is not a market-wide search.",
        "coverage_gaps": "Other awards, suppliers, and market segments were not reviewed in this record.",
    }
    evidence = {
        "id": evidence_id,
        "search_id": search_id,
        "source_name": SOURCE_NAME,
        "source_url": source,
        "source_identifier": award_id,
        "retrieved_at": retrieved_at,
        "source_as_of": source_as_of,
        "evidence_type": "official-record",
        "candidate_id": candidate_id,
        "product_version": "",
        "requirement_ids": [],
        "claim": (
            f"USAspending record {award_id} reports {recipient} received {amount} "
            f"from {agency} for {description}."
        ),
        "limitations": "A historical award record does not establish current capability, current price, or market completeness.",
        "uncertainties": "The record should be reviewed against the acquisition need and the researcher's question.",
        "verification_state": "unverified",
        "reviewer": "",
    }
    return {
        "integration": {
            "adapter_id": ADAPTER_ID,
            "adapter_version": ADAPTER_VERSION,
            "mode": "fixture-or-selected-live-record",
            "requires_user_approval": True,
            "network_access": False,
            "source": "1102tools federal contracting MCPs, USAspending server",
            "note": "Mapping only. The host must obtain user approval before applying this to a research record.",
        },
        "search": search,
        "evidence": evidence,
        "source_record": {
            "award_id": award_id,
            "recipient": recipient,
            "award_amount": record.get("Award Amount"),
            "awarding_agency": agency,
            "start_date": record.get("Start Date", ""),
            "end_date": record.get("End Date", ""),
            "description": description,
            "naics": record.get("NAICS", ""),
            "psc": record.get("PSC", ""),
        },
    }


def apply_mapped_record(research: dict[str, Any], mapped: dict[str, Any], *, approved: bool = False) -> dict[str, Any]:
    """Append a mapped search/evidence pair only with explicit approval."""
    if not approved:
        raise ValueError("Explicit researcher approval is required before applying a selected record")
    if not isinstance(mapped, dict) or not isinstance(mapped.get("search"), dict) or not isinstance(mapped.get("evidence"), dict):
        raise ValueError("Mapped record must contain search and evidence objects")
    updated = copy.deepcopy(research)
    question_ids = {question.get("id") for question in updated.get("research_questions", [])}
    if mapped["search"].get("question_id") not in question_ids:
        raise ValueError("Mapped search must reference an existing research question")
    if any(search.get("id") == mapped["search"]["id"] for search in updated.get("searches", [])):
        raise ValueError("This mapped search is already present")
    if any(evidence.get("id") == mapped["evidence"]["id"] for evidence in updated.get("evidence", [])):
        raise ValueError("This mapped evidence record is already present")
    updated.setdefault("searches", []).append(copy.deepcopy(mapped["search"]))
    updated.setdefault("evidence", []).append(copy.deepcopy(mapped["evidence"]))
    return prepare_research(updated)
