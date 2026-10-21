// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title ModelRegistry
/// @notice Maps a scoring-model hash to its on-chain zk verifier and artifacts.
contract ModelRegistry is AccessControl {
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");

    struct ModelVersion {
        address verifier;
        string artifactsURI;
        bool active;
        uint8 featureVersion;
        /// @dev EZKL output scale: public output instance = round(score * 2^outputScale).
        uint8 outputScale;
    }

    error ModelExists();
    error UnknownModel();

    event ModelRegistered(bytes32 indexed modelHash, address verifier, string artifactsURI, uint8 outputScale);
    event ModelActiveSet(bytes32 indexed modelHash, bool active);

    mapping(bytes32 => ModelVersion) private _models;

    constructor(address governance) {
        _grantRole(DEFAULT_ADMIN_ROLE, governance);
        _grantRole(GOVERNANCE_ROLE, governance);
    }

    /// @notice Register a model version and its verifier. Governance only.
    function registerModel(
        bytes32 modelHash,
        address verifier,
        string calldata artifactsURI,
        uint8 featureVersion,
        uint8 outputScale
    ) external onlyRole(GOVERNANCE_ROLE) {
        if (_models[modelHash].verifier != address(0)) revert ModelExists();
        _models[modelHash] = ModelVersion(verifier, artifactsURI, true, featureVersion, outputScale);
        emit ModelRegistered(modelHash, verifier, artifactsURI, outputScale);
        emit ModelActiveSet(modelHash, true);
    }

    /// @notice Activate or deactivate a model version.
    function setActive(bytes32 modelHash, bool active) external onlyRole(GOVERNANCE_ROLE) {
        if (_models[modelHash].verifier == address(0)) revert UnknownModel();
        _models[modelHash].active = active;
        emit ModelActiveSet(modelHash, active);
    }

    /// @notice Return a model version.
    function getModel(bytes32 modelHash) external view returns (ModelVersion memory) {
        return _models[modelHash];
    }
}
