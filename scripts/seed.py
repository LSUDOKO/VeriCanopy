"""Register Demo Projects A, B, C on the deployed contracts (and show D being rejected). `make seed`.

Developer = deployer (anvil #0) for the demo. Project metadata (name, geometry, demo_id, start date, claimed
baseline) goes to the content-addressed store as `ipfs://<cid>` and the indexer reads it back.
"""

from __future__ import annotations

import json
import sys
from datetime import UTC, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app import ipfs
from app.chain import contracts, load_deployments
from app.chain import w3 as _w3
from app.config import REPO_ROOT, settings
from app.txn import ANVIL_KEYS, TxError, send
from app.workers.oracle import ensure_pq_key, oracle_key

DEMO = REPO_ROOT / "data" / "demo"
BATCH = 60


def seed(names=("A", "B", "C"), try_overlap=True, log=print) -> dict[str, int]:
    web3 = _w3()
    dep = load_deployments()
    cs = contracts(dep)
    reg = cs["ProjectRegistry"]
    key = (
        settings.oracle_private_key and ANVIL_KEYS["deployer"] or ANVIL_KEYS["deployer"]
    )
    import os

    key = os.environ.get("DEPLOYER_KEY") or ANVIL_KEYS["deployer"]
    ids: dict[str, int] = {}
    for name in list(names) + (["D_overlap"] if try_overlap else []):
        f = json.loads((DEMO / f"project_{name}.geojson").read_text())
        cells = json.loads((DEMO / "cells" / f"{name}.json").read_text())
        p = f["properties"]
        meta = {
            "name": p["name"],
            "demo_id": name,
            "country": p.get("country"),
            "start_date": p["start_date"],
            "claimed_baseline_rate": p["claimed_baseline_rate"],
            "description": p.get("description"),
            "geometry": f["geometry"],
            "h3_res": cells["h3_res"],
            "cell_count": cells["cell_count"],
        }
        cid = ipfs.put_json(meta)
        start_ts = int(
            datetime.fromisoformat(p["start_date"]).replace(tzinfo=UTC).timestamp()
        )
        rcpt = send(
            web3,
            reg.functions.createProject(
                bytes.fromhex(cells["geometry_sha256"][2:]),
                bytes.fromhex(cells["fine_cell_root"][2:]),
                cells["h3_res"],
                start_ts,
                int(round(p["claimed_baseline_rate"] * 10_000)),
                f"ipfs://{cid}",
            ),
            key,
        )
        pid = int(
            reg.events.ProjectCreated().process_receipt(rcpt)[0]["args"]["projectId"]
        )
        log(
            f"{name}: createProject → #{pid} ({cells['cell_count']} cells, metadata ipfs://{cid})"
        )
        all_cells = [int(c) for c in cells["cells"]]
        try:
            for i in range(0, len(all_cells), BATCH):
                send(web3, reg.functions.addCells(pid, all_cells[i : i + BATCH]), key)
            send(web3, reg.functions.activate(pid), key)
            log(f"{name}: cells added and activated")
            ids[name] = pid
        except TxError as e:
            log(f"{name}: REJECTED on-chain → {e}")
            ids[name] = -pid
    ensure_pq_key(web3, cs, oracle_key(), log)
    return ids


if __name__ == "__main__":
    print(json.dumps(seed(), indent=1))
