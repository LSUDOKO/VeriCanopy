// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IHalo2Verifier} from "../../src/interfaces/IHalo2Verifier.sol";

/// @dev Test double: returns a configurable result; records last call.
contract MockVerifier is IHalo2Verifier {
    bool public result = true;
    bytes public lastProof;
    uint256[] public lastInstances;

    function setResult(bool r) external {
        result = r;
    }

    function verifyProof(bytes calldata proof, uint256[] calldata instances) external returns (bool) {
        lastProof = proof;
        lastInstances = instances;
        return result;
    }
}
