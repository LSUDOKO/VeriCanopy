# 05 · zkML Pipeline (EZKL / Halo2)

## 1. What the proof proves (and what it does not)

**Proven statement:** "There exist inputs `x` (16 features) such that `Poseidon(x) = H_f`, and the model with committed parameters (hash `H_m`) maps `x` to output `y`, where `y` is the published score."

| Claim | Covered by |
|---|---|
| The registered model was used, unmodified | zk proof (fixed/hashed params; verifier contract bound to the circuit) + `ModelRegistry` |
| The score follows from the committed features | zk proof |
| The features came from the stated satellite data | **Not** the zk proof → reproducible manifest + challenge game |
| The scoring rule is scientifically right | **Not** cryptography → open methodology + governance |

Put this table in the README. Honesty here is a strength with cryptography judges.

## 2. Settings
- Input visibility: **hashed** (Poseidon commitment becomes a public instance) → lets features stay off-chain while binding them. If the installed EZKL version makes this hard, use `public` inputs (16 values) as a fallback; gas rises a little.
- Param visibility: **fixed** (weights baked into the circuit, so the verifier is model-specific) → simplest binding of model ↔ verifier. `ModelRegistry` maps `modelHash → verifierAddress`.
- Output visibility: **public** (the score).
- Scale: start with `input_scale = param_scale = 7`, run calibration with representative inputs, check accuracy loss.

## 3. Steps (check exact names/flags against the installed EZKL version)
```bash
# 0. Export model
python -m vericanopy_ai.model export --out ai/zk/artifacts/model.onnx
# 1. Settings
ezkl gen-settings -M model.onnx -O settings.json --input-visibility hashed --param-visibility fixed --output-visibility public
# 2. Calibrate with real + synthetic samples
ezkl calibrate-settings -M model.onnx -D calibration.json -O settings.json --target resources
# 3. Compile
ezkl compile-circuit -M model.onnx -S settings.json --compiled-circuit model.compiled
# 4. SRS + keys
ezkl get-srs -S settings.json
ezkl setup -M model.compiled --vk-path vk.key --pk-path pk.key
# 5. Per score: witness + proof
ezkl gen-witness -D input.json -M model.compiled -O witness.json
ezkl prove -M model.compiled --witness witness.json --pk-path pk.key --proof-path proof.json
ezkl verify --proof-path proof.json --settings-path settings.json --vk-path vk.key
# 6. Solidity verifier (once per model version)
ezkl create-evm-verifier --vk-path vk.key --settings-path settings.json --sol-code-path Halo2Verifier.sol --abi-path Verifier.json
```
Prefer the Python bindings (`import ezkl`) inside `ai/zk/prove.py` for automation; they mirror the CLI. Pin the EZKL version in `requirements.txt`.

## 4. Getting calldata for the contract
- Use EZKL's encode helper for EVM calldata (in recent versions: `ezkl encode-evm-calldata` or the Python equivalent) to produce `(proofBytes, instances[])`.
- `instances` contains field elements for: feature commitment (hashed input), and the public output. Convert the output field element back to the rescaled score and check it equals `score_bps` within rounding; the contract must derive `score_bps` **from the instance**, not trust a separate argument.

## 5. Contract integration
```solidity
interface IHalo2Verifier {
    function verifyProof(bytes calldata proof, uint256[] calldata instances) external returns (bool);
}
```
`IntegrityOracle.submitScore` (see `06_SMART_CONTRACTS.md`) looks up the active verifier for the model, calls `verifyProof`, then decodes `featureCommitment = instances[0..k]` and `scoreFe = instances[last]` → `score_bps` via the documented fixed-point rule.

## 6. Known risks and fallbacks
| Risk | Mitigation |
|---|---|
| Generated verifier exceeds 24 KB contract size limit | Use EZKL's reusable/split verifier option if available; or deploy on a chain/testnet that allows it for the demo; or fallback below |
| Proving too slow/heavy | Model is tiny (<500 params); reduce scale; use `--target resources` calibration |
| Fixed-point accuracy loss | Compare ONNX float output vs proven output over 1,000 vectors; report max error; tolerance ≤ 0.5% |
| Version churn in EZKL APIs | Pin version; wrap calls in one module |
| **Fallback (documented)** | Verify proof off-chain in backend, store `keccak256(proof)` + verification result signed by oracle (ECDSA + ML-DSA). UI badge: "verified off-chain". Keep the on-chain path in the roadmap |

## 7. Benchmarks to measure and publish (`docs/BENCHMARKS.md`)
- Proof generation time and peak memory (machine spec stated)
- Proof size (bytes)
- On-chain verification gas (from `forge test --gas-report` and a real testnet tx)
- Float vs proven-output max error
Never publish numbers you did not measure.

## 8. Post-quantum note
Halo2 with KZG commitments relies on elliptic-curve pairings, so it is **not** quantum-safe. Roadmap: move to a hash-based (STARK-family) proof system for inference proofs, verified natively or with a PQ-safe path. Until then, the PQ guarantee covers attestation signatures only (see `07_POST_QUANTUM.md`).
