"""Copy static app and canonical data to a GitHub Pages deployment directory."""
from pathlib import Path
import json
import shutil

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
OUTPUT = ROOT / "_site"


def main():
    if OUTPUT.exists():
        shutil.rmtree(OUTPUT)
    shutil.copytree(SITE, OUTPUT, ignore=shutil.ignore_patterns("package.json"))
    data = OUTPUT / "data"
    data.mkdir(exist_ok=True)
    shutil.copy2(ROOT / "src/omr_mcp/sources.json", data / "sources.json")
    shutil.copy2(ROOT / "examples/ditap-case-management.json", data / "demo.json")
    shutil.copy2(ROOT / "data/public-software.json", data / "public-software.json")
    (OUTPUT / ".nojekyll").write_text("", encoding="utf-8")
    for path in (data / "sources.json", data / "demo.json", data / "public-software.json"):
        json.loads(path.read_text(encoding="utf-8"))
    print(f"Built static site: {OUTPUT}")


if __name__ == "__main__":
    main()
