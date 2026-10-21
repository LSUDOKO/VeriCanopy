"""Resolver tool (09 §5): `vericanopy-resolve <submissionId> --key <priv> [--vote uphold|reject] [--yes]`.

Re-runs the pipeline from the submission's manifest, diffs features and score, and (if confirmed) votes on
the open challenge for that submission.
"""

from __future__ import annotations

import argparse
import json
import sys

from vericanopy_ai.config import PipelineConfig
from vericanopy_ai.score import run as score_run

from app import ipfs
from app.chain import contracts, load_deployments
from app.chain import w3 as _w3
from app.config import REPO_ROOT
from app.db import SessionLocal
from app.models import Project as ProjectRow
from app.txn import send
from app.workers.oracle import project_from_row


def recompute(submission_id: int) -> dict:
    cs = contracts(load_deployments())
    s = cs["IntegrityOracle"].functions.getSubmission(submission_id).call()
    pid, period, cid = int(s[0]), int(s[1]), s[10]
    manifest = ipfs.get_json(cid)
    if manifest is None:
        raise SystemExit(f"manifest {cid} not available")
    m = manifest["matching"]
    cfg = PipelineConfig(
        ring_km=tuple(m["ring_km"]),
        n_t=m["n_t"],
        n_c=m["n_c"],
        seed=m["seed"],
        caliper_sd=m["caliper_sd"],
        bootstrap=m["bootstrap"],
        covariates=m["covariates"],
        carbon_fraction=manifest["constants"]["carbon_fraction"],
        forest_threshold=manifest["constants"]["forest_threshold"],
    )
    db = SessionLocal()
    row = db.get(ProjectRow, pid)
    db.close()
    if row is None:
        raise SystemExit(f"project {pid} not indexed")
    out = REPO_ROOT / "data" / "cache" / "resolver" / str(submission_id)
    r = score_run(project_from_row(row), period, cfg=cfg, out_dir=out)
    diffs = [(i, a, b) for i, (a, b) in enumerate(zip(manifest["features"], r.features)) if abs(a - b) > 1e-6]
    return {
        "submission_id": submission_id,
        "project_id": pid,
        "period": period,
        "manifest_cid": cid,
        "published_score_bps": manifest["score_bps"],
        "recomputed_score_bps_onnx": r.score_bps,
        "feature_diffs": diffs,
        "features_match": not diffs,
        "provider_published": manifest.get("provider"),
        "provider_recomputed": r.manifest.get("provider"),
    }


def main(argv=None) -> None:
    ap = argparse.ArgumentParser(prog="vericanopy-resolve")
    ap.add_argument("submission_id", type=int)
    ap.add_argument("--key", help="resolver private key (testnet only)")
    ap.add_argument(
        "--vote", choices=["uphold", "reject"], help="vote on the open challenge after recomputation"
    )
    ap.add_argument("--yes", action="store_true", help="do not ask for confirmation")
    a = ap.parse_args(argv)
    rep = recompute(a.submission_id)
    print(json.dumps(rep, indent=1))
    if not a.vote:
        return
    cs = contracts(load_deployments())
    cid = cs["ChallengeManager"].functions.openChallengeOf(a.submission_id).call()
    if cid == 0:
        print("no open challenge for this submission", file=sys.stderr)
        return
    if not a.yes:
        ans = input(f"vote {a.vote} on challenge #{cid}? [y/N] ")
        if ans.lower() != "y":
            return
    if not a.key:
        raise SystemExit("--key required to vote")
    rcpt = send(_w3(), cs["ChallengeManager"].functions.vote(cid, a.vote == "uphold"), a.key)
    print("voted; tx", "0x" + rcpt["transactionHash"].hex().removeprefix("0x"))


if __name__ == "__main__":
    main()
