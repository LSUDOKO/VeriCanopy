// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseTest} from "./Base.t.sol";
import {Test} from "forge-std/Test.sol";
import {VeriCredit} from "../src/VeriCredit.sol";
import {BufferPool} from "../src/BufferPool.sol";
import {IVeriCredit} from "../src/interfaces/IVeriCredit.sol";

/// @dev Random sequences of mint / transfer / retire / reversal / freeze on one project, two vintages.
contract Handler is Test {
    VeriCredit credit;
    BufferPool pool;
    address issuer;
    address oracle;
    address gov;
    uint256 pid;
    address[] public actors;
    uint16[2] vintages = [uint16(2022), uint16(2023)];

    constructor(VeriCredit c, BufferPool p, address issuer_, address oracle_, address gov_, uint256 pid_) {
        credit = c;
        pool = p;
        issuer = issuer_;
        oracle = oracle_;
        gov = gov_;
        pid = pid_;
        actors.push(address(0xB1));
        actors.push(address(0xB2));
        actors.push(address(0xB3));
    }

    function mint(uint8 a, uint8 v, uint96 amt) external {
        amt = uint96(bound(amt, 1, 10_000));
        vm.prank(issuer);
        try credit.mintVintage(pid, vintages[v % 2], actors[a % 3], amt) {} catch {}
    }

    function transfer(uint8 a, uint8 b, uint8 v, uint96 amt) external {
        uint256 tid = credit.tokenIdFor(pid, vintages[v % 2]);
        address from = actors[a % 3];
        uint256 bal = credit.balanceOf(from, tid);
        if (bal == 0) return;
        amt = uint96(bound(amt, 1, bal));
        vm.prank(from);
        try credit.safeTransferFrom(from, actors[b % 3], tid, amt, "") {} catch {}
    }

    function retire(uint8 a, uint8 v, uint96 amt) external {
        uint256 tid = credit.tokenIdFor(pid, vintages[v % 2]);
        address from = actors[a % 3];
        uint256 bal = credit.balanceOf(from, tid);
        if (bal == 0) return;
        amt = uint96(bound(amt, 1, bal));
        vm.prank(from);
        try credit.retire(tid, amt, "x") {} catch {}
    }

    function reversal(uint64 t) external {
        t = uint64(bound(t, 1, 5_000));
        vm.prank(oracle);
        pool.handleReversal(pid, t, 1);
    }

    function unfreeze() external {
        vm.prank(gov);
        credit.unfreeze(pid);
    }
}

contract InvariantsTest is BaseTest {
    Handler handler;

    function setUp() public override {
        super.setUp();
        vm.prank(address(oracle));
        credit.setIntegrity(pid, 9000, 1);
        handler = new Handler(credit, pool, issuer, address(oracle), gov, pid);
        targetContract(address(handler));
    }

    /// issued == circulating + retired + bufferHeld + bufferBurned, per vintage.
    function invariant_supply_accounting() public view {
        uint16[2] memory vs = [uint16(2022), uint16(2023)];
        for (uint256 i = 0; i < 2; ++i) {
            uint256 tid = credit.tokenIdFor(pid, vs[i]);
            uint256 circulating;
            for (uint256 a = 0; a < 3; ++a) {
                circulating += credit.balanceOf(handler.actors(a), tid);
            }
            uint256 bufferHeld = credit.balanceOf(address(pool), tid);
            assertEq(bufferHeld, pool.bufferBalance(pid, vs[i]));
            assertEq(
                credit.issuedOf(tid), circulating + credit.retiredOf(tid) + bufferHeld + credit.bufferBurnedOf(tid)
            );
        }
    }

    /// While frozen, holder balances never change (checked via a snapshot-free property: retire/transfer revert).
    function invariant_frozen_never_moves() public {
        if (credit.integrityOf(pid).status != IVeriCredit.IntegrityStatus.Frozen) return;
        uint256 tid = credit.tokenIdFor(pid, 2022);
        address a = handler.actors(0);
        uint256 bal = credit.balanceOf(a, tid);
        if (bal == 0) return;
        address b = handler.actors(1);
        vm.prank(a);
        vm.expectRevert(IVeriCredit.ProjectFrozen.selector);
        credit.safeTransferFrom(a, b, tid, 1, "");
    }
}
