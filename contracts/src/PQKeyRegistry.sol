// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title PQKeyRegistry
/// @notice On-chain record of post-quantum (ML-DSA) public key hashes owned by oracle addresses.
contract PQKeyRegistry {
    struct PQKey {
        address owner;
        string algorithm;
        bytes32 pubKeyHash;
        string pubKeyURI;
        bool active;
    }

    error KeyExists();
    error NotKeyOwner();

    event PQKeyRegistered(
        bytes32 indexed keyId, address indexed owner, string algorithm, bytes32 pubKeyHash, string pubKeyURI
    );
    event PQKeyRevoked(bytes32 indexed keyId);

    mapping(bytes32 => PQKey) private _keys;

    /// @notice Register a PQ public key hash. keyId = keccak256(owner, pubKeyHash).
    function registerKey(string calldata algorithm, bytes32 pubKeyHash, string calldata pubKeyURI)
        external
        returns (bytes32 keyId)
    {
        keyId = keccak256(abi.encodePacked(msg.sender, pubKeyHash));
        if (_keys[keyId].owner != address(0)) revert KeyExists();
        _keys[keyId] = PQKey(msg.sender, algorithm, pubKeyHash, pubKeyURI, true);
        emit PQKeyRegistered(keyId, msg.sender, algorithm, pubKeyHash, pubKeyURI);
    }

    /// @notice Revoke a key (old signatures stay verifiable against the historical record).
    function revokeKey(bytes32 keyId) external {
        if (_keys[keyId].owner != msg.sender) revert NotKeyOwner();
        _keys[keyId].active = false;
        emit PQKeyRevoked(keyId);
    }

    /// @notice Return a key record.
    function getKey(bytes32 keyId) external view returns (PQKey memory) {
        return _keys[keyId];
    }
}
