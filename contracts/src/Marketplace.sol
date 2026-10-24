// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {IERC1155Receiver} from "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IMarketplace} from "./interfaces/IMarketplace.sol";
import {IVeriCredit} from "./interfaces/IVeriCredit.sol";

/// @notice Escrowed fixed-price marketplace for living credits. Sellers deposit units into the contract; buyers pay
///         native currency per unit. Proceeds and refunds are pull-payments. Frozen projects cannot be traded because
///         VeriCredit blocks the transfer itself; listings of a project that freezes later simply cannot be bought and
///         can be cancelled by the seller once the project is unfrozen (credits stay escrowed, never lost).
contract Marketplace is IMarketplace, AccessControl, ReentrancyGuard, IERC1155Receiver {
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");

    IVeriCredit public immutable credit;
    uint16 public feeBps;
    address public treasury;

    uint256 private _count;
    mapping(uint256 => Listing) private _listings;
    mapping(address => uint256) private _pending;

    constructor(address governance, address credit_, address treasury_, uint16 feeBps_) {
        if (feeBps_ > 1000) revert FeeTooHigh();
        _grantRole(DEFAULT_ADMIN_ROLE, governance);
        _grantRole(GOVERNANCE_ROLE, governance);
        credit = IVeriCredit(credit_);
        treasury = treasury_;
        feeBps = feeBps_;
    }

    function setFee(uint16 feeBps_, address treasury_) external onlyRole(GOVERNANCE_ROLE) {
        if (feeBps_ > 1000) revert FeeTooHigh();
        feeBps = feeBps_;
        treasury = treasury_;
        emit FeeUpdated(feeBps_, treasury_);
    }

    /// @inheritdoc IMarketplace
    function list(uint256 tokenId, uint256 amount, uint256 pricePerUnit)
        external
        nonReentrant
        returns (uint256 listingId)
    {
        if (amount == 0) revert ZeroAmount();
        if (pricePerUnit == 0) revert ZeroPrice();
        listingId = ++_count;
        _listings[listingId] =
            Listing({seller: msg.sender, tokenId: tokenId, amount: amount, pricePerUnit: pricePerUnit, active: true});
        // escrow: reverts with VeriCredit.ProjectFrozen if the project is frozen
        IERC1155(address(credit)).safeTransferFrom(msg.sender, address(this), tokenId, amount, "");
        emit Listed(listingId, msg.sender, tokenId, amount, pricePerUnit);
    }

    /// @inheritdoc IMarketplace
    function buy(uint256 listingId, uint256 amount) external payable nonReentrant {
        Listing storage l = _listing(listingId);
        if (!l.active) revert ListingInactive();
        if (amount == 0) revert ZeroAmount();
        if (amount > l.amount) revert InsufficientAmount();
        uint256 cost = amount * l.pricePerUnit;
        if (msg.value != cost) revert WrongPayment();
        uint256 fee = (cost * feeBps) / 10_000;
        l.amount -= amount;
        if (l.amount == 0) l.active = false;
        _pending[l.seller] += cost - fee;
        if (fee > 0) _pending[treasury] += fee;
        IERC1155(address(credit)).safeTransferFrom(address(this), msg.sender, l.tokenId, amount, "");
        emit Purchased(listingId, msg.sender, l.tokenId, amount, cost, fee);
    }

    /// @inheritdoc IMarketplace
    function cancel(uint256 listingId) external nonReentrant {
        Listing storage l = _listing(listingId);
        if (l.seller != msg.sender) revert NotSeller();
        if (!l.active) revert ListingInactive();
        uint256 back = l.amount;
        l.amount = 0;
        l.active = false;
        IERC1155(address(credit)).safeTransferFrom(address(this), msg.sender, l.tokenId, back, "");
        emit Cancelled(listingId, back);
    }

    /// @inheritdoc IMarketplace
    function withdraw() external nonReentrant {
        uint256 amt = _pending[msg.sender];
        if (amt == 0) revert NothingToWithdraw();
        _pending[msg.sender] = 0;
        (bool ok,) = msg.sender.call{value: amt}("");
        require(ok, "transfer failed");
        emit Withdrawn(msg.sender, amt);
    }

    function getListing(uint256 listingId) external view returns (Listing memory) {
        return _listing(listingId);
    }

    function listingCount() external view returns (uint256) {
        return _count;
    }

    function pendingWithdrawals(address account) external view returns (uint256) {
        return _pending[account];
    }

    function _listing(uint256 id) internal view returns (Listing storage l) {
        if (id == 0 || id > _count) revert UnknownListing();
        l = _listings[id];
    }

    // ---- ERC1155 receiver (escrow) ----
    function onERC1155Received(address, address, uint256, uint256, bytes calldata) external pure returns (bytes4) {
        return IERC1155Receiver.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(address, address, uint256[] calldata, uint256[] calldata, bytes calldata)
        external
        pure
        returns (bytes4)
    {
        return IERC1155Receiver.onERC1155BatchReceived.selector;
    }

    function supportsInterface(bytes4 id) public view override(AccessControl, IERC165) returns (bool) {
        return id == type(IERC1155Receiver).interfaceId || super.supportsInterface(id);
    }
}
