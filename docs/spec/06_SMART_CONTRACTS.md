# 06 · Smart Contracts

Solidity `^0.8.24`, Foundry, OpenZeppelin v5 (`AccessControl`, `Pausable`, `ReentrancyGuard`, `ERC1155`). Custom errors, NatSpec, events for every state change. **Pull payments** (withdraw pattern) for all ETH movements.

## 1. Roles (OpenZeppelin AccessControl)
| Role | Holder (MVP) | Powers |
|---|---|---|
| `DEFAULT_ADMIN_ROLE` / `GOVERNANCE_ROLE` | Safe multisig | Parameters, model registry, role grants, pause |
| `ISSUER_ROLE` | Registry operator multisig | Mint vintages |
| `ORACLE_ROLE` | Oracle service address(es) | Submit scores (with stake) |
| `RESOLVER_ROLE` | 3 independent recomputers | Vote on challenges (quorum 2) |

## 2. Parameters (governance-settable, emitted on change)
| Name | Prod default | Demo default |
|---|---|---|
| `challengeWindow` | 7 days | 5 minutes |
| `resolutionPeriod` | 7 days | 10 minutes |
| `minOracleStake` | 0.1 native | 0.001 |
| `minChallengeBond` | 0.05 native | 0.0005 |
| `resolverQuorum` | 2 | 2 |
| `impairThresholdBps` | 5000 | 5000 |
| `minIssueScoreBps` | 7000 | 7000 |
| `bufferBps` | 2000 (20%) | 2000 |

## 3. `ProjectRegistry`
**Purpose:** register projects and enforce exclusive land claims using H3 cells.

**Two-tier overlap design**
- **Tier 1 (on-chain, P0):** project land is filled with H3 cells at resolution `R_lock` (default **8**, ≈0.74 km² per cell; use 7 for very large projects). Cells are computed off-chain with centroid-containment polyfill, so adjacent non-overlapping projects normally do not share cells. Contract stores `cellOwner[cell] = projectId`; any already-owned cell reverts.
- **Tier 2 (fraud proof, P1):** project also commits `fineCellRoot` = Merkle root of sorted H3 cells at resolution 11. Anyone can call `proveOverlap(projectA, projectB, cell, proofA, proofB)`; if the same fine cell is in both trees, the later-registered project is set `Disputed`. This catches small overlaps below Tier-1 resolution without storing every fine cell.

**Gas:** each new cell costs one cold SSTORE (~22k gas). 100–200 cells per project is fine on testnet. Large projects register cells in batches (`addCells`) while status `Pending`, then `activate`.

```solidity
enum ProjectStatus { Pending, Active, UnderReview, Disputed, Retired }

struct Project {
    address developer;
    uint8   h3Res;
    ProjectStatus status;
    uint64  startDate;
    uint32  claimedBaselineBps;   // claimed annual deforestation, basis points
    uint32  cellCount;
    bytes32 geometryHash;         // sha256 of canonical GeoJSON
    bytes32 fineCellRoot;         // Merkle root of res-11 cells
    string  metadataURI;          // ipfs:// project metadata (name, PDD, geojson)
}

function createProject(bytes32 geometryHash, bytes32 fineCellRoot, uint8 h3Res,
    uint64 startDate, uint32 claimedBaselineBps, string calldata metadataURI) external returns (uint256 projectId);
function addCells(uint256 projectId, uint64[] calldata cells) external;   // developer, while Pending
function activate(uint256 projectId) external;                            // GOVERNANCE/ISSUER approval
function proveOverlap(uint256 a, uint256 b, uint64 cell, bytes32[] calldata proofA, bytes32[] calldata proofB) external;
function setStatus(uint256 projectId, ProjectStatus s) external;           // only IntegrityOracle / governance
function ownerOfCell(uint64 cell) external view returns (uint256);

error OverlapDetected(uint64 cell, uint256 existingProjectId);
error NotDeveloper(); error InvalidStatus(); error InvalidProof();
event ProjectCreated(uint256 indexed projectId, address indexed developer, bytes32 geometryHash, string metadataURI);
event CellsAdded(uint256 indexed projectId, uint256 count);
event ProjectActivated(uint256 indexed projectId);
event OverlapProven(uint256 indexed projectA, uint256 indexed projectB, uint64 cell);
event ProjectStatusChanged(uint256 indexed projectId, ProjectStatus status);
```

## 4. `ModelRegistry`
```solidity
struct ModelVersion { address verifier; string artifactsURI; bool active; uint8 featureVersion; }
function registerModel(bytes32 modelHash, address verifier, string calldata artifactsURI, uint8 featureVersion) external; // GOVERNANCE
function setActive(bytes32 modelHash, bool active) external;
function getModel(bytes32 modelHash) external view returns (ModelVersion memory);
event ModelRegistered(bytes32 indexed modelHash, address verifier, string artifactsURI);
```

## 5. `PQKeyRegistry`
```solidity
struct PQKey { address owner; string algorithm; bytes32 pubKeyHash; string pubKeyURI; bool active; }
function registerKey(string calldata algorithm, bytes32 pubKeyHash, string calldata pubKeyURI) external returns (bytes32 keyId); // keyId = keccak256(owner, pubKeyHash)
function revokeKey(bytes32 keyId) external;
event PQKeyRegistered(bytes32 indexed keyId, address indexed owner, string algorithm, bytes32 pubKeyHash);
event PQKeyRevoked(bytes32 indexed keyId);
```
Oracle submissions must reference an active key owned by the submitting oracle.

## 6. `IntegrityOracle` + `ChallengeManager`

### 6.1 Submission
```solidity
enum SubStatus { Pending, Challenged, Finalized, Rejected, Voided }
struct Submission {
    uint256 projectId; uint16 period; address oracle; uint256 stake;
    uint16  scoreBps;                 // derived from proof instances
    uint64  reversalTonnes;
    bytes32 featureCommitment;        // from proof instances
    bytes32 modelHash; bytes32 manifestHash; bytes32 pqKeyId;
    string  manifestCID;
    uint64  windowEnd; SubStatus status;
}
function submitScore(
    uint256 projectId, uint16 period, bytes32 modelHash,
    uint64 reversalTonnes, bytes32 manifestHash, string calldata manifestCID, bytes32 pqKeyId,
    bytes calldata proof, uint256[] calldata instances
) external payable returns (uint256 submissionId); // ORACLE_ROLE, msg.value >= minOracleStake
function finalize(uint256 submissionId) external; // anyone, after windowEnd if not challenged / challenge rejected
```
Rules:
- Project must be `Active` or `UnderReview`; `period` must be > last finalised period for that project.
- Model must be active; `IHalo2Verifier(model.verifier).verifyProof(proof, instances)` must return true; else revert `InvalidZkProof()`.
- `scoreBps` and `featureCommitment` are **decoded from `instances`**, never passed separately.
- Only one pending submission per project-period.
- On `finalize`: call `VeriCredit.setIntegrity(projectId, scoreBps)`; if `reversalTonnes > 0` call `BufferPool.handleReversal(projectId, reversalTonnes, period)`; return oracle stake to its withdrawable balance.

### 6.2 Challenges
```solidity
enum Reason { WrongGeometry, WrongDates, CloudContamination, BadMatching, DataTampering, Other }
function openChallenge(uint256 submissionId, Reason reason, string calldata evidenceCID) external payable returns (uint256 challengeId);
function vote(uint256 challengeId, bool uphold) external;      // RESOLVER_ROLE, once each
function resolveTimeout(uint256 challengeId) external;          // after resolutionPeriod
function withdraw() external;                                   // pull payments
```
Rules (informed by research D1–D4: make honest challenging profitable, avoid griefing and censorship):
- Only during the window; `msg.value >= max(minChallengeBond, stake / 2)`; one open challenge per submission at a time.
- **Upheld** (quorum votes uphold): submission `Rejected`; challenger receives bond + 50% of oracle stake; 50% to `insuranceTreasury`; project set `UnderReview` until a new submission finalises.
- **Rejected:** submission returns to pending and finalises at `max(windowEnd, now)`; challenger bond: 50% to oracle, 50% to treasury.
- **Timeout** (no quorum within `resolutionPeriod`): submission `Voided`, both stake and bond refunded, project `UnderReview`. This prevents a silent resolver set from forcing either outcome.
- All payouts credited to `pendingWithdrawals[addr]`.

Events: `ScoreSubmitted`, `ScoreFinalized(projectId, period, scoreBps, reversalTonnes)`, `ChallengeOpened`, `ChallengeVoted`, `ChallengeResolved(challengeId, upheld)`, `SubmissionVoided`, `Withdrawal`.

## 7. `VeriCredit` (ERC-1155)
- `tokenId = (projectId << 16) | vintageYear`.
- Integrity state per project: `scoreBps`, `IntegrityStatus { Active, UnderReview, Impaired, Frozen }`, `lastPeriod`.
```solidity
function mintVintage(uint256 projectId, uint16 vintage, address to, uint256 tonnes) external; // ISSUER_ROLE
// requires project Active and latest finalized scoreBps >= minIssueScoreBps
// mints `tonnes` to `to` and tonnes*bufferBps/10000 to BufferPool (recorded per project)
function setIntegrity(uint256 projectId, uint16 scoreBps) external;  // only IntegrityOracle
function freeze(uint256 projectId) external;                          // only BufferPool / governance
function retire(uint256 tokenId, uint256 amount, string calldata beneficiary) external returns (uint256 retirementId);
```
- `setIntegrity`: `scoreBps < impairThresholdBps` → `Impaired`, else `Active` (unless `Frozen`).
- `_update` override: block transfers of `Frozen` projects' tokens (retirement also blocked while frozen).
- `retire` burns tokens and calls `RetirementRegistry.record(...)` with the current `scoreBps`.
- `uri()` returns metadata including live integrity (served by backend `GET /metadata/{tokenId}`).

## 8. `BufferPool`
- Holds buffer tokens; tracks `bufferBalance[projectId][vintage]`.
```solidity
function handleReversal(uint256 projectId, uint64 tonnes, uint16 period) external; // only IntegrityOracle
event ProjectReversal(uint256 indexed projectId, uint16 period, uint64 tonnes, uint64 covered, uint64 shortfall);
```
- Burns from the project's buffer, oldest vintage first. If shortfall > 0 → `VeriCredit.freeze(projectId)` and record shortfall (P1: draw from a shared pool).
- Buyer notifications: the backend listens for `ProjectReversal` / `ScoreFinalized` and notifies holders and retirees of that project. (Do **not** loop over retirements on-chain; unbounded gas.)

## 9. `RetirementRegistry`
```solidity
struct Retirement { address holder; uint256 tokenId; uint256 amount; string beneficiary; uint16 scoreAtRetirement; uint64 timestamp; }
function record(...) external returns (uint256 id); // only VeriCredit
event Retired(uint256 indexed retirementId, address indexed holder, uint256 indexed tokenId, uint256 amount, uint16 scoreAtRetirement);
```

## 10. Security checklist
- [ ] Reentrancy: pull payments only; `nonReentrant` on `withdraw`, `openChallenge`, `finalize`.
- [ ] Access control on every mutating function; tests for unauthorised calls.
- [ ] Score derived from proof instances; test that a mismatched claimed score cannot be submitted.
- [ ] Period monotonicity; no replay of old proofs (bind `projectId` + `period` via manifestHash; optionally include them as public inputs in a later model version).
- [ ] `Pausable` on submissions and minting; governance-only unpause.
- [ ] Bounded loops only (cells added in caller-bounded batches).
- [ ] Slither + Foundry fuzz/invariant tests: total supply + burned + buffer accounting invariant; no tokens of `Frozen` projects move.

## 11. Foundry tests to write (minimum)
`ProjectRegistry.t.sol`: create, addCells, overlap revert, proveOverlap valid/invalid.
`IntegrityOracle.t.sol`: valid proof (use real EZKL fixture), invalid proof revert, wrong period, finalise, reversal → burn.
`ChallengeManager.t.sol`: upheld path payouts, rejected path, timeout refunds, double vote revert.
`VeriCredit.t.sol`: mint gate by score, buffer mint, frozen transfer revert, retire record.
`Invariants.t.sol`: accounting invariants under fuzzed sequences.
Gas report: `forge test --gas-report` → copy into `docs/BENCHMARKS.md`.

## 12. Deploy order (`script/Deploy.s.sol`)
1. ModelRegistry, PQKeyRegistry, ProjectRegistry
2. VeriCredit, RetirementRegistry, BufferPool (wire addresses)
3. Halo2Verifier (generated) → `ModelRegistry.registerModel`
4. IntegrityOracle + ChallengeManager (wire roles)
5. Grant roles, set demo parameters, write `deployments/<chainId>.json` for web + backend.
