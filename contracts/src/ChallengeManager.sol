// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IChallengeManager} from "./interfaces/IChallengeManager.sol";
import {IIntegrityOracle} from "./interfaces/IIntegrityOracle.sol";

/// @title ChallengeManager
/// @notice Open, staked challenge game over oracle submissions, resolved by an M-of-N resolver set.
contract ChallengeManager is AccessControl, ReentrancyGuard, IChallengeManager {
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    bytes32 public constant RESOLVER_ROLE = keccak256("RESOLVER_ROLE");

    IIntegrityOracle public immutable oracle;

    uint256 public minChallengeBond = 0.05 ether;
    uint8 public resolverQuorum = 2;
    uint64 public resolutionPeriod = 7 days;
    address public insuranceTreasury;

    uint256 private _count;
    mapping(uint256 => Challenge) private _challenges;
    mapping(uint256 => uint256) private _openOf;
    mapping(uint256 => mapping(address => bool)) private _voted;
    mapping(address => uint256) private _pending;

    constructor(address governance, address oracle_) {
        _grantRole(DEFAULT_ADMIN_ROLE, governance);
        _grantRole(GOVERNANCE_ROLE, governance);
        oracle = IIntegrityOracle(oracle_);
        insuranceTreasury = governance;
    }

    /// @notice Governance parameters.
    function setParams(uint256 minBond, uint8 quorum, uint64 period, address treasury)
        external
        onlyRole(GOVERNANCE_ROLE)
    {
        if (quorum == 0 || period == 0 || treasury == address(0)) revert InvalidParams();
        minChallengeBond = minBond;
        resolverQuorum = quorum;
        resolutionPeriod = period;
        insuranceTreasury = treasury;
        emit ParamsChanged(minBond, quorum, period, treasury);
    }

    /// @inheritdoc IChallengeManager
    /// @dev Bond >= max(minChallengeBond, stake / 2) deters griefing (research D1–D4).
    function openChallenge(uint256 submissionId, Reason reason, string calldata evidenceCID)
        external
        payable
        nonReentrant
        returns (uint256 challengeId)
    {
        IIntegrityOracle.Submission memory s = oracle.getSubmission(submissionId);
        if (s.oracle == address(0) || s.status != IIntegrityOracle.SubStatus.Pending || block.timestamp >= s.windowEnd)
        {
            revert SubmissionNotChallengeable();
        }
        if (_openOf[submissionId] != 0) revert SubmissionNotChallengeable();
        uint256 minBond = s.stake / 2 > minChallengeBond ? s.stake / 2 : minChallengeBond;
        if (msg.value < minBond) revert InsufficientBond();
        challengeId = ++_count;
        uint64 deadline = uint64(block.timestamp) + resolutionPeriod;
        _challenges[challengeId] = Challenge({
            submissionId: submissionId,
            challenger: msg.sender,
            bond: msg.value,
            reason: reason,
            evidenceCID: evidenceCID,
            votesUphold: 0,
            votesReject: 0,
            deadline: deadline,
            outcome: Outcome.Open
        });
        _openOf[submissionId] = challengeId;
        oracle.onChallengeOpened(submissionId);
        emit ChallengeOpened(challengeId, submissionId, msg.sender, msg.value, reason, evidenceCID, deadline);
    }

    /// @inheritdoc IChallengeManager
    function vote(uint256 challengeId, bool uphold) external onlyRole(RESOLVER_ROLE) {
        Challenge storage c = _challenge(challengeId);
        if (c.outcome != Outcome.Open) revert ChallengeNotOpen();
        if (block.timestamp >= c.deadline) revert ResolutionPeriodOver(); // after the deadline only resolveTimeout applies
        if (_voted[challengeId][msg.sender]) revert AlreadyVoted();
        _voted[challengeId][msg.sender] = true;
        emit ChallengeVoted(challengeId, msg.sender, uphold);
        if (uphold) {
            if (++c.votesUphold >= resolverQuorum) _resolve(challengeId, c, true);
        } else {
            if (++c.votesReject >= resolverQuorum) _resolve(challengeId, c, false);
        }
    }

    /// @inheritdoc IChallengeManager
    function resolveTimeout(uint256 challengeId) external nonReentrant {
        Challenge storage c = _challenge(challengeId);
        if (c.outcome != Outcome.Open) revert ChallengeNotOpen();
        if (block.timestamp < c.deadline) revert ResolutionPeriodNotOver();
        c.outcome = Outcome.Voided;
        delete _openOf[c.submissionId];
        _pending[c.challenger] += c.bond;
        oracle.onChallengeTimeout(c.submissionId);
        emit ChallengeVoided(challengeId);
    }

    /// @inheritdoc IChallengeManager
    function withdraw() external nonReentrant {
        uint256 amount = _pending[msg.sender];
        if (amount == 0) revert NothingToWithdraw();
        _pending[msg.sender] = 0;
        (bool ok,) = msg.sender.call{value: amount}("");
        require(ok, "transfer failed");
        emit Withdrawal(msg.sender, amount);
    }

    function _resolve(uint256 challengeId, Challenge storage c, bool upheld) internal {
        IIntegrityOracle.Submission memory s = oracle.getSubmission(c.submissionId);
        delete _openOf[c.submissionId];
        if (upheld) {
            c.outcome = Outcome.Upheld;
            _pending[c.challenger] += c.bond;
        } else {
            c.outcome = Outcome.Rejected;
            uint256 half = c.bond / 2;
            _pending[s.oracle] += half;
            _pending[insuranceTreasury] += c.bond - half;
        }
        oracle.onChallengeResolved(c.submissionId, upheld, c.challenger);
        emit ChallengeResolved(challengeId, upheld);
    }

    /// @inheritdoc IChallengeManager
    function getChallenge(uint256 challengeId) external view returns (Challenge memory) {
        return _challenges[challengeId];
    }

    /// @inheritdoc IChallengeManager
    function challengeCount() external view returns (uint256) {
        return _count;
    }

    /// @inheritdoc IChallengeManager
    function openChallengeOf(uint256 submissionId) external view returns (uint256) {
        return _openOf[submissionId];
    }

    /// @inheritdoc IChallengeManager
    function pendingWithdrawals(address who) external view returns (uint256) {
        return _pending[who];
    }

    function _challenge(uint256 id) internal view returns (Challenge storage c) {
        c = _challenges[id];
        if (c.challenger == address(0)) revert UnknownChallenge();
    }
}
