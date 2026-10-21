"""`make demo-data`: run the scoring pipeline for Demo Projects A, B, C over 2018–2025 and write
data/demo/outputs/timeline.json for Demo Mode (F11). Outputs are labelled with their provenance
(`fixture` unless Earth Engine credentials are configured) — never presented as live satellite data."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "ai"))

from vericanopy_ai.config import FEATURE_NAMES
from vericanopy_ai.extract import load_demo_project
from vericanopy_ai.score import run

YEARS = list(range(2018, 2026))
OUT = ROOT / "data" / "demo" / "outputs"


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    timeline: dict = {
        "years": YEARS,
        "feature_names": FEATURE_NAMES,
        "projects": {},
        "provenance": None,
    }
    for name in ("A", "B", "C"):
        proj = load_demo_project(name)
        rows = {}
        for y in YEARS:
            if y < proj.start_year:
                continue
            r = run(proj, y, out_dir=OUT / name / str(y))
            rows[str(y)] = {
                "score_bps": r.score_bps,
                "reversal_tco2e": r.reversal_tco2e,
                "features": r.features,
                "provisional": r.manifest["provisional"],
                "fire_fraction": r.features[9],
                "reversal_fraction": r.features[8],
            }
            timeline["provenance"] = r.manifest.get("provenance")
            print(name, y, r.score_bps, r.reversal_tco2e, flush=True)
        timeline["projects"][name] = {
            "name": proj.name,
            "start_year": proj.start_year,
            "claimed_baseline_rate": proj.claimed_baseline_rate,
            "fire_year": proj.properties.get("fire_year"),
            "years": rows,
        }
    (OUT / "timeline.json").write_text(json.dumps(timeline, indent=1))
    print("wrote", OUT / "timeline.json")


if __name__ == "__main__":
    main()
