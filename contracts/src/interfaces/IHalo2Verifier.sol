// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IHalo2Verifier
/// @notice Interface implemented by EZKL-generated verifiers.
interface IHalo2Verifier {
    function verifyProof(bytes calldata proof, uint256[] calldata instances) external returns (bool);
}
