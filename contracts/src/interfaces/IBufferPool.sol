// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IBufferPool
/// @notice Holds buffer credits per project and burns them automatically on reversal.
interface IBufferPool {
    error NotOracle();
    error NotVeriCredit();
    error SettlementExceedsShortfall();

    event BufferCredited(uint256 indexed projectId, uint16 indexed vintage, uint256 tonnes);
    event ShortfallSettled(uint256 indexed projectId, uint256 amount, uint256 remaining);
    event ProjectReversal(uint256 indexed projectId, uint16 period, uint64 tonnes, uint64 covered, uint64 shortfall);

    function onBufferMinted(uint256 projectId, uint16 vintage, uint256 tonnes) external;
    function handleReversal(uint256 projectId, uint64 tonnes, uint16 period) external;
    function bufferBalance(uint256 projectId, uint16 vintage) external view returns (uint256);
    function vintagesOf(uint256 projectId) external view returns (uint16[] memory);
    function shortfallOf(uint256 projectId) external view returns (uint256);
    function settleShortfall(uint256 projectId, uint256 amount) external;
}
