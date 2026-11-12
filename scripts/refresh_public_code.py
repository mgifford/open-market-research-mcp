"""Refresh a narrow, public-only CMS code.json demo catalog.

This produces a reviewable file, never a supplier recommendation or search of private systems.
Scheduled Actions upload its output as an artifact; it is not published without a commit.
"""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "data/public-software.json"
CONFIG = ROOT / "config/public-projects.json"
NAME = re.compile(r"^[A-Za-z0-9_.-]+$")


def normalize(record: dict, repository: str) -> dict:
    """Keep source metadata and claims separate from any suitability assessment."""
    if not isinstance(record, dict):
        raise ValueError("Invalid code.json metadata")
    license_rows = record.get("permissions", {}).get("licenses", [])
    usage = record.get("permissions", {}).get("usageType", [])
    if isinstance(usage, str):
        usage = [usage]
    if not isinstance(usage, list):
        usage = []
    org, repo = repository.split("/", 1)
    return {
        "id": repository,
        "name": str(record.get("name") or repo)[:300],
        "description": str(record.get("description") or "No description supplied in code.json")[:1500],
        "url": f"https://github.com/{repository}",
        "metadata_url": f"https://github.com/{repository}/blob/main/code.json",
        "organization": str(record.get("organization") or "Not stated")[:300],
        "status": str(record.get("status") or "Unknown")[:100],
        "visibility": str(record.get("repositoryVisibility") or "Unknown")[:100],
        "usage_type": [str(x)[:100] for x in usage if isinstance(x, str)],
        "license_names": [str(row.get("name", ""))[:100] for row in license_rows if isinstance(row, dict)],
        "version": str(record.get("version") or "")[:150],
        "metadata_last_updated": str(record.get("date", {}).get("metadataLastUpdated") or "Not stated")[:150],
    }


def fetch_public_codejson(repository: str) -> dict:
    org, repo = repository.split("/", 1)
    if not NAME.fullmatch(org) or not NAME.fullmatch(repo):
        raise ValueError("Repository contains invalid characters")
    url = f"https://raw.githubusercontent.com/{org}/{repo}/main/code.json"
    headers = {"User-Agent": "open-market-research-mcp/0.1.0"}
    req = Request(url, headers=headers)
    with urlopen(req, timeout=20) as response:
        contents = response.read(200001)
    if len(contents) > 200000:
        raise ValueError("code.json file exceeds 200KB")
    return json.loads(contents)


def main():
    config = json.loads(CONFIG.read_text(encoding="utf-8"))
    rows = []
    for repository in config["repositories"]:
        record = fetch_public_codejson(repository)
        rows.append(normalize(record, repository))
    output = {
        "catalog_type": "curated-public-codejson-examples",
        "scope_note": "Illustrative public CMS code.json metadata only. Not market-wide or independently verified for acquisition suitability.",
        "retrieved_at": datetime.now(timezone.utc).isoformat(),
        "entries": rows,
    }
    CATALOG.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
    print(f"Refreshed {len(rows)} public metadata records for human review")


if __name__ == "__main__":
    main()
