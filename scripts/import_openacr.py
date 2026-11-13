"""Import a local OpenACR YAML file for inspection. No network calls."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import yaml

from omr_mcp.openacr import parse_openacr_yaml


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--file", required=True, type=Path)
    parser.add_argument("--catalog", type=Path, help="Optional OpenACR catalog YAML for completeness checks")
    parser.add_argument("--out", type=Path)
    args = parser.parse_args()
    catalog = yaml.safe_load(args.catalog.read_text(encoding="utf-8")) if args.catalog else None
    result = parse_openacr_yaml(args.file.read_text(encoding="utf-8"), catalog=catalog)
    output = json.dumps(result, indent=2) + "\n"
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(output, encoding="utf-8")
        print(f"Wrote {args.out}")
    else:
        print(output, end="")


if __name__ == "__main__":
    main()
