// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ProjectRegistry} from "../src/ProjectRegistry.sol";
import {IProjectRegistry} from "../src/interfaces/IProjectRegistry.sol";

contract ProjectRegistryTest is Test {
    ProjectRegistry reg;
    address gov = address(0xA11CE);
    address issuer = address(0x1551E);
    address dev1 = address(0xD1);
    address dev2 = address(0xD2);

    function setUp() public {
        reg = new ProjectRegistry(gov);
        bytes32 role = reg.ISSUER_ROLE();
        vm.prank(gov);
        reg.grantRole(role, issuer);
    }

    function _cells(uint64 a, uint64 b) internal pure returns (uint64[] memory c) {
        c = new uint64[](2);
        c[0] = a;
        c[1] = b;
    }

    function _create(address dev) internal returns (uint256 id) {
        vm.prank(dev);
        id = reg.createProject(keccak256("geom"), bytes32(0), 8, 1577836800, 120, "ipfs://meta");
    }

    function test_create_and_add_cells() public {
        uint256 id = _create(dev1);
        assertEq(id, 1);
        vm.prank(dev1);
        reg.addCells(id, _cells(100, 101));
        assertEq(reg.ownerOfCell(100), 1);
        assertEq(reg.ownerOfCell(101), 1);
        IProjectRegistry.Project memory p = reg.getProject(id);
        assertEq(p.cellCount, 2);
        assertEq(uint8(p.status), uint8(IProjectRegistry.ProjectStatus.Pending));
        assertEq(reg.projectCount(), 1);
    }

    function test_overlap_reverts_with_cell_and_owner() public {
        uint256 a = _create(dev1);
        vm.prank(dev1);
        reg.addCells(a, _cells(100, 101));
        uint256 b = _create(dev2);
        vm.prank(dev2);
        vm.expectRevert(abi.encodeWithSelector(IProjectRegistry.OverlapDetected.selector, uint64(101), uint256(1)));
        reg.addCells(b, _cells(200, 101));
    }

    function test_add_cells_only_developer_while_pending() public {
        uint256 a = _create(dev1);
        vm.prank(dev2);
        vm.expectRevert(IProjectRegistry.NotDeveloper.selector);
        reg.addCells(a, _cells(1, 2));
        vm.prank(dev1);
        reg.addCells(a, _cells(1, 2));
        vm.prank(issuer);
        reg.activate(a);
        vm.prank(dev1);
        vm.expectRevert(IProjectRegistry.InvalidStatus.selector);
        reg.addCells(a, _cells(3, 4));
    }

    function test_activate_requires_issuer() public {
        uint256 a = _create(dev1);
        vm.prank(dev1);
        vm.expectRevert();
        reg.activate(a);
        vm.prank(issuer);
        reg.activate(a);
        assertEq(uint8(reg.getProject(a).status), uint8(IProjectRegistry.ProjectStatus.Active));
    }

    // Merkle helpers: leaf = keccak256(abi.encodePacked(uint64 cell)), sorted pairs (OZ MerkleProof)
    function _hashPair(bytes32 x, bytes32 y) internal pure returns (bytes32) {
        return x < y ? keccak256(abi.encodePacked(x, y)) : keccak256(abi.encodePacked(y, x));
    }

    function _twoLeafTree(uint64 c0, uint64 c1) internal pure returns (bytes32 root, bytes32[] memory proof0) {
        bytes32 l0 = keccak256(abi.encodePacked(c0));
        bytes32 l1 = keccak256(abi.encodePacked(c1));
        root = _hashPair(l0, l1);
        proof0 = new bytes32[](1);
        proof0[0] = l1;
    }

    function test_prove_overlap_marks_later_project_disputed() public {
        (bytes32 rootA, bytes32[] memory proofA) = _twoLeafTree(555, 556);
        (bytes32 rootB, bytes32[] memory proofB) = _twoLeafTree(555, 999);
        vm.prank(dev1);
        uint256 a = reg.createProject(keccak256("a"), rootA, 8, 0, 0, "");
        vm.prank(dev2);
        uint256 b = reg.createProject(keccak256("b"), rootB, 8, 0, 0, "");
        reg.proveOverlap(a, b, 555, proofA, proofB);
        assertEq(uint8(reg.getProject(b).status), uint8(IProjectRegistry.ProjectStatus.Disputed));
        assertEq(uint8(reg.getProject(a).status), uint8(IProjectRegistry.ProjectStatus.Pending));
    }

    function test_prove_overlap_invalid_proof_reverts() public {
        (bytes32 rootA, bytes32[] memory proofA) = _twoLeafTree(555, 556);
        (bytes32 rootB,) = _twoLeafTree(777, 999);
        vm.prank(dev1);
        uint256 a = reg.createProject(keccak256("a"), rootA, 8, 0, 0, "");
        vm.prank(dev2);
        uint256 b = reg.createProject(keccak256("b"), rootB, 8, 0, 0, "");
        bytes32[] memory bad = new bytes32[](1);
        bad[0] = bytes32(uint256(1));
        vm.expectRevert(IProjectRegistry.InvalidProof.selector);
        reg.proveOverlap(a, b, 555, proofA, bad);
    }

    function test_set_status_only_oracle_or_governance() public {
        uint256 a = _create(dev1);
        vm.prank(dev1);
        vm.expectRevert();
        reg.setStatus(a, IProjectRegistry.ProjectStatus.UnderReview);
        vm.prank(gov);
        reg.setStatus(a, IProjectRegistry.ProjectStatus.UnderReview);
        assertEq(uint8(reg.getProject(a).status), uint8(IProjectRegistry.ProjectStatus.UnderReview));
    }
}
