"""web3 helpers: deployments file, ABIs, contract handles."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from web3 import Web3

from app.config import REPO_ROOT, settings

ABI_DIR = Path(__file__).resolve().parent / "abis"
CONTRACT_NAMES = [
    "ProjectRegistry",
    "VeriCredit",
    "RetirementRegistry",
    "BufferPool",
    "ModelRegistry",
    "PQKeyRegistry",
    "IntegrityOracle",
    "ChallengeManager",
    "Marketplace",
]


def load_deployments(path: str | None = None) -> dict:
    """Deployment addresses: `DEPLOYMENTS_JSON` env (inline JSON, for hosted services) wins over the file."""
    import os

    inline = os.environ.get("DEPLOYMENTS_JSON")
    if inline and not path:
        return json.loads(inline)
    p = Path(path or settings.deployments_file)
    if not p.is_absolute():
        p = REPO_ROOT / p
    return json.loads(p.read_text())


def load_abi(name: str) -> list:
    p = ABI_DIR / f"{name}.json"
    if not p.exists():  # fall back to the foundry build output in dev
        out = REPO_ROOT / "contracts" / "out" / f"{name}.sol" / f"{name}.json"
        return json.loads(out.read_text())["abi"]
    return json.loads(p.read_text())


@lru_cache(maxsize=1)
def w3() -> Web3:
    return Web3(Web3.HTTPProvider(settings.rpc_url, request_kwargs={"timeout": 30}))


def contracts(dep: dict | None = None) -> dict:
    dep = dep or load_deployments()
    web3 = w3()
    return {n: web3.eth.contract(address=dep["contracts"][n], abi=load_abi(n)) for n in CONTRACT_NAMES}


def explorer_tx(tx: str | None) -> str | None:
    if not tx or not settings.explorer_url:
        return None
    return settings.explorer_url.rstrip("/") + "/tx/" + tx
