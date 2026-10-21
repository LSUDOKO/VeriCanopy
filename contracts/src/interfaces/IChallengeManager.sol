// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IChallengeManager
interface IChallengeManager {
    enum Reason {
        WrongGeometry,
        WrongDates,
        CloudContamination,
        BadMatching,
        DataTampering,
        Other
    }

    enum Outcome {
        Open,
        Upheld,
        Rejected,
        Voided
    }

    struct Challenge {
        uint256 submissionId;
        address challenger;
        uint256 bond;
        Reason reason;
        string evidenceCID;
        uint8 votesUphold;
        uint8 votesReject;
        uint64 deadline;
        Outcome outcome;
    }

    error InsufficientBond();
    error SubmissionNotChallengeable();
    error ChallengeNotOpen();
    error AlreadyVoted();
    error ResolutionPeriodNotOver();
    error NothingToWithdraw();
    error UnknownChallenge();

    event ChallengeOpened(
        uint256 indexed challengeId,
        uint256 indexed submissionId,
        address indexed challenger,
        uint256 bond,
        Reason reason,
        string evidenceCID,
        uint64 deadline
    );
    event ChallengeVoted(uint256 indexed challengeId, address indexed resolver, bool uphold);
    event ChallengeResolved(uint256 indexed challengeId, bool upheld);
    event ChallengeVoided(uint256 indexed challengeId);
    event Withdrawal(address indexed to, uint256 amount);
    event ParamsChanged(uint256 minChallengeBond, uint8 resolverQuorum, uint64 resolutionPeriod, address treasury);

    function openChallenge(uint256 submissionId, Reason reason, string calldata evidenceCID)
        external
        payable
        returns (uint256 challengeId);
    function vote(uint256 challengeId, bool uphold) external;
    function resolveTimeout(uint256 challengeId) external;
    function withdraw() external;
    function getChallenge(uint256 challengeId) external view returns (Challenge memory);
    function challengeCount() external view returns (uint256);
    function openChallengeOf(uint256 submissionId) external view returns (uint256);
    function pendingWithdrawals(address who) external view returns (uint256);
    function minChallengeBond() external view returns (uint256);
    function resolverQuorum() external view returns (uint8);
    function resolutionPeriod() external view returns (uint64);
}
