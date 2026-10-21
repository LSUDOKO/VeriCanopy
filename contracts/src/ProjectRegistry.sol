// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {IProjectRegistry} from "./interfaces/IProjectRegistry.sol";

/// @title ProjectRegistry
/// @notice Registers forest carbon projects and enforces exclusive land claims with H3 cells.
/// @dev Tier 1: every res-`h3Res` cell is stored on-chain; a cell owned by another project reverts.
///      Tier 2: a Merkle root of fine (res-11) cells allows anyone to prove a sliver overlap.
contract ProjectRegistry is AccessControl, IProjectRegistry {
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    /// @notice Granted to the IntegrityOracle so it can move projects between Active/UnderReview.
    bytes32 public constant ORACLE_CONTRACT_ROLE = keccak256("ORACLE_CONTRACT_ROLE");

    uint256 private _count;
    mapping(uint256 => Project) private _projects;
    mapping(uint64 => uint256) private _cellOwner;

    constructor(address governance) {
        _grantRole(DEFAULT_ADMIN_ROLE, governance);
        _grantRole(GOVERNANCE_ROLE, governance);
    }

    /// @inheritdoc IProjectRegistry
    function createProject(
        bytes32 geometryHash,
        bytes32 fineCellRoot,
        uint8 h3Res,
        uint64 startDate,
        uint32 claimedBaselineBps,
        string calldata metadataURI
    ) external returns (uint256 projectId) {
        projectId = ++_count;
        _projects[projectId] = Project({
            developer: msg.sender,
            h3Res: h3Res,
            status: ProjectStatus.Pending,
            startDate: startDate,
            claimedBaselineBps: claimedBaselineBps,
            cellCount: 0,
            geometryHash: geometryHash,
            fineCellRoot: fineCellRoot,
            metadataURI: metadataURI
        });
        emit ProjectCreated(projectId, msg.sender, geometryHash, metadataURI);
    }

    /// @inheritdoc IProjectRegistry
    /// @dev Bounded by the caller's batch size; each new cell is one cold SSTORE.
    function addCells(uint256 projectId, uint64[] calldata cells) external {
        Project storage p = _project(projectId);
        if (p.developer != msg.sender) revert NotDeveloper();
        if (p.status != ProjectStatus.Pending) revert InvalidStatus();
        uint256 n = cells.length;
        for (uint256 i = 0; i < n; ++i) {
            uint64 cell = cells[i];
            uint256 owner = _cellOwner[cell];
            if (owner != 0) {
                if (owner == projectId) continue;
                revert OverlapDetected(cell, owner);
            }
            _cellOwner[cell] = projectId;
        }
        p.cellCount += uint32(n);
        emit CellsAdded(projectId, n);
    }

    /// @inheritdoc IProjectRegistry
    function activate(uint256 projectId) external onlyRole(ISSUER_ROLE) {
        Project storage p = _project(projectId);
        if (p.status != ProjectStatus.Pending) revert InvalidStatus();
        p.status = ProjectStatus.Active;
        emit ProjectActivated(projectId);
        emit ProjectStatusChanged(projectId, ProjectStatus.Active);
    }

    /// @inheritdoc IProjectRegistry
    /// @dev Leaf = keccak256(abi.encodePacked(uint64 cell)). The later-registered project is marked Disputed.
    function proveOverlap(uint256 a, uint256 b, uint64 cell, bytes32[] calldata proofA, bytes32[] calldata proofB)
        external
    {
        if (a == b) revert InvalidProof();
        Project storage pa = _project(a);
        Project storage pb = _project(b);
        bytes32 leaf = keccak256(abi.encodePacked(cell));
        if (!MerkleProof.verify(proofA, pa.fineCellRoot, leaf)) revert InvalidProof();
        if (!MerkleProof.verify(proofB, pb.fineCellRoot, leaf)) revert InvalidProof();
        uint256 later = a > b ? a : b;
        _projects[later].status = ProjectStatus.Disputed;
        emit OverlapProven(a, b, cell);
        emit ProjectStatusChanged(later, ProjectStatus.Disputed);
    }

    /// @inheritdoc IProjectRegistry
    function setStatus(uint256 projectId, ProjectStatus s) external {
        if (!hasRole(ORACLE_CONTRACT_ROLE, msg.sender) && !hasRole(GOVERNANCE_ROLE, msg.sender)) {
            revert AccessControlUnauthorizedAccount(msg.sender, ORACLE_CONTRACT_ROLE);
        }
        _project(projectId).status = s;
        emit ProjectStatusChanged(projectId, s);
    }

    /// @inheritdoc IProjectRegistry
    function ownerOfCell(uint64 cell) external view returns (uint256) {
        return _cellOwner[cell];
    }

    /// @inheritdoc IProjectRegistry
    function getProject(uint256 projectId) external view returns (Project memory) {
        return _project(projectId);
    }

    /// @inheritdoc IProjectRegistry
    function projectCount() external view returns (uint256) {
        return _count;
    }

    function _project(uint256 projectId) internal view returns (Project storage p) {
        p = _projects[projectId];
        if (p.developer == address(0)) revert UnknownProject();
    }
}
