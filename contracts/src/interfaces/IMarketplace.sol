// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IMarketplace — fixed-price listings for VeriCredit (ERC-1155) vintages, settled in native currency.
interface IMarketplace {
    struct Listing {
        address seller;
        uint256 tokenId;
        uint256 amount; // remaining units (tCO2e)
        uint256 pricePerUnit; // wei per unit
        bool active;
    }

    event Listed(
        uint256 indexed listingId, address indexed seller, uint256 indexed tokenId, uint256 amount, uint256 pricePerUnit
    );
    event Purchased(
        uint256 indexed listingId,
        address indexed buyer,
        uint256 indexed tokenId,
        uint256 amount,
        uint256 paid,
        uint256 fee
    );
    event Cancelled(uint256 indexed listingId, uint256 returned);
    event FeeUpdated(uint16 feeBps, address treasury);
    event Withdrawn(address indexed account, uint256 amount);

    error ZeroAmount();
    error ZeroPrice();
    error UnknownListing();
    error ListingInactive();
    error NotSeller();
    error InsufficientAmount();
    error WrongPayment();
    error NothingToWithdraw();
    error FeeTooHigh();
    error ProjectFrozen();

    function list(uint256 tokenId, uint256 amount, uint256 pricePerUnit) external returns (uint256 listingId);
    function buy(uint256 listingId, uint256 amount) external payable;
    function cancel(uint256 listingId) external;
    function withdraw() external;
    function getListing(uint256 listingId) external view returns (Listing memory);
    function listingCount() external view returns (uint256);
    function pendingWithdrawals(address account) external view returns (uint256);
}
