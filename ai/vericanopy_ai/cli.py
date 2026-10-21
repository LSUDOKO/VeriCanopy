"""Command line entry points: `python -m vericanopy_ai <command>`."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser(prog="vericanopy_ai")
    sub = ap.add_subparsers(dest="cmd", required=True)

    c = sub.add_parser("cells", help="H3 polyfill + geometry hash + fine-cell Merkle root for a GeoJSON file")
    c.add_argument("geojson")
    c.add_argument("--res", type=int, default=8)
    c.add_argument("--fine-res", type=int, default=11)
    c.add_argument("--out")

    s = sub.add_parser("score", help="run the full pipeline for a project/period")
    s.add_argument("--project", type=int, required=True)
    s.add_argument("--period", type=int, required=True)
    s.add_argument("--out-dir", default=None)

    t = sub.add_parser("train", help="train the scoring MLP and export ONNX")
    t.add_argument("--out", default=None)

    args = ap.parse_args(argv)
    if args.cmd == "cells":
        from vericanopy_ai.geometry import geometry_sha256
        from vericanopy_ai.h3cells import fine_cell_root, polyfill_cells

        g = json.loads(Path(args.geojson).read_text())
        geom = g["geometry"] if g.get("type") == "Feature" else g
        cells = polyfill_cells(geom, args.res)
        fine = polyfill_cells(geom, args.fine_res)
        out = {
            "h3_res": args.res,
            "cells": [str(x) for x in cells],
            "cell_count": len(cells),
            "fine_res": args.fine_res,
            "fine_cell_count": len(fine),
            "fine_cell_root": fine_cell_root(fine),
            "geometry_sha256": geometry_sha256(geom),
        }
        txt = json.dumps(out, indent=1)
        Path(args.out).write_text(txt) if args.out else sys.stdout.write(txt + "\n")
    elif args.cmd == "score":
        from vericanopy_ai.score import run

        r = run(args.project, args.period, out_dir=Path(args.out_dir) if args.out_dir else None)
        print(json.dumps({"score_bps": r.score_bps, "reversal_tco2e": r.reversal_tco2e, "out_dir": str(r.out_dir)}))
    elif args.cmd == "train":
        from vericanopy_ai.model import train_and_export

        rep = train_and_export(Path(args.out) if args.out else None)
        print(json.dumps(rep, indent=1))


if __name__ == "__main__":
    main()
