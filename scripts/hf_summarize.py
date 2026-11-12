"""Optional manual HF demonstration on a fictional, explicitly public fixture.

No browser keys. No real procurement documents. No automatic publication.
This is not a factual research or accessibility evaluation engine.
"""
import json
import os
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / "examples/ditap-case-management.json"


def main():
    token = os.environ.get("HF_TOKEN", "")
    model = os.environ.get("HF_MODEL", "")
    if not token or not model:
        raise SystemExit("Set HF_TOKEN and HF_MODEL. No default model or token is included.")
    data = json.loads(FIXTURE.read_text(encoding="utf-8"))
    if data.get("demonstration_only") is not True:
        raise SystemExit("Refusing to submit non-fictional research to an external model")
    public_input = {
        "project": data["project"],
        "fictional_candidates": [
            {"name": c["name"], "approach": c["approach"], "accessibility_claim": c["accessibility_claim"]}
            for c in data["candidates"]
        ],
    }
    instruction = (
        "This is a fictional DITAP training example. Write 3 short neutral research "
        "questions for agency discovery and 3 evidence gaps. Do not declare "
        "Section 508 conformance, vendor suitability, or exception approval. "
        "No new product facts and no fabricated citations."
    )
    body = json.dumps({
        "model": model,
        "max_tokens": 500,
        "temperature": 0,
        "messages": [
            {"role": "system", "content": instruction},
            {"role": "user", "content": json.dumps(public_input)},
        ],
    }).encode("utf-8")
    req = Request(
        "https://router.huggingface.co/v1/chat/completions",
        data=body,
        method="POST",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    )
    with urlopen(req, timeout=45) as response:
        result = json.load(response)
    message = result["choices"][0]["message"].get("content", "")
    outfile = ROOT / "_outputs/hf-demo-summary.json"
    outfile.parent.mkdir(parents=True, exist_ok=True)
    outfile.write_text(json.dumps({
        "demonstration_only": True,
        "unverified_ai_output": True,
        "model": model,
        "source_fixture": "examples/ditap-case-management.json",
        "summary": message,
    }, indent=2) + "\n", encoding="utf-8")
    print("Created an unverified demo-only artifact. No live sources queried.")


if __name__ == "__main__":
    main()
