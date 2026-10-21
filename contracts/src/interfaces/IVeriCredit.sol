// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IVeriCredit
/// @notice ERC-1155 "living" carbon credits whose integrity state updates over time.
interface IVeriCredit {
    enum IntegrityStatus {
        Active,
        UnderReview,
        Impaired,
        Frozen
    }

    struct Integrity {
        uint16 scoreBps;
        IntegrityStatus status;
        uint16 lastPeriod;
    }

    error ScoreTooLow();
    error ProjectNotActive();
    error ProjectFrozen();
    error NotOracle();
    error NotBufferPool();
    error ZeroAmount();
    error PeriodNotMonotonic();
    error OutstandingShortfall();

    event VintageMinted(
        uint256 indexed projectId, uint16 indexed vintage, address indexed to, uint256 tonnes, uint256 bufferTonnes
    );
    event IntegrityUpdated(uint256 indexed projectId, uint16 scoreBps, IntegrityStatus status);
    event ProjectFrozenEvent(uint256 indexed projectId);
    event BufferBurned(uint256 indexed tokenId, uint256 amount);
    event CreditsRetired(uint256 indexed retirementId, address indexed holder, uint256 indexed tokenId, uint256 amount);
    event ParameterChanged(string name, uint256 value);

    function mintVintage(uint256 projectId, uint16 vintage, address to, uint256 tonnes) external;
    function setIntegrity(uint256 projectId, uint16 scoreBps, uint16 period) external;
    function setIntegrity(uint256 projectId, uint16 scoreBps) external;
    function freeze(uint256 projectId) external;
    function burnBuffer(uint256 tokenId, uint256 amount) external;
    function retire(uint256 tokenId, uint256 amount, string calldata beneficiary)
        external
        returns (uint256 retirementId);
    function tokenIdFor(uint256 projectId, uint16 vintage) external pure returns (uint256);
    function integrityOf(uint256 projectId) external view returns (Integrity memory);
    function issuedOf(uint256 tokenId) external view returns (uint256);
    function retiredOf(uint256 tokenId) external view returns (uint256);
    function bufferBurnedOf(uint256 tokenId) external view returns (uint256);
    function minIssueScoreBps() external view returns (uint16);
    function impairThresholdBps() external view returns (uint16);
    function bufferBps() external view returns (uint16);
}
