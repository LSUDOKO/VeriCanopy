// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseTest} from "./Base.t.sol";
import {Marketplace} from "../src/Marketplace.sol";
import {IMarketplace} from "../src/interfaces/IMarketplace.sol";
import {IVeriCredit} from "../src/interfaces/IVeriCredit.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

contract MarketplaceTest is BaseTest {
    Marketplace market;
    address seller = address(0x5e11e2);
    address buyer2 = address(0xb2);
    uint256 tokenId;

    function setUp() public override {
        super.setUp();
        market = new Marketplace(gov, address(credit), treasury, 100); // 1% fee
        vm.prank(address(oracle));
        credit.setIntegrity(pid, 9000);
        vm.prank(issuer);
        credit.mintVintage(pid, 2024, seller, 1000);
        tokenId = credit.tokenIdFor(pid, 2024);
        vm.prank(seller);
        credit.setApprovalForAll(address(market), true);
        vm.deal(buyer2, 10 ether);
    }

    function test_list_buy_partial_and_withdraw() public {
        vm.prank(seller);
        uint256 id = market.list(tokenId, 500, 0.01 ether);
        assertEq(credit.balanceOf(address(market), tokenId), 500);
        vm.prank(buyer2);
        market.buy{value: 2 ether}(id, 200);
        assertEq(credit.balanceOf(buyer2, tokenId), 200);
        IMarketplace.Listing memory l = market.getListing(id);
        assertEq(l.amount, 300);
        assertTrue(l.active);
        assertEq(market.pendingWithdrawals(seller), 1.98 ether);
        assertEq(market.pendingWithdrawals(treasury), 0.02 ether);
        uint256 before = seller.balance;
        vm.prank(seller);
        market.withdraw();
        assertEq(seller.balance - before, 1.98 ether);
    }

    function test_buy_rejects_wrong_payment_and_overbuy() public {
        vm.prank(seller);
        uint256 id = market.list(tokenId, 10, 0.1 ether);
        vm.prank(buyer2);
        vm.expectRevert(IMarketplace.WrongPayment.selector);
        market.buy{value: 0.15 ether}(id, 2);
        vm.prank(buyer2);
        vm.expectRevert(IMarketplace.InsufficientAmount.selector);
        market.buy{value: 1.1 ether}(id, 11);
    }

    function test_cancel_returns_escrow_only_to_seller() public {
        vm.prank(seller);
        uint256 id = market.list(tokenId, 100, 1 ether);
        vm.prank(buyer2);
        vm.expectRevert(IMarketplace.NotSeller.selector);
        market.cancel(id);
        vm.prank(seller);
        market.cancel(id);
        assertEq(credit.balanceOf(seller, tokenId), 1000);
        assertFalse(market.getListing(id).active);
        vm.prank(buyer2);
        vm.expectRevert(IMarketplace.ListingInactive.selector);
        market.buy{value: 1 ether}(id, 1);
    }

    function test_frozen_project_cannot_be_listed_or_bought() public {
        vm.prank(seller);
        uint256 id = market.list(tokenId, 100, 1 ether);
        vm.prank(address(pool));
        credit.freeze(pid);
        vm.prank(buyer2);
        vm.expectRevert(IVeriCredit.ProjectFrozen.selector);
        market.buy{value: 1 ether}(id, 1);
        vm.prank(seller);
        vm.expectRevert(IVeriCredit.ProjectFrozen.selector);
        market.list(tokenId, 1, 1 ether);
    }

    function test_fee_bounds_and_zero_inputs() public {
        vm.expectRevert(IMarketplace.FeeTooHigh.selector);
        new Marketplace(gov, address(credit), treasury, 1001);
        vm.prank(seller);
        vm.expectRevert(IMarketplace.ZeroAmount.selector);
        market.list(tokenId, 0, 1);
        vm.prank(seller);
        vm.expectRevert(IMarketplace.ZeroPrice.selector);
        market.list(tokenId, 1, 0);
    }
}
