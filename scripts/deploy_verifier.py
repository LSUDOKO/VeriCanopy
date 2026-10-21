"""Deploy the compiled Halo2Verifier and print its address (used by `make deploy` before Deploy.s.sol)."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

from eth_account import Account
from web3 import Web3

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "contracts" / "verifier" / "Halo2Verifier.json"


def deploy(rpc: str, key: str) -> str:
    art = json.loads(ART.read_text())
    w3 = Web3(Web3.HTTPProvider(rpc))
    acct = Account.from_key(key)
    c = w3.eth.contract(abi=art["abi"], bytecode=art["bytecode"])
    tx = c.constructor().build_transaction(
        {
            "from": acct.address,
            "nonce": w3.eth.get_transaction_count(acct.address),
            "gasPrice": w3.eth.gas_price,
            "chainId": w3.eth.chain_id,
        }
    )
    tx["gas"] = int(w3.eth.estimate_gas(tx) * 1.2)
    h = w3.eth.send_raw_transaction(acct.sign_transaction(tx).raw_transaction)
    rcpt = w3.eth.wait_for_transaction_receipt(h, timeout=180)
    assert rcpt["status"] == 1, "verifier deployment failed"
    return rcpt["contractAddress"]


if __name__ == "__main__":
    rpc = os.environ.get("RPC_URL", "http://127.0.0.1:8545")
    key = (
        os.environ.get("DEPLOYER_KEY")
        or "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
    )
    addr = deploy(rpc, key)
    print(addr if "--quiet" in sys.argv else f"Halo2Verifier deployed at {addr}")
