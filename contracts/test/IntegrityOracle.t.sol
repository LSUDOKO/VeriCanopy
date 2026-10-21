// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseTest} from "./Base.t.sol";
import {IIntegrityOracle} from "../src/interfaces/IIntegrityOracle.sol";
import {IProjectRegistry} from "../src/interfaces/IProjectRegistry.sol";
import {IVeriCredit} from "../src/interfaces/IVeriCredit.sol";
import {IChallengeManager} from "../src/interfaces/IChallengeManager.sol";

contract IntegrityOracleTest is BaseTest {
    function test_submit_valid_proof_opens_window() public {
        uint256 id = _submit(2024, 115, 0); // 115/128 = 0.8984 -> 8984 bps
        IIntegrityOracle.Submission memory s = oracle.getSubmission(id);
        assertEq(s.scoreBps, 8984);
        assertEq(s.featureCommitment, bytes32(_instances(115)[0]));
        assertEq(s.windowEnd, vm.getBlockTimestamp() + 5 minutes);
        assertEq(uint8(s.status), uint8(IIntegrityOracle.SubStatus.Pending));
        assertEq(s.stake, STAKE);
        assertEq(oracle.submissionCount(), 1);
    }

    function test_submit_invalid_proof_reverts() public {
        verifier.setResult(false);
        vm.prank(oracleEoa);
        vm.expectRevert(IIntegrityOracle.InvalidZkProof.selector);
        oracle.submitScore{value: STAKE}(pid, 2024, modelHash, 0, bytes32(0), "", pqKeyId, "", _instances(100));
    }

    function test_submit_wrong_period_reverts() public {
        uint256 id = _submit(2024, 115, 0);
        skip(6 minutes);
        oracle.finalize(id);
        vm.prank(oracleEoa);
        vm.expectRevert(IIntegrityOracle.PeriodNotMonotonic.selector);
        oracle.submitScore{value: STAKE}(pid, 2024, modelHash, 0, bytes32(0), "", pqKeyId, "", _instances(100));
        // duplicate pending for same period
        _submit(2025, 100, 0);
        vm.prank(oracleEoa);
        vm.expectRevert(IIntegrityOracle.PendingSubmissionExists.selector);
        oracle.submitScore{value: STAKE}(pid, 2025, modelHash, 0, bytes32(0), "", pqKeyId, "", _instances(100));
    }

    function test_submit_reverts_on_out_of_range_score() public {
        vm.prank(oracleEoa);
        vm.expectRevert(IIntegrityOracle.InvalidInstances.selector);
        oracle.submitScore{value: STAKE}(pid, 2024, modelHash, 0, bytes32(0), "", pqKeyId, "", _instances(129));
        uint256[] memory one = new uint256[](1);
        vm.prank(oracleEoa);
        vm.expectRevert(IIntegrityOracle.InvalidInstances.selector);
        oracle.submitScore{value: STAKE}(pid, 2024, modelHash, 0, bytes32(0), "", pqKeyId, "", one);
    }

    function test_submit_requires_active_pq_key_owned_by_oracle() public {
        vm.prank(oracleEoa);
        pqKeys.revokeKey(pqKeyId);
        vm.prank(oracleEoa);
        vm.expectRevert(IIntegrityOracle.InvalidPQKey.selector);
        oracle.submitScore{value: STAKE}(pid, 2024, modelHash, 0, bytes32(0), "", pqKeyId, "", _instances(100));
        // key owned by someone else
        vm.prank(buyer);
        bytes32 foreign = pqKeys.registerKey("ML-DSA-65", keccak256("pk2"), "");
        vm.prank(oracleEoa);
        vm.expectRevert(IIntegrityOracle.InvalidPQKey.selector);
        oracle.submitScore{value: STAKE}(pid, 2024, modelHash, 0, bytes32(0), "", foreign, "", _instances(100));
    }

    function test_submit_requires_stake_and_role_and_active_model() public {
        vm.prank(oracleEoa);
        vm.expectRevert(IIntegrityOracle.InsufficientStake.selector);
        oracle.submitScore{value: STAKE - 1}(pid, 2024, modelHash, 0, bytes32(0), "", pqKeyId, "", _instances(100));
        vm.deal(buyer, 1 ether);
        vm.prank(buyer);
        vm.expectRevert();
        oracle.submitScore{value: STAKE}(pid, 2024, modelHash, 0, bytes32(0), "", pqKeyId, "", _instances(100));
        vm.prank(gov);
        models.setActive(modelHash, false);
        vm.prank(oracleEoa);
        vm.expectRevert(IIntegrityOracle.ModelNotActive.selector);
        oracle.submitScore{value: STAKE}(pid, 2024, modelHash, 0, bytes32(0), "", pqKeyId, "", _instances(100));
    }

    function test_finalize_sets_integrity_and_burns_buffer() public {
        // first score high enough to mint, finalise, mint vintage with buffer
        uint256 id = _submit(2023, 115, 0);
        skip(5 minutes);
        oracle.finalize(id);
        assertEq(credit.integrityOf(pid).scoreBps, 8984);
        assertEq(oracle.lastFinalizedPeriod(pid), 2023);
        assertEq(oracle.pendingWithdrawals(oracleEoa), STAKE);
        vm.prank(issuer);
        credit.mintVintage(pid, 2023, buyer, 1000); // buffer 200
        // second score with reversal of 150 t
        uint256 id2 = _submit(2024, 50, 150); // 50/128 = 0.3906 -> 3906 -> Impaired
        skip(5 minutes);
        vm.expectEmit(true, true, false, true);
        emit IIntegrityOracle.ScoreFinalized(id2, pid, 2024, 3906, 150);
        oracle.finalize(id2);
        assertEq(pool.bufferBalance(pid, 2023), 50);
        assertEq(uint8(credit.integrityOf(pid).status), uint8(IVeriCredit.IntegrityStatus.Impaired));
        assertEq(credit.integrityOf(pid).lastPeriod, 2024);
        // withdraw pull payment
        uint256 before = oracleEoa.balance;
        vm.prank(oracleEoa);
        oracle.withdraw();
        assertEq(oracleEoa.balance - before, 2 * STAKE);
    }

    function test_finalize_reverts_before_window() public {
        uint256 id = _submit(2024, 115, 0);
        vm.expectRevert(IIntegrityOracle.WindowNotOver.selector);
        oracle.finalize(id);
        skip(5 minutes - 1);
        vm.expectRevert(IIntegrityOracle.WindowNotOver.selector);
        oracle.finalize(id);
    }

    function test_finalize_reverts_while_challenged() public {
        uint256 id = _submit(2024, 115, 0);
        skip(5 minutes - 1); // last second of window
        vm.prank(challenger);
        cm.openChallenge{value: BOND}(id, IChallengeManager.Reason.WrongDates, "bafy-evidence");
        skip(10);
        vm.expectRevert(IIntegrityOracle.SubmissionNotPending.selector);
        oracle.finalize(id);
        // resolve rejected -> finalisable
        vm.prank(r1);
        cm.vote(1, false);
        vm.prank(r2);
        cm.vote(1, false);
        oracle.finalize(id);
        assertEq(uint8(oracle.getSubmission(id).status), uint8(IIntegrityOracle.SubStatus.Finalized));
    }

    function test_finalize_restores_active_from_under_review() public {
        vm.prank(gov);
        reg.setStatus(pid, IProjectRegistry.ProjectStatus.UnderReview);
        uint256 id = _submit(2024, 115, 0);
        skip(5 minutes);
        oracle.finalize(id);
        assertEq(uint8(reg.getProject(pid).status), uint8(IProjectRegistry.ProjectStatus.Active));
    }

    function test_pause_blocks_submissions() public {
        vm.prank(gov);
        oracle.pause();
        vm.prank(oracleEoa);
        vm.expectRevert();
        oracle.submitScore{value: STAKE}(pid, 2024, modelHash, 0, bytes32(0), "", pqKeyId, "", _instances(100));
    }
}
