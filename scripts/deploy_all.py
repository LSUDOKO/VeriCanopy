"""`make deploy`: deploy Halo2Verifier (if compiled) then the stack via forge script, with the model hash and
EZKL output scale taken from the committed artifacts so the contracts decode scores exactly like the prover."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "ai" / "zk" / "artifacts"
FOUNDRY = Path.home() / ".config" / ".foundry" / "bin"


def main() -> None:
    env = dict(os.environ)
    env["PATH"] = f"{FOUNDRY}:{env['PATH']}"
    rpc = env.get("RPC_URL", "http://127.0.0.1:8545")
    key = (
        env.get("DEPLOYER_KEY")
        or "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
    )
    rep = ART / "training_report.json"
    if rep.exists():
        env["MODEL_HASH"] = json.loads(rep.read_text())["model_hash"]
    st = ART / "settings.json"
    if st.exists():
        env["OUTPUT_SCALE"] = str(json.loads(st.read_text())["model_output_scales"][0])
    vjson = ROOT / "contracts" / "verifier" / "Halo2Verifier.json"
    if (
        env.get("ZK_MODE", "onchain") == "onchain"
        and vjson.exists()
        and not env.get("VERIFIER_ADDRESS")
    ):
        sys.path.insert(0, str(ROOT / "scripts"))
        from deploy_verifier import deploy

        env["VERIFIER_ADDRESS"] = deploy(rpc, key)
        print("Halo2Verifier at", env["VERIFIER_ADDRESS"])
    else:
        env["USE_MOCK_VERIFIER"] = "true"
        print("using MockVerifier (no compiled Halo2Verifier or ZK_MODE=offchain)")
    cmd = [
        "forge",
        "script",
        "script/Deploy.s.sol",
        "--rpc-url",
        rpc,
        "--private-key",
        key,
        "--broadcast",
        "-q",
    ]
    if env.get("VERIFY_CONTRACTS") == "true":
        cmd += ["--verify"]
    subprocess.run(cmd, cwd=ROOT / "contracts", env=env, check=True)
    subprocess.run([sys.executable, str(ROOT / "scripts" / "sync_abis.py")], check=True)
    dep = json.loads(
        (ROOT / "contracts" / "deployments" / f"{_chain_id(rpc)}.json").read_text()
    )
    print(json.dumps(dep["contracts"], indent=1))


def _chain_id(rpc: str) -> int:
    from web3 import Web3

    return Web3(Web3.HTTPProvider(rpc)).eth.chain_id


if __name__ == "__main__":
    main()
