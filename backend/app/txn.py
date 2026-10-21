"""Transaction helpers: sign/send/wait and decode custom errors from the ABIs."""

from __future__ import annotations

from eth_account import Account
from web3 import Web3
from web3.exceptions import ContractCustomError

from app.chain import load_abi

ANVIL_KEYS = {
    "deployer": "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    "oracle": "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
    "resolver1": "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
    "resolver2": "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
    "resolver3": "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
    "challenger": "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
    "buyer": "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e",
}


class TxError(RuntimeError):
    pass


def _error_table() -> dict[str, str]:
    table: dict[str, str] = {}
    for name in (
        "ProjectRegistry",
        "VeriCredit",
        "BufferPool",
        "IntegrityOracle",
        "ChallengeManager",
        "ModelRegistry",
        "PQKeyRegistry",
        "RetirementRegistry",
    ):
        for item in load_abi(name):
            if item.get("type") == "error":
                sig = f"{item['name']}({','.join(i['type'] for i in item['inputs'])})"
                table[Web3.keccak(text=sig)[:4].hex()] = sig
    return table


def decode_error(data: str) -> str:
    """Return e.g. 'OverlapDetected(uint64,uint256)' for a revert data blob."""
    data = data.removeprefix("0x")
    sel = data[:8]
    for k, v in _error_table().items():
        if k.removeprefix("0x") == sel:
            return v
    return "unknown error " + sel


def send(w3: Web3, fn, private_key: str, value: int = 0, gas: int | None = None) -> dict:
    acct = Account.from_key(private_key)
    tx = {
        "from": acct.address,
        "nonce": w3.eth.get_transaction_count(acct.address),
        "value": value,
        "chainId": w3.eth.chain_id,
    }
    try:
        est = fn.estimate_gas(tx)
    except ContractCustomError as e:
        raise TxError(decode_error(str(e.args[0]) if e.args else "")) from e
    except Exception as e:
        msg = str(e)
        raise TxError(msg if len(msg) < 400 else msg[:400]) from e
    tx["gas"] = gas or int(est * 1.3)
    tx["gasPrice"] = w3.eth.gas_price
    built = fn.build_transaction(tx)
    signed = acct.sign_transaction(built)
    h = w3.eth.send_raw_transaction(signed.raw_transaction)
    rcpt = w3.eth.wait_for_transaction_receipt(h, timeout=120)
    if rcpt["status"] != 1:
        raise TxError(f"tx {h.hex()} reverted")
    return rcpt
