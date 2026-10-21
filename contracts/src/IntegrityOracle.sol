// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IIntegrityOracle} from "./interfaces/IIntegrityOracle.sol";
import {IProjectRegistry} from "./interfaces/IProjectRegistry.sol";
import {IVeriCredit} from "./interfaces/IVeriCredit.sol";
import {IBufferPool} from "./interfaces/IBufferPool.sol";
import {IHalo2Verifier} from "./interfaces/IHalo2Verifier.sol";
import {ModelRegistry} from "./ModelRegistry.sol";
import {PQKeyRegistry} from "./PQKeyRegistry.sol";

/// @title IntegrityOracle
/// @notice Accepts zk-proven integrity scores with stake, runs a challenge window, and finalises
///         them into VeriCredit integrity state and BufferPool reversals.
contract IntegrityOracle is AccessControl, Pausable, ReentrancyGuard, IIntegrityOracle {
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant CHALLENGE_MANAGER_ROLE = keccak256("CHALLENGE_MANAGER_ROLE");

    IProjectRegistry public immutable registry;
    IVeriCredit public immutable credit;
    IBufferPool public immutable bufferPool;
    ModelRegistry public immutable modelRegistry;
    PQKeyRegistry public immutable pqKeyRegistry;

    uint64 public challengeWindow = 7 days;
    uint256 public minOracleStake = 0.1 ether;
    address public insuranceTreasury;

    uint256 private _count;
    mapping(uint256 => Submission) private _subs;
    mapping(uint256 => uint16) private _lastFinalized;
    mapping(uint256 => mapping(uint16 => uint256)) private _pendingFor; // projectId => period => submissionId
    mapping(address => uint256) private _pending;

    constructor(
        address governance,
        address registry_,
        address credit_,
        address bufferPool_,
        address modelRegistry_,
        address pqKeyRegistry_
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, governance);
        _grantRole(GOVERNANCE_ROLE, governance);
        registry = IProjectRegistry(registry_);
        credit = IVeriCredit(credit_);
        bufferPool = IBufferPool(bufferPool_);
        modelRegistry = ModelRegistry(modelRegistry_);
        pqKeyRegistry = PQKeyRegistry(pqKeyRegistry_);
        insuranceTreasury = governance;
    }

    /// @notice Governance parameters.
    function setParams(uint64 challengeWindow_, uint256 minOracleStake_, address treasury)
        external
        onlyRole(GOVERNANCE_ROLE)
    {
        challengeWindow = challengeWindow_;
        minOracleStake = minOracleStake_;
        insuranceTreasury = treasury;
        emit ParamsChanged(challengeWindow_, minOracleStake_, treasury);
    }

    /// @notice Pause submissions.
    function pause() external onlyRole(GOVERNANCE_ROLE) {
        _pause();
    }

    /// @notice Unpause submissions.
    function unpause() external onlyRole(GOVERNANCE_ROLE) {
        _unpause();
    }

    /// @inheritdoc IIntegrityOracle
    /// @dev `scoreBps` and `featureCommitment` are decoded from `instances`, never trusted from arguments:
    ///      instances[0] = Poseidon feature commitment, instances[last] = round(score * 2^outputScale).
    function submitScore(
        uint256 projectId,
        uint16 period,
        bytes32 modelHash,
        uint64 reversalTonnes,
        bytes32 manifestHash,
        string calldata manifestCID,
        bytes32 pqKeyId,
        bytes calldata proof,
        uint256[] calldata instances
    ) external payable onlyRole(ORACLE_ROLE) whenNotPaused nonReentrant returns (uint256 submissionId) {
        if (msg.value < minOracleStake) revert InsufficientStake();
        IProjectRegistry.ProjectStatus ps = registry.getProject(projectId).status;
        if (ps != IProjectRegistry.ProjectStatus.Active && ps != IProjectRegistry.ProjectStatus.UnderReview) {
            revert ProjectNotScorable();
        }
        if (period <= _lastFinalized[projectId]) revert PeriodNotMonotonic();
        if (_pendingFor[projectId][period] != 0) revert PendingSubmissionExists();
        ModelRegistry.ModelVersion memory m = modelRegistry.getModel(modelHash);
        if (!m.active) revert ModelNotActive();
        PQKeyRegistry.PQKey memory k = pqKeyRegistry.getKey(pqKeyId);
        if (!k.active || k.owner != msg.sender) revert InvalidPQKey();
        if (instances.length < 2) revert InvalidInstances();
        try IHalo2Verifier(m.verifier).verifyProof(proof, instances) returns (bool ok) {
            if (!ok) revert InvalidZkProof();
        } catch {
            revert InvalidZkProof(); // EZKL verifiers revert on malformed proofs instead of returning false
        }
        uint16 scoreBps = _decodeScore(instances[instances.length - 1], m.outputScale);

        submissionId = ++_count;
        uint64 windowEnd = uint64(block.timestamp) + challengeWindow;
        _subs[submissionId] = Submission({
            projectId: projectId,
            period: period,
            oracle: msg.sender,
            stake: msg.value,
            scoreBps: scoreBps,
            reversalTonnes: reversalTonnes,
            featureCommitment: bytes32(instances[0]),
            modelHash: modelHash,
            manifestHash: manifestHash,
            pqKeyId: pqKeyId,
            manifestCID: manifestCID,
            windowEnd: windowEnd,
            status: SubStatus.Pending,
            proofHash: keccak256(proof)
        });
        _pendingFor[projectId][period] = submissionId;
        emit ScoreSubmitted(
            submissionId,
            projectId,
            period,
            msg.sender,
            scoreBps,
            reversalTonnes,
            bytes32(instances[0]),
            modelHash,
            manifestHash,
            manifestCID,
            pqKeyId,
            windowEnd
        );
    }

    /// @inheritdoc IIntegrityOracle
    function finalize(uint256 submissionId) external nonReentrant {
        Submission storage s = _sub(submissionId);
        if (s.status != SubStatus.Pending) revert SubmissionNotPending();
        if (block.timestamp < s.windowEnd) revert WindowNotOver();
        s.status = SubStatus.Finalized;
        _lastFinalized[s.projectId] = s.period;
        delete _pendingFor[s.projectId][s.period];
        _pending[s.oracle] += s.stake;
        credit.setIntegrity(s.projectId, s.scoreBps, s.period);
        if (s.reversalTonnes > 0) bufferPool.handleReversal(s.projectId, s.reversalTonnes, s.period);
        if (registry.getProject(s.projectId).status == IProjectRegistry.ProjectStatus.UnderReview) {
            registry.setStatus(s.projectId, IProjectRegistry.ProjectStatus.Active);
        }
        emit SubmissionStatusChanged(submissionId, SubStatus.Finalized);
        emit ScoreFinalized(submissionId, s.projectId, s.period, s.scoreBps, s.reversalTonnes);
    }

    /// @inheritdoc IIntegrityOracle
    function withdraw() external nonReentrant {
        uint256 amount = _pending[msg.sender];
        if (amount == 0) revert NothingToWithdraw();
        _pending[msg.sender] = 0;
        (bool ok,) = msg.sender.call{value: amount}("");
        require(ok, "transfer failed");
        emit Withdrawal(msg.sender, amount);
    }

    // ------------------------------------------------- challenge manager hooks

    /// @inheritdoc IIntegrityOracle
    function onChallengeOpened(uint256 submissionId) external onlyRole(CHALLENGE_MANAGER_ROLE) {
        Submission storage s = _sub(submissionId);
        if (s.status != SubStatus.Pending) revert SubmissionNotPending();
        if (block.timestamp >= s.windowEnd) revert WindowOver();
        s.status = SubStatus.Challenged;
        emit SubmissionStatusChanged(submissionId, SubStatus.Challenged);
    }

    /// @inheritdoc IIntegrityOracle
    /// @dev Upheld: stake split 50% challenger / 50% treasury, project UnderReview.
    ///      Rejected: submission returns to Pending and finalises at max(windowEnd, now).
    function onChallengeResolved(uint256 submissionId, bool upheld, address challenger)
        external
        onlyRole(CHALLENGE_MANAGER_ROLE)
    {
        Submission storage s = _sub(submissionId);
        if (s.status != SubStatus.Challenged) revert SubmissionNotPending();
        if (upheld) {
            s.status = SubStatus.Rejected;
            delete _pendingFor[s.projectId][s.period];
            uint256 half = s.stake / 2;
            _pending[challenger] += half;
            _pending[insuranceTreasury] += s.stake - half;
            registry.setStatus(s.projectId, IProjectRegistry.ProjectStatus.UnderReview);
            emit SubmissionStatusChanged(submissionId, SubStatus.Rejected);
        } else {
            s.status = SubStatus.Pending;
            if (s.windowEnd < block.timestamp) s.windowEnd = uint64(block.timestamp);
            emit SubmissionStatusChanged(submissionId, SubStatus.Pending);
        }
    }

    /// @inheritdoc IIntegrityOracle
    /// @dev No quorum in time: nobody is forced into an outcome; stake returns, project goes UnderReview.
    function onChallengeTimeout(uint256 submissionId) external onlyRole(CHALLENGE_MANAGER_ROLE) {
        Submission storage s = _sub(submissionId);
        if (s.status != SubStatus.Challenged) revert SubmissionNotPending();
        s.status = SubStatus.Voided;
        delete _pendingFor[s.projectId][s.period];
        _pending[s.oracle] += s.stake;
        registry.setStatus(s.projectId, IProjectRegistry.ProjectStatus.UnderReview);
        emit SubmissionStatusChanged(submissionId, SubStatus.Voided);
        emit SubmissionVoided(submissionId);
    }

    // ------------------------------------------------------------------ views

    /// @inheritdoc IIntegrityOracle
    function getSubmission(uint256 submissionId) external view returns (Submission memory) {
        return _subs[submissionId];
    }

    /// @inheritdoc IIntegrityOracle
    function submissionCount() external view returns (uint256) {
        return _count;
    }

    /// @inheritdoc IIntegrityOracle
    function lastFinalizedPeriod(uint256 projectId) external view returns (uint16) {
        return _lastFinalized[projectId];
    }

    /// @inheritdoc IIntegrityOracle
    function pendingWithdrawals(address who) external view returns (uint256) {
        return _pending[who];
    }

    /// @notice Decode score basis points from the public output instance.
    function decodeScore(uint256 scoreFe, uint8 outputScale) external pure returns (uint16) {
        return _decodeScore(scoreFe, outputScale);
    }

    function _decodeScore(uint256 scoreFe, uint8 outputScale) internal pure returns (uint16) {
        uint256 denom = uint256(1) << outputScale;
        if (scoreFe > denom) revert InvalidInstances();
        return uint16((scoreFe * 10_000) / denom);
    }

    function _sub(uint256 id) internal view returns (Submission storage s) {
        s = _subs[id];
        if (s.oracle == address(0)) revert UnknownSubmission();
    }
}
