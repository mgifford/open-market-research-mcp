"""Verify published source catalog and example inventory structure."""
import json
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]


def verify():
    sources = json.loads((ROOT / "src/omr_mcp/sources.json").read_text())
    data = json.loads((ROOT / "data/public-software.json").read_text())
    assert sources and isinstance(data.get("entries"), list)
    assert data.get("catalog_type") == "curated-public-codejson-examples"
    assert len({x["id"] for x in sources}) == len(sources)
    assert len({x["id"] for x in data["entries"]}) == len(data["entries"])
    for row in data["entries"]:
        assert row["id"].startswith("DSACMS/")
        assert row["name"]
        for key in ("url", "metadata_url"):
            u = urlparse(row[key])
            assert u.scheme == "https" and u.netloc == "github.com"
        assert isinstance(row["usage_type"], list)
    return len(data["entries"])


if __name__ == "__main__":
    print(f"Validated {verify()} public metadata examples")
