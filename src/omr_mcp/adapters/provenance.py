"""Thin provenance envelope shared by read-only public metadata adapters.

This is an internal envelope, not a new public metadata standard. It carries
only the fields needed to keep a normalized record inspectable alongside
code.json, agency-index.json, publiccode.yml, and OpenACR.
"""

from __future__ import annotations

from collections.abc import Iterable
from datetime import UTC, datetime
from typing import Any

AUTHORITIES = ("official", "public-repository", "vendor", "community")
EVIDENCE_TYPES = ("government-record", "product-claim", "independent-test", "metadata")
PROVENANCE_KEYS = (
    "adapter_id",
    "authority",
    "source_url",
    "retrieved_at",
    "source_as_of",
    "evidence_type",
    "license",
    "access_rights",
    "limitations",
)


def utc_now() -> str:
    return datetime.now(UTC).isoformat()


def provenance(
    *,
    adapter_id: str,
    authority: str,
    source_url: str,
    evidence_type: str,
    retrieved_at: str | None = None,
    source_as_of: str | None = None,
    license_name: str | None = None,
    access_rights: str = "public",
    limitations: Iterable[str] = (),
) -> dict[str, Any]:
    if authority not in AUTHORITIES:
        raise ValueError(f"Unsupported authority: {authority}")
    if evidence_type not in EVIDENCE_TYPES:
        raise ValueError(f"Unsupported evidence type: {evidence_type}")
    return {
        "adapter_id": adapter_id,
        "authority": authority,
        "source_url": source_url,
        "retrieved_at": retrieved_at or utc_now(),
        "source_as_of": source_as_of,
        "evidence_type": evidence_type,
        "license": license_name,
        "access_rights": access_rights,
        "limitations": list(limitations),
    }
