"""Apply one mapped USAspending record to a local research file.

This is an explicit, local-only operation. It does not call the network. The
`--approve` flag is required because the selected record must be reviewed by a
person before it becomes part of the research record.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from omr_mcp.integrations import apply_mapped_record


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--research", required=True, type=Path)
    parser.add_argument("--mapped", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--approve", action="store_true", help="Confirm a person reviewed the selected record")
    args = parser.parse_args()
    if not args.approve:
        parser.error("--approve is required after human review")
    research = json.loads(args.research.read_text(encoding="utf-8"))
    mapped = json.loads(args.mapped.read_text(encoding="utf-8"))
    updated = apply_mapped_record(research, mapped, approved=True)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(updated, indent=2) + "\n", encoding="utf-8")
    print(f"Applied one selected record to {args.out}")


if __name__ == "__main__":
    main()
