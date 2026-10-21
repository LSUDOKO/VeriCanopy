// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ProjectRegistry} from "../src/ProjectRegistry.sol";
import {VeriCredit} from "../src/VeriCredit.sol";
import {IVeriCredit} from "../src/interfaces/IVeriCredit.sol";
import {RetirementRegistry} from "../src/RetirementRegistry.sol";
import {BufferPool} from "../src/BufferPool.sol";
import {IBufferPool} from "../src/interfaces/IBufferPool.sol";

contract BufferPoolTest is Test {
    ProjectRegistry reg;
    VeriCredit credit;
    RetirementRegistry retire;
    BufferPool pool;
    address gov = address(0xA11CE);
    address issuer = address(0x1551E);
    address oracle = address(0x0AC1E);
    address dev1 = address(0xD1);
    address buyer = address(0xB1);
    uint256 pid;

    function setUp() public {
        reg = new ProjectRegistry(gov);
        credit = new VeriCredit(gov, address(reg), "");
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
        vm.prank(oracle);
        credit.setIntegrity(pid, 9000);
        vm.startPrank(issuer);
        credit.mintVintage(pid, 2022, buyer, 1000); // buffer 200
        credit.mintVintage(pid, 2023, buyer, 500); // buffer 100
        vm.stopPrank();
    }

    function test_reversal_burns_oldest_first() public {
        vm.prank(oracle);
        vm.expectEmit(true, false, false, true);
        emit IBufferPool.ProjectReversal(pid, 3, 250, 250, 0);
        pool.handleReversal(pid, 250, 3);
        assertEq(pool.bufferBalance(pid, 2022), 0);
        assertEq(pool.bufferBalance(pid, 2023), 50);
        assertEq(credit.balanceOf(address(pool), credit.tokenIdFor(pid, 2022)), 0);
        assertEq(credit.bufferBurnedOf(credit.tokenIdFor(pid, 2022)), 200);
        assertEq(uint8(credit.integrityOf(pid).status), uint8(IVeriCredit.IntegrityStatus.Active));
    }

    function test_reversal_shortfall_freezes() public {
        vm.prank(oracle);
        pool.handleReversal(pid, 400, 3);
        assertEq(pool.shortfallOf(pid), 100);
        assertEq(uint8(credit.integrityOf(pid).status), uint8(IVeriCredit.IntegrityStatus.Frozen));
        uint256 tid = credit.tokenIdFor(pid, 2022);
        vm.prank(buyer);
        vm.expectRevert(IVeriCredit.ProjectFrozen.selector);
        credit.safeTransferFrom(buyer, address(0xB2), tid, 1, "");
        vm.prank(buyer);
        vm.expectRevert(IVeriCredit.ProjectFrozen.selector);
        credit.retire(tid, 1, "x");
    }

    function test_only_oracle_handles_reversal() public {
        vm.prank(buyer);
        vm.expectRevert(IBufferPool.NotOracle.selector);
        pool.handleReversal(pid, 1, 3);
    }

    function test_vintages_tracked() public view {
        uint16[] memory v = pool.vintagesOf(pid);
        assertEq(v.length, 2);
        assertEq(v[0], 2022);
        assertEq(v[1], 2023);
    }
}
