// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title RetirementRegistry
/// @notice Immutable record of credit retirements with the integrity score at retirement time.
contract RetirementRegistry {
    struct Retirement {
        address holder;
        uint256 tokenId;
        uint256 amount;
        string beneficiary;
        uint16 scoreAtRetirement;
        uint64 timestamp;
    }

    error NotVeriCredit();

    event Retired(
        uint256 indexed retirementId,
        address indexed holder,
        uint256 indexed tokenId,
        uint256 amount,
        uint16 scoreAtRetirement,
        string beneficiary
    );

    address public immutable veriCredit;
    uint256 private _count;
    mapping(uint256 => Retirement) private _retirements;

    constructor(address veriCredit_) {
        veriCredit = veriCredit_;
    }

    /// @notice Record a retirement. Only callable by the VeriCredit contract.
    function record(address holder, uint256 tokenId, uint256 amount, string calldata beneficiary, uint16 score)
        external
        returns (uint256 id)
    {
        if (msg.sender != veriCredit) revert NotVeriCredit();
        id = ++_count;
        _retirements[id] = Retirement(holder, tokenId, amount, beneficiary, score, uint64(block.timestamp));
        emit Retired(id, holder, tokenId, amount, score, beneficiary);
    }

    /// @notice Return a retirement record.
    function getRetirement(uint256 id) external view returns (Retirement memory) {
        return _retirements[id];
    }

    /// @notice Number of retirements recorded.
    function retirementCount() external view returns (uint256) {
        return _count;
    }
}
