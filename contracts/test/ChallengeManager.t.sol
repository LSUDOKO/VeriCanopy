// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseTest} from "./Base.t.sol";
import {IIntegrityOracle} from "../src/interfaces/IIntegrityOracle.sol";
import {IChallengeManager} from "../src/interfaces/IChallengeManager.sol";
import {IProjectRegistry} from "../src/interfaces/IProjectRegistry.sol";

contract ChallengeManagerTest is BaseTest {
    uint256 sid;

    function setUp() public override {
        super.setUp();
        sid = _submit(2024, 115, 0);
    }

    function _open() internal returns (uint256 cid) {
        vm.prank(challenger);
        cid = cm.openChallenge{value: BOND}(sid, IChallengeManager.Reason.BadMatching, "bafy-ev");
    }

    function test_open_marks_submission_challenged() public {
        uint256 cid = _open();
        assertEq(cid, 1);
        assertEq(uint8(oracle.getSubmission(sid).status), uint8(IIntegrityOracle.SubStatus.Challenged));
        IChallengeManager.Challenge memory c = cm.getChallenge(cid);
        assertEq(c.challenger, challenger);
        assertEq(c.bond, BOND);
        assertEq(c.deadline, vm.getBlockTimestamp() + 10 minutes);
        assertEq(cm.challengeCount(), 1);
    }

    function test_bond_below_half_stake_reverts() public {
        vm.prank(gov);
        cm.setParams(1, 2, 10 minutes, treasury); // tiny min bond so stake/2 dominates
        vm.prank(challenger);
        vm.expectRevert(IChallengeManager.InsufficientBond.selector);
        cm.openChallenge{value: STAKE / 2 - 1}(sid, IChallengeManager.Reason.Other, "");
    }

    function test_open_only_during_window_and_once() public {
        _open();
        vm.prank(challenger);
        vm.expectRevert(IChallengeManager.SubmissionNotChallengeable.selector);
        cm.openChallenge{value: BOND}(sid, IChallengeManager.Reason.Other, "");
        uint256 s2 = _submit(2025, 100, 0);
        skip(5 minutes);
        vm.prank(challenger);
        vm.expectRevert(IChallengeManager.SubmissionNotChallengeable.selector);
        cm.openChallenge{value: BOND}(s2, IChallengeManager.Reason.Other, "");
    }

    function test_upheld_pays_challenger_and_treasury_and_rejects_submission() public {
        uint256 cid = _open();
        vm.prank(r1);
        cm.vote(cid, true);
        vm.prank(r3);
        vm.expectEmit(true, false, false, true);
        emit IChallengeManager.ChallengeResolved(cid, true);
        cm.vote(cid, true);
        assertEq(uint8(oracle.getSubmission(sid).status), uint8(IIntegrityOracle.SubStatus.Rejected));
        assertEq(uint8(cm.getChallenge(cid).outcome), uint8(IChallengeManager.Outcome.Upheld));
        // challenger: bond back (from cm) + 50% stake (from oracle)
        assertEq(cm.pendingWithdrawals(challenger), BOND);
        assertEq(oracle.pendingWithdrawals(challenger), STAKE / 2);
        assertEq(oracle.pendingWithdrawals(treasury), STAKE - STAKE / 2);
        assertEq(oracle.pendingWithdrawals(oracleEoa), 0);
        assertEq(uint8(reg.getProject(pid).status), uint8(IProjectRegistry.ProjectStatus.UnderReview));
        // can't finalise a rejected submission
        skip(10 minutes);
        vm.expectRevert(IIntegrityOracle.SubmissionNotPending.selector);
        oracle.finalize(sid);
    }

    function test_rejected_splits_bond_and_submission_finalizable() public {
        uint256 cid = _open();
        vm.prank(r1);
        cm.vote(cid, false);
        vm.prank(r2);
        cm.vote(cid, false);
        assertEq(uint8(oracle.getSubmission(sid).status), uint8(IIntegrityOracle.SubStatus.Pending));
        assertEq(cm.pendingWithdrawals(oracleEoa), BOND / 2);
        assertEq(cm.pendingWithdrawals(treasury), BOND - BOND / 2);
        assertEq(cm.pendingWithdrawals(challenger), 0);
        skip(5 minutes);
        oracle.finalize(sid);
        assertEq(oracle.pendingWithdrawals(oracleEoa), STAKE);
    }

    function test_timeout_refunds_both_and_voids() public {
        uint256 cid = _open();
        vm.prank(r1);
        cm.vote(cid, true);
        vm.expectRevert(IChallengeManager.ResolutionPeriodNotOver.selector);
        cm.resolveTimeout(cid);
        skip(10 minutes);
        cm.resolveTimeout(cid);
        assertEq(uint8(oracle.getSubmission(sid).status), uint8(IIntegrityOracle.SubStatus.Voided));
        assertEq(cm.pendingWithdrawals(challenger), BOND);
        assertEq(oracle.pendingWithdrawals(oracleEoa), STAKE);
        assertEq(uint8(reg.getProject(pid).status), uint8(IProjectRegistry.ProjectStatus.UnderReview));
        vm.prank(r2);
        vm.expectRevert(IChallengeManager.ChallengeNotOpen.selector);
        cm.vote(cid, true);
    }

    function test_double_vote_reverts() public {
        uint256 cid = _open();
        vm.prank(r1);
        cm.vote(cid, true);
        vm.prank(r1);
        vm.expectRevert(IChallengeManager.AlreadyVoted.selector);
        cm.vote(cid, false);
        vm.prank(buyer);
        vm.expectRevert();
        cm.vote(cid, true);
    }

    function test_withdraw_pull_payment() public {
        uint256 cid = _open();
        vm.prank(r1);
        cm.vote(cid, true);
        vm.prank(r2);
        cm.vote(cid, true);
        uint256 before = challenger.balance;
        vm.prank(challenger);
        cm.withdraw();
        vm.prank(challenger);
        oracle.withdraw();
        assertEq(challenger.balance - before, BOND + STAKE / 2);
        vm.prank(challenger);
        vm.expectRevert(IChallengeManager.NothingToWithdraw.selector);
        cm.withdraw();
    }
}
