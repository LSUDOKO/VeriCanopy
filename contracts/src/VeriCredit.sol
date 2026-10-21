// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IVeriCredit} from "./interfaces/IVeriCredit.sol";
import {IBufferPool} from "./interfaces/IBufferPool.sol";
import {IProjectRegistry} from "./interfaces/IProjectRegistry.sol";
import {RetirementRegistry} from "./RetirementRegistry.sol";

/// @title VeriCredit
/// @notice ERC-1155 living carbon credits. One token id per project-vintage; integrity state per project.
contract VeriCredit is ERC1155, AccessControl, Pausable, IVeriCredit {
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    IProjectRegistry public immutable registry;
    address public oracle;
    address public bufferPool;
    RetirementRegistry public retirementRegistry;

    uint16 public minIssueScoreBps = 7000;
    uint16 public impairThresholdBps = 5000;
    uint16 public bufferBps = 2000;

    mapping(uint256 => Integrity) private _integrity;
    mapping(uint256 => uint256) private _issued;
    mapping(uint256 => uint256) private _retired;
    mapping(uint256 => uint256) private _bufferBurned;

    constructor(address governance, address registry_, string memory uri_) ERC1155(uri_) {
        _grantRole(DEFAULT_ADMIN_ROLE, governance);
        _grantRole(GOVERNANCE_ROLE, governance);
        registry = IProjectRegistry(registry_);
    }

    // ---------------------------------------------------------------- admin

    /// @notice Set the IntegrityOracle address allowed to update integrity.
    function setOracle(address oracle_) external onlyRole(GOVERNANCE_ROLE) {
        oracle = oracle_;
    }

    /// @notice Set the BufferPool that receives buffer credits and may burn/freeze.
    function setBufferPool(address pool) external onlyRole(GOVERNANCE_ROLE) {
        bufferPool = pool;
    }

    /// @notice Set the retirement registry.
    function setRetirementRegistry(address r) external onlyRole(GOVERNANCE_ROLE) {
        retirementRegistry = RetirementRegistry(r);
    }

    /// @notice Governance parameter: minimum finalised score to issue credits.
    function setMinIssueScoreBps(uint16 v) external onlyRole(GOVERNANCE_ROLE) {
        minIssueScoreBps = v;
        emit ParameterChanged("minIssueScoreBps", v);
    }

    /// @notice Governance parameter: score below which a project is Impaired.
    function setImpairThresholdBps(uint16 v) external onlyRole(GOVERNANCE_ROLE) {
        impairThresholdBps = v;
        emit ParameterChanged("impairThresholdBps", v);
    }

    /// @notice Governance parameter: buffer share minted to the pool.
    function setBufferBps(uint16 v) external onlyRole(GOVERNANCE_ROLE) {
        bufferBps = v;
        emit ParameterChanged("bufferBps", v);
    }

    /// @notice Set the metadata URI template.
    function setURI(string calldata newUri) external onlyRole(GOVERNANCE_ROLE) {
        _setURI(newUri);
    }

    /// @notice Pause minting and retirements.
    function pause() external onlyRole(GOVERNANCE_ROLE) {
        _pause();
    }

    /// @notice Unpause.
    function unpause() external onlyRole(GOVERNANCE_ROLE) {
        _unpause();
    }

    // -------------------------------------------------------------- minting

    /// @inheritdoc IVeriCredit
    function mintVintage(uint256 projectId, uint16 vintage, address to, uint256 tonnes)
        external
        onlyRole(ISSUER_ROLE)
        whenNotPaused
    {
        if (tonnes == 0) revert ZeroAmount();
        IProjectRegistry.Project memory p = registry.getProject(projectId);
        if (p.status != IProjectRegistry.ProjectStatus.Active) revert ProjectNotActive();
        Integrity memory s = _integrity[projectId];
        if (s.status == IntegrityStatus.Frozen) revert ProjectFrozen();
        if (s.scoreBps < minIssueScoreBps) revert ScoreTooLow();
        if (IBufferPool(bufferPool).shortfallOf(projectId) > 0) revert OutstandingShortfall();
        uint256 tokenId = tokenIdFor(projectId, vintage);
        uint256 bufferTonnes = (tonnes * bufferBps) / 10_000;
        _issued[tokenId] += tonnes + bufferTonnes;
        _mint(to, tokenId, tonnes, "");
        if (bufferTonnes > 0) {
            _mint(bufferPool, tokenId, bufferTonnes, "");
            IBufferPool(bufferPool).onBufferMinted(projectId, vintage, bufferTonnes);
        }
        emit VintageMinted(projectId, vintage, to, tonnes, bufferTonnes);
    }

    // ------------------------------------------------------------ integrity

    /// @inheritdoc IVeriCredit
    function setIntegrity(uint256 projectId, uint16 scoreBps, uint16 period) public {
        if (msg.sender != oracle) revert NotOracle();
        Integrity storage s = _integrity[projectId];
        if (period < s.lastPeriod) revert PeriodNotMonotonic();
        s.scoreBps = scoreBps;
        s.lastPeriod = period;
        if (s.status != IntegrityStatus.Frozen) {
            s.status = scoreBps < impairThresholdBps ? IntegrityStatus.Impaired : IntegrityStatus.Active;
        }
        emit IntegrityUpdated(projectId, scoreBps, s.status);
    }

    /// @inheritdoc IVeriCredit
    function setIntegrity(uint256 projectId, uint16 scoreBps) external {
        setIntegrity(projectId, scoreBps, _integrity[projectId].lastPeriod);
    }

    /// @inheritdoc IVeriCredit
    function freeze(uint256 projectId) external {
        if (msg.sender != bufferPool && !hasRole(GOVERNANCE_ROLE, msg.sender)) revert NotBufferPool();
        _integrity[projectId].status = IntegrityStatus.Frozen;
        emit ProjectFrozenEvent(projectId);
        emit IntegrityUpdated(projectId, _integrity[projectId].scoreBps, IntegrityStatus.Frozen);
    }

    /// @notice Governance may lift a freeze after a shortfall has been covered.
    function unfreeze(uint256 projectId) external onlyRole(GOVERNANCE_ROLE) {
        Integrity storage s = _integrity[projectId];
        s.status = s.scoreBps < impairThresholdBps ? IntegrityStatus.Impaired : IntegrityStatus.Active;
        emit IntegrityUpdated(projectId, s.scoreBps, s.status);
    }

    /// @inheritdoc IVeriCredit
    function burnBuffer(uint256 tokenId, uint256 amount) external {
        if (msg.sender != bufferPool) revert NotBufferPool();
        _bufferBurned[tokenId] += amount;
        _burn(bufferPool, tokenId, amount);
        emit BufferBurned(tokenId, amount);
    }

    // ----------------------------------------------------------- retirement

    /// @inheritdoc IVeriCredit
    function retire(uint256 tokenId, uint256 amount, string calldata beneficiary)
        external
        whenNotPaused
        returns (uint256 retirementId)
    {
        if (amount == 0) revert ZeroAmount();
        uint256 projectId = tokenId >> 16;
        Integrity memory s = _integrity[projectId];
        if (s.status == IntegrityStatus.Frozen) revert ProjectFrozen();
        _retired[tokenId] += amount;
        _burn(msg.sender, tokenId, amount);
        retirementId = retirementRegistry.record(msg.sender, tokenId, amount, beneficiary, s.scoreBps);
        emit CreditsRetired(retirementId, msg.sender, tokenId, amount);
    }

    // ---------------------------------------------------------------- views

    /// @inheritdoc IVeriCredit
    function tokenIdFor(uint256 projectId, uint16 vintage) public pure returns (uint256) {
        return (projectId << 16) | uint256(vintage);
    }

    /// @inheritdoc IVeriCredit
    function integrityOf(uint256 projectId) external view returns (Integrity memory) {
        return _integrity[projectId];
    }

    /// @inheritdoc IVeriCredit
    function issuedOf(uint256 tokenId) external view returns (uint256) {
        return _issued[tokenId];
    }

    /// @inheritdoc IVeriCredit
    function retiredOf(uint256 tokenId) external view returns (uint256) {
        return _retired[tokenId];
    }

    /// @inheritdoc IVeriCredit
    function bufferBurnedOf(uint256 tokenId) external view returns (uint256) {
        return _bufferBurned[tokenId];
    }

    /// @dev Block all movement (transfer, retire-burn) of tokens of Frozen projects. Mints and buffer burns pass.
    function _update(address from, address to, uint256[] memory ids, uint256[] memory values) internal override {
        if (from != address(0) && from != bufferPool) {
            for (uint256 i = 0; i < ids.length; ++i) {
                if (_integrity[ids[i] >> 16].status == IntegrityStatus.Frozen) revert ProjectFrozen();
            }
        }
        super._update(from, to, ids, values);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC1155, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
