// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC1155Holder} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import {IBufferPool} from "./interfaces/IBufferPool.sol";
import {IVeriCredit} from "./interfaces/IVeriCredit.sol";

/// @title BufferPool
/// @notice Holds each project's buffer credits and burns them, oldest vintage first, on reversal.
contract BufferPool is AccessControl, ERC1155Holder, IBufferPool {
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");

    IVeriCredit public immutable credit;
    address public oracle;

    mapping(uint256 => mapping(uint16 => uint256)) private _balance;
    mapping(uint256 => uint16[]) private _vintages;
    mapping(uint256 => uint256) private _shortfall;

    constructor(address governance, address credit_) {
        _grantRole(DEFAULT_ADMIN_ROLE, governance);
        _grantRole(GOVERNANCE_ROLE, governance);
        credit = IVeriCredit(credit_);
    }

    /// @notice Set the IntegrityOracle allowed to trigger reversals.
    function setOracle(address oracle_) external onlyRole(GOVERNANCE_ROLE) {
        oracle = oracle_;
    }

    /// @inheritdoc IBufferPool
    function onBufferMinted(uint256 projectId, uint16 vintage, uint256 tonnes) external {
        if (msg.sender != address(credit)) revert NotVeriCredit();
        if (_balance[projectId][vintage] == 0) _insertVintage(projectId, vintage);
        _balance[projectId][vintage] += tonnes;
        emit BufferCredited(projectId, vintage, tonnes);
    }

    /// @inheritdoc IBufferPool
    /// @dev Bounded by the number of vintages of one project (small). Shortfall freezes the project.
    function handleReversal(uint256 projectId, uint64 tonnes, uint16 period) external {
        if (msg.sender != oracle) revert NotOracle();
        uint256 remaining = tonnes;
        uint16[] storage vs = _vintages[projectId];
        for (uint256 i = 0; i < vs.length && remaining > 0; ++i) {
            uint16 v = vs[i];
            uint256 bal = _balance[projectId][v];
            if (bal == 0) continue;
            uint256 take = bal < remaining ? bal : remaining;
            _balance[projectId][v] = bal - take;
            remaining -= take;
            credit.burnBuffer(credit.tokenIdFor(projectId, v), take);
        }
        uint64 covered = tonnes - uint64(remaining);
        if (remaining > 0) {
            _shortfall[projectId] += remaining;
            // Nothing to protect before the first issuance: record the debt, freeze only issued projects.
            if (vs.length > 0) credit.freeze(projectId);
        }
        emit ProjectReversal(projectId, period, tonnes, covered, uint64(remaining));
    }

    /// @inheritdoc IBufferPool
    function bufferBalance(uint256 projectId, uint16 vintage) external view returns (uint256) {
        return _balance[projectId][vintage];
    }

    /// @inheritdoc IBufferPool
    function vintagesOf(uint256 projectId) external view returns (uint16[] memory) {
        return _vintages[projectId];
    }

    /// @inheritdoc IBufferPool
    function shortfallOf(uint256 projectId) external view returns (uint256) {
        return _shortfall[projectId];
    }

    /// @dev Keep vintages sorted ascending so burns go oldest-first.
    function _insertVintage(uint256 projectId, uint16 vintage) internal {
        uint16[] storage vs = _vintages[projectId];
        for (uint256 i = 0; i < vs.length; ++i) {
            if (vs[i] == vintage) return;
        }
        vs.push(vintage);
        uint256 j = vs.length - 1;
        while (j > 0 && vs[j - 1] > vs[j]) {
            (vs[j - 1], vs[j]) = (vs[j], vs[j - 1]);
            --j;
        }
    }

    function supportsInterface(bytes4 id) public view override(AccessControl, ERC1155Holder) returns (bool) {
        return super.supportsInterface(id);
    }
}
