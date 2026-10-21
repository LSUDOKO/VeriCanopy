// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ProjectRegistry} from "../src/ProjectRegistry.sol";
import {IProjectRegistry} from "../src/interfaces/IProjectRegistry.sol";
import {VeriCredit} from "../src/VeriCredit.sol";
import {IVeriCredit} from "../src/interfaces/IVeriCredit.sol";
import {RetirementRegistry} from "../src/RetirementRegistry.sol";
import {BufferPool} from "../src/BufferPool.sol";

contract VeriCreditTest is Test {
    ProjectRegistry reg;
    VeriCredit credit;
    RetirementRegistry retire;
    BufferPool pool;
    address gov = address(0xA11CE);
    address issuer = address(0x1551E);
    address oracle = address(0x0AC1E);
    address dev1 = address(0xD1);
    address buyer = address(0xB1);
    address other = address(0xB2);
    uint256 pid;

    function setUp() public {
        reg = new ProjectRegistry(gov);
        credit = new VeriCredit(gov, address(reg), "https://api.vericanopy.test/metadata/{id}");
        retire = new RetirementRegistry(address(credit));
        pool = new BufferPool(gov, address(credit));
        vm.startPrank(gov);
        reg.grantRole(reg.ISSUER_ROLE(), issuer);
        credit.grantRole(credit.ISSUER_ROLE(), issuer);
        credit.setRetirementRegistry(address(retire));
        credit.setBufferPool(address(pool));
        credit.setOracle(oracle);
        pool.setOracle(oracle);
        vm.stopPrank();
        vm.prank(dev1);
        pid = reg.createProject(keccak256("g"), bytes32(0), 8, 0, 0, "");
        vm.prank(issuer);
        reg.activate(pid);
    }

    function _score(uint16 bps) internal {
        vm.prank(oracle);
        credit.setIntegrity(pid, bps);
    }

    function test_mint_requires_score_ge_min() public {
        _score(6999);
        vm.prank(issuer);
        vm.expectRevert(IVeriCredit.ScoreTooLow.selector);
        credit.mintVintage(pid, 2024, buyer, 1000);
        _score(7000);
        vm.prank(issuer);
        credit.mintVintage(pid, 2024, buyer, 1000);
        assertEq(credit.balanceOf(buyer, credit.tokenIdFor(pid, 2024)), 1000);
    }

    function test_mint_sends_buffer_share() public {
        _score(9000);
        vm.prank(issuer);
        credit.mintVintage(pid, 2024, buyer, 1000);
        uint256 tid = credit.tokenIdFor(pid, 2024);
        assertEq(tid, (pid << 16) | 2024);
        assertEq(credit.balanceOf(address(pool), tid), 200);
        assertEq(pool.bufferBalance(pid, 2024), 200);
    }

    function test_set_integrity_impairs_below_threshold() public {
        _score(4999);
        IVeriCredit.Integrity memory s = credit.integrityOf(pid);
        assertEq(uint8(s.status), uint8(IVeriCredit.IntegrityStatus.Impaired));
        _score(5000);
        assertEq(uint8(credit.integrityOf(pid).status), uint8(IVeriCredit.IntegrityStatus.Active));
    }

    function test_set_integrity_rejects_old_period() public {
        vm.prank(oracle);
        credit.setIntegrity(pid, 9000, 2025);
        vm.prank(oracle);
        vm.expectRevert(IVeriCredit.PeriodNotMonotonic.selector);
        credit.setIntegrity(pid, 1000, 2024);
        assertEq(credit.integrityOf(pid).scoreBps, 9000);
    }

    function test_only_oracle_sets_integrity() public {
        vm.prank(buyer);
        vm.expectRevert(IVeriCredit.NotOracle.selector);
        credit.setIntegrity(pid, 9000);
    }

    function test_frozen_tokens_cannot_transfer_or_retire() public {
        _score(9000);
        vm.prank(issuer);
        credit.mintVintage(pid, 2024, buyer, 1000);
        uint256 tid = credit.tokenIdFor(pid, 2024);
        vm.prank(gov);
        credit.freeze(pid);
        vm.prank(buyer);
        vm.expectRevert(IVeriCredit.ProjectFrozen.selector);
        credit.safeTransferFrom(buyer, other, tid, 1, "");
        vm.prank(buyer);
        vm.expectRevert(IVeriCredit.ProjectFrozen.selector);
        credit.retire(tid, 1, "Acme");
        // frozen stays frozen even when a new score arrives
        _score(9500);
        assertEq(uint8(credit.integrityOf(pid).status), uint8(IVeriCredit.IntegrityStatus.Frozen));
    }

    function test_retire_records_score() public {
        _score(8200);
        vm.prank(issuer);
        credit.mintVintage(pid, 2024, buyer, 1000);
        uint256 tid = credit.tokenIdFor(pid, 2024);
        vm.prank(buyer);
        uint256 rid = credit.retire(tid, 300, "Acme Corp");
        assertEq(rid, 1);
        assertEq(credit.balanceOf(buyer, tid), 700);
        RetirementRegistry.Retirement memory r = retire.getRetirement(rid);
        assertEq(r.holder, buyer);
        assertEq(r.amount, 300);
        assertEq(r.scoreAtRetirement, 8200);
        assertEq(r.beneficiary, "Acme Corp");
        assertEq(credit.retiredOf(tid), 300);
    }

    function test_record_only_vericredit() public {
        vm.expectRevert(RetirementRegistry.NotVeriCredit.selector);
        retire.record(buyer, 1, 1, "x", 1);
    }
}
