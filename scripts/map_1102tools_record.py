"""Map one local USAspending/1102tools record into a reviewable evidence draft.

This is a local, offline mapping operation. It does not call 1102tools,
USAspending, or any other network service.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from omr_mcp.integrations import map_usaspending_award


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--file", required=True, type=Path)
    parser.add_argument("--question-id", required=True)
    parser.add_argument("--retrieved-at", required=True)
    parser.add_argument("--source-url", default="")
    parser.add_argument("--candidate-id", default="")
    parser.add_argument("--out", type=Path)
    args = parser.parse_args()
    record = json.loads(args.file.read_text(encoding="utf-8"))
    mapped = map_usaspending_award(
        record,
        question_id=args.question_id,
        retrieved_at=args.retrieved_at,
        source_url=args.source_url,
        candidate_id=args.candidate_id,
    )
    output = json.dumps(mapped, indent=2) + "\n"
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(output, encoding="utf-8")
        print(f"Wrote {args.out}")
    else:
        print(output, end="")


if __name__ == "__main__":
    main()
