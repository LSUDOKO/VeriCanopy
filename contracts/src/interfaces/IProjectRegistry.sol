// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IProjectRegistry
/// @notice Registry of forest carbon projects with exclusive H3 land claims.
interface IProjectRegistry {
    enum ProjectStatus {
        Pending,
        Active,
        UnderReview,
        Disputed,
        Retired
    }

    struct Project {
        address developer;
        uint8 h3Res;
        ProjectStatus status;
        uint64 startDate;
        uint32 claimedBaselineBps;
        uint32 cellCount;
        bytes32 geometryHash;
        bytes32 fineCellRoot;
        string metadataURI;
    }

    error OverlapDetected(uint64 cell, uint256 existingProjectId);
    error NotDeveloper();
    error InvalidStatus();
    error InvalidProof();
    error UnknownProject();

    event ProjectCreated(
        uint256 indexed projectId, address indexed developer, bytes32 geometryHash, string metadataURI
    );
    event CellsAdded(uint256 indexed projectId, uint256 count);
    event ProjectActivated(uint256 indexed projectId);
    event OverlapProven(uint256 indexed projectA, uint256 indexed projectB, uint64 cell);
    event ProjectStatusChanged(uint256 indexed projectId, ProjectStatus status);

    function createProject(
        bytes32 geometryHash,
        bytes32 fineCellRoot,
        uint8 h3Res,
        uint64 startDate,
        uint32 claimedBaselineBps,
        string calldata metadataURI
    ) external returns (uint256 projectId);
    function addCells(uint256 projectId, uint64[] calldata cells) external;
    function activate(uint256 projectId) external;
    function proveOverlap(uint256 a, uint256 b, uint64 cell, bytes32[] calldata proofA, bytes32[] calldata proofB)
        external;
    function setStatus(uint256 projectId, ProjectStatus s) external;
    function ownerOfCell(uint64 cell) external view returns (uint256);
    function getProject(uint256 projectId) external view returns (Project memory);
    function projectCount() external view returns (uint256);
}
