// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IIntegrityOracle
interface IIntegrityOracle {
    enum SubStatus {
        Pending,
        Challenged,
        Finalized,
        Rejected,
        Voided
    }

    struct Submission {
        uint256 projectId;
        uint16 period;
        address oracle;
        uint256 stake;
        uint16 scoreBps;
        uint64 reversalTonnes;
        bytes32 featureCommitment;
        bytes32 modelHash;
        bytes32 manifestHash;
        bytes32 pqKeyId;
        string manifestCID;
        uint64 windowEnd;
        SubStatus status;
        bytes32 proofHash;
    }

    error InsufficientStake();
    error ProjectNotScorable();
    error PeriodNotMonotonic();
    error PendingSubmissionExists();
    error ModelNotActive();
    error InvalidPQKey();
    error InvalidZkProof();
    error InvalidInstances();
    error UnknownSubmission();
    error SubmissionNotPending();
    error WindowNotOver();
    error WindowOver();
    error NothingToWithdraw();
    error InvalidParams();

    event ScoreSubmitted(
        uint256 indexed submissionId,
        uint256 indexed projectId,
        uint16 period,
        address indexed oracle,
        uint16 scoreBps,
        uint64 reversalTonnes,
        bytes32 featureCommitment,
        bytes32 modelHash,
        bytes32 manifestHash,
        string manifestCID,
        bytes32 pqKeyId,
        uint64 windowEnd
    );
    event ScoreFinalized(
        uint256 indexed submissionId, uint256 indexed projectId, uint16 period, uint16 scoreBps, uint64 reversalTonnes
    );
    event SubmissionStatusChanged(uint256 indexed submissionId, SubStatus status);
    event SubmissionVoided(uint256 indexed submissionId);
    event Withdrawal(address indexed to, uint256 amount);
    event ParamsChanged(uint64 challengeWindow, uint256 minOracleStake, address insuranceTreasury);

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
    ) external payable returns (uint256 submissionId);
    function finalize(uint256 submissionId) external;
    function withdraw() external;
    function onChallengeOpened(uint256 submissionId) external;
    function onChallengeResolved(uint256 submissionId, bool upheld, address challenger) external;
    function onChallengeTimeout(uint256 submissionId) external;
    function getSubmission(uint256 submissionId) external view returns (Submission memory);
    function submissionCount() external view returns (uint256);
    function lastFinalizedPeriod(uint256 projectId) external view returns (uint16);
    function pendingWithdrawals(address who) external view returns (uint256);
    function challengeWindow() external view returns (uint64);
    function minOracleStake() external view returns (uint256);
}
