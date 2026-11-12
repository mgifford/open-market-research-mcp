"""Normalize a local public metadata fixture for review. No network calls."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import yaml

from omr_mcp.adapters import (
    normalize_agency_index,
    normalize_code_json,
    normalize_publiccode,
)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--format", required=True, choices=("codejson", "agency-index", "publiccode"))
    parser.add_argument("--file", required=True, type=Path)
    parser.add_argument("--repository", default="", help="owner/name for a single code.json file")
    parser.add_argument("--source-url", default="", help="Public URL the fixture came from")
    parser.add_argument("--out", type=Path, help="Write JSON here instead of stdout")
    args = parser.parse_args()

    text = args.file.read_text(encoding="utf-8")
    if args.format == "publiccode":
        data = yaml.safe_load(text)
    else:
        data = json.loads(text)

    if args.format == "codejson":
        if not args.repository:
            parser.error("--repository is required for codejson")
        result = normalize_code_json(data, args.repository, source_url=args.source_url or None)
    elif args.format == "agency-index":
        result = normalize_agency_index(data, source_url=args.source_url)
    else:
        result = normalize_publiccode(data, source_url=args.source_url)

    output = json.dumps(result, indent=2) + "\n"
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(output, encoding="utf-8")
        print(f"Wrote {args.out}")
    else:
        print(output, end="")


if __name__ == "__main__":
    main()
