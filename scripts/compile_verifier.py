"""Compile contracts/verifier/Halo2Verifier.sol with plain solc (no via-IR; EZKL verifiers use hand-written Yul that
the via-IR pipeline cannot schedule). Writes contracts/verifier/Halo2Verifier.json {abi, bytecode, deployedBytecode}."""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "contracts" / "verifier" / "Halo2Verifier.sol"
OUT = ROOT / "contracts" / "verifier" / "Halo2Verifier.json"
MAX_SIZE = 24_576


def solc_bin() -> str:
    for cand in (
        ROOT / ".venv" / "bin" / "solc",
        Path.home() / ".local/share/svm/0.8.26/solc-0.8.26",
    ):
        if Path(cand).exists():
            return str(cand)
    found = shutil.which("solc")
    if not found:
        raise SystemExit("solc not found; install solc 0.8.x or run `forge build` once so svm downloads it")
    return found


def compile_verifier() -> dict:
    std = {
        "language": "Solidity",
        "sources": {"Halo2Verifier.sol": {"content": SRC.read_text()}},
        "settings": {
            "optimizer": {"enabled": True, "runs": 1},
            "viaIR": False,
            "evmVersion": "cancun",
            "outputSelection": {"*": {"*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object"]}},
        },
    }
    r = subprocess.run(
        [solc_bin(), "--standard-json"],
        input=json.dumps(std),
        capture_output=True,
        text=True,
        check=True,
    )
    out = json.loads(r.stdout)
    errs = [e for e in out.get("errors", []) if e["severity"] == "error"]
    if errs:
        raise SystemExit("\n".join(e["formattedMessage"] for e in errs))
    c = out["contracts"]["Halo2Verifier.sol"]["Halo2Verifier"]
    art = {
        "abi": c["abi"],
        "bytecode": "0x" + c["evm"]["bytecode"]["object"],
        "deployedBytecode": "0x" + c["evm"]["deployedBytecode"]["object"],
        "deployedSize": len(c["evm"]["deployedBytecode"]["object"]) // 2,
        "solc": subprocess.run([solc_bin(), "--version"], capture_output=True, text=True)
        .stdout.strip()
        .splitlines()[-1],
    }
    OUT.write_text(json.dumps(art, indent=1))
    return art


if __name__ == "__main__":
    a = compile_verifier()
    print(f"Halo2Verifier deployed size: {a['deployedSize']} bytes (limit {MAX_SIZE})")
    if a["deployedSize"] > MAX_SIZE:
        print(
            "WARNING: exceeds EIP-170 limit; use ZK_MODE=offchain or a chain without the limit",
            file=sys.stderr,
        )
        sys.exit(2)
