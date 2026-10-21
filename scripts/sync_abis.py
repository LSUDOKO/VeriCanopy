"""Copy contract ABIs from contracts/out into backend/app/abis and web/lib/abis (run after `forge build`)."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NAMES = [
    "ProjectRegistry",
    "VeriCredit",
    "RetirementRegistry",
    "BufferPool",
    "ModelRegistry",
    "PQKeyRegistry",
    "IntegrityOracle",
    "ChallengeManager",
    "IHalo2Verifier",
]
for name in NAMES:
    src = ROOT / "contracts" / "out" / f"{name}.sol" / f"{name}.json"
    abi = json.loads(src.read_text())["abi"]
    for dst in (ROOT / "backend" / "app" / "abis", ROOT / "web" / "lib" / "abis"):
        dst.mkdir(parents=True, exist_ok=True)
        (dst / f"{name}.json").write_text(json.dumps(abi, indent=1))
print("synced", len(NAMES), "ABIs")
