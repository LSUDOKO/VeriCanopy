"""Generate contracts/src/verifiers/Halo2Verifier.sol from the circuit's verifying key (05 §3 step 6)."""

from __future__ import annotations

import json
from pathlib import Path

import ezkl

from zk.build_circuit import SETTINGS, SRS, VK, _run

OUT = Path(__file__).resolve().parents[2] / "contracts" / "verifier"


def create(reusable: bool = False) -> Path:
    OUT.mkdir(parents=True, exist_ok=True)
    sol = OUT / "Halo2Verifier.sol"
    abi = OUT / "Halo2Verifier.abi.json"
    _run(
        ezkl.create_evm_verifier,
        str(VK),
        str(SETTINGS),
        str(sol),
        str(abi),
        srs_path=str(SRS),
        reusable=reusable,
    )
    src = sol.read_text()
    # pin pragma so forge compiles it with the project's solc
    if "pragma solidity" in src:
        src = src.replace(
            src[src.index("pragma solidity") : src.index(";", src.index("pragma solidity")) + 1],
            "pragma solidity ^0.8.24;",
            1,
        )
    sol.write_text(src)
    meta = {
        "reusable": reusable,
        "bytes": sol.stat().st_size,
        "settings": json.loads(SETTINGS.read_text())["run_args"],
    }
    (OUT / "Halo2Verifier.meta.json").write_text(json.dumps(meta, indent=1))
    return sol


if __name__ == "__main__":
    import sys

    p = create(reusable="--reusable" in sys.argv)
    print(p, p.stat().st_size, "bytes")
