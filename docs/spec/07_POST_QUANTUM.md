# 07 · Post-Quantum Attestations

## 1. Why (the argument for judges)
Forest carbon credits make claims about 30–100 years. Attestations signed today with elliptic-curve signatures (ECDSA/EdDSA) could become forgeable once large quantum computers can run Shor's algorithm. An attacker could then forge "historic" verification records ("forge-later"). Long-lived climate records should be signed with a NIST post-quantum signature standard now.

## 2. What we use
- **ML-DSA-65** (NIST FIPS 204, module-lattice signatures; formerly CRYSTALS-Dilithium level 3) via **liboqs-python** `[VERIFY algorithm string in installed version: "ML-DSA-65" in recent liboqs; older builds use "Dilithium3"]`.
- Hybrid: every attestation is covered by **both** ML-DSA-65 (manifest signature) and ECDSA (the Ethereum transaction that anchors its hash). Breaking one does not break the record.

## 3. What is signed
The canonical bytes of `manifest.json` with the `signatures` field removed:
- JSON canonicalisation: RFC 8785 (JCS) or sorted keys + no whitespace + UTF-8 (pick one, document it, test it).
- `manifestHash = sha256(canonical_bytes)`; this hash goes on-chain in `submitScore`.

## 4. Key management
- Oracle generates an ML-DSA-65 keypair; secret key stored in a secrets manager / encrypted file (never in repo).
- Public key uploaded to IPFS; `PQKeyRegistry.registerKey("ML-DSA-65", sha256(pubKey), "ipfs://…")`.
- Rotation: register new key, revoke old; old signatures remain verifiable against the historical key record.

## 5. Code (`ai/pq/sign_verify.py`)
```python
import oqs, json, hashlib, base64

ALG = "ML-DSA-65"

def canonical(manifest: dict) -> bytes:
    m = {k: v for k, v in manifest.items() if k != "signatures"}
    return json.dumps(m, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()

def keygen() -> tuple[bytes, bytes]:
    with oqs.Signature(ALG) as s:
        pk = s.generate_keypair()
        sk = s.export_secret_key()
    return pk, sk

def sign(manifest: dict, sk: bytes) -> str:
    with oqs.Signature(ALG, secret_key=sk) as s:
        return base64.b64encode(s.sign(canonical(manifest))).decode()

def verify(manifest: dict, sig_b64: str, pk: bytes) -> bool:
    with oqs.Signature(ALG) as s:
        return s.verify(canonical(manifest), base64.b64decode(sig_b64), pk)
```

## 6. Verification UX
- **Verify page** (`/verify`): choose a submission → frontend fetches manifest + signature + public key from IPFS, checks `sha256(pubKey)` against `PQKeyRegistry`, `sha256(canonical)` against the on-chain `manifestHash`, and the ML-DSA signature (backend endpoint `POST /verify/pq` in MVP; WASM in-browser verification is P1).
- Show a comparison card with **measured** sizes and timings: ECDSA secp256k1 vs ML-DSA-65 (key size, signature size, sign/verify time). Reference sizes from FIPS 204 for ML-DSA-65: public key 1952 B, signature 3309 B `[VERIFY]`; measure timings yourself.

## 7. Honest scope statement (put on `/security` page and README)
| Element | Quantum-safe? |
|---|---|
| Manifest attestations (ML-DSA-65) | ✅ Yes (NIST PQ standard) |
| Hash commitments (SHA-256, keccak256) | ✅ Considered safe with sufficient output size (Grover only halves security) |
| Ethereum transaction signatures (ECDSA) | ❌ No; outside our control; roadmap: PQ account abstraction |
| zk proofs (Halo2 + KZG) | ❌ No (pairing-based); roadmap: hash-based STARK proofs |
| Overall | Records are **double-anchored**; forging history requires breaking both ML-DSA and the chain |

## 8. Roadmap
- On-chain ML-DSA verification (expensive on EVM today; consider precompile proposals or verifying inside a STARK).
- STARK-based zkML for inference proofs.
- PQ wallets via account abstraction (ERC-4337-style smart accounts with PQ signature validation).
