"""Refresh a narrow, public-only CMS code.json demo catalog.

This produces a reviewable file, never a supplier recommendation or search of
private systems. Scheduled Actions upload its output as an artifact; it is not
published without a commit.
"""

from __future__ import annotations

import json
import re
from datetime import UTC, datetime
from pathlib import Path

from omr_mcp.adapters.codejson import normalize_code_json
from omr_mcp.adapters.fetch import fetch_public_text

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "data/public-software.json"
CONFIG = ROOT / "config/public-projects.json"
NAME = re.compile(r"^[A-Za-z0-9_.-]+$")


def normalize(record: dict, repository: str) -> dict:
    """Keep source metadata and claims separate from any suitability assessment."""
    return normalize_code_json(record, repository)


def fetch_public_codejson(repository: str) -> dict:
    org, repo = repository.split("/", 1)
    if not NAME.fullmatch(org) or not NAME.fullmatch(repo):
        raise ValueError("Repository contains invalid characters")
    url = f"https://raw.githubusercontent.com/{org}/{repo}/main/code.json"
    return json.loads(fetch_public_text(url, max_bytes=200_000))


def main():
    config = json.loads(CONFIG.read_text(encoding="utf-8"))
    retrieved_at = datetime.now(UTC).isoformat()
    rows = [
        normalize_code_json(fetch_public_codejson(repository), repository, retrieved_at=retrieved_at)
        for repository in config["repositories"]
    ]
    output = {
        "catalog_type": "curated-public-codejson-examples",
        "scope_note": "Illustrative public CMS code.json metadata only. Not market-wide or independently verified for acquisition suitability.",
        "retrieved_at": retrieved_at,
        "entries": rows,
    }
    CATALOG.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
    print(f"Refreshed {len(rows)} public metadata records for human review")


if __name__ == "__main__":
    main()
