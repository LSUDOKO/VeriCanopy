// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ProjectRegistry} from "../src/ProjectRegistry.sol";
import {IProjectRegistry} from "../src/interfaces/IProjectRegistry.sol";
import {VeriCredit} from "../src/VeriCredit.sol";
import {RetirementRegistry} from "../src/RetirementRegistry.sol";
import {BufferPool} from "../src/BufferPool.sol";
import {ModelRegistry} from "../src/ModelRegistry.sol";
import {PQKeyRegistry} from "../src/PQKeyRegistry.sol";
import {IntegrityOracle} from "../src/IntegrityOracle.sol";
import {ChallengeManager} from "../src/ChallengeManager.sol";
import {MockVerifier} from "./mocks/MockVerifier.sol";

/// @dev Shared deployment + wiring used by oracle, challenge and invariant tests.
abstract contract BaseTest is Test {
    ProjectRegistry reg;
    VeriCredit credit;
    RetirementRegistry retire;
    BufferPool pool;
    ModelRegistry models;
    PQKeyRegistry pqKeys;
    IntegrityOracle oracle;
    ChallengeManager cm;
    MockVerifier verifier;

    address gov = address(0xA11CE);
    address issuer = address(0x1551E);
    address oracleEoa = address(0x0AC1E);
    address treasury = address(0x7EA5);
    address dev1 = address(0xD1);
    address buyer = address(0xB1);
    address challenger = address(0xC1);
    address r1 = address(0x51);
    address r2 = address(0x52);
    address r3 = address(0x53);

    bytes32 modelHash = keccak256("model-v1");
    bytes32 pqKeyId;
    uint256 pid;

    uint256 constant STAKE = 0.001 ether;
    uint256 constant BOND = 0.0005 ether;
    uint8 constant OUTPUT_SCALE = 7; // 2^7 = 128

    function setUp() public virtual {
        reg = new ProjectRegistry(gov);
        credit = new VeriCredit(gov, address(reg), "");
        retire = new RetirementRegistry(address(credit));
        pool = new BufferPool(gov, address(credit));
        models = new ModelRegistry(gov);
        pqKeys = new PQKeyRegistry();
        verifier = new MockVerifier();
        oracle =
            new IntegrityOracle(gov, address(reg), address(credit), address(pool), address(models), address(pqKeys));
        cm = new ChallengeManager(gov, address(oracle));

        vm.startPrank(gov);
        reg.grantRole(reg.ISSUER_ROLE(), issuer);
        reg.grantRole(reg.ORACLE_CONTRACT_ROLE(), address(oracle));
        credit.grantRole(credit.ISSUER_ROLE(), issuer);
        credit.setRetirementRegistry(address(retire));
        credit.setBufferPool(address(pool));
        credit.setOracle(address(oracle));
        pool.setOracle(address(oracle));
        models.registerModel(modelHash, address(verifier), "ipfs://model", 1, OUTPUT_SCALE);
        oracle.grantRole(oracle.ORACLE_ROLE(), oracleEoa);
        oracle.grantRole(oracle.CHALLENGE_MANAGER_ROLE(), address(cm));
        oracle.setParams(5 minutes, STAKE, treasury);
        cm.setParams(BOND, 2, 10 minutes, treasury);
        cm.grantRole(cm.RESOLVER_ROLE(), r1);
        cm.grantRole(cm.RESOLVER_ROLE(), r2);
        cm.grantRole(cm.RESOLVER_ROLE(), r3);
        vm.stopPrank();

        vm.prank(oracleEoa);
        pqKeyId = pqKeys.registerKey("ML-DSA-65", keccak256("pk"), "ipfs://pk");

        vm.prank(dev1);
        pid = reg.createProject(keccak256("g"), bytes32(0), 8, 0, 120, "");
        vm.prank(issuer);
        reg.activate(pid);
        vm.deal(oracleEoa, 10 ether);
        vm.deal(challenger, 10 ether);
    }

    /// @dev instances = [featureCommitment, scoreFe]; scoreFe = scoreBps * 2^scale / 10000 (rounded).
    function _instances(uint256 scoreFe) internal pure returns (uint256[] memory ins) {
        ins = new uint256[](2);
        ins[0] = uint256(keccak256("features")) >> 8;
        ins[1] = scoreFe;
    }

    function _submit(uint16 period, uint256 scoreFe, uint64 reversal) internal returns (uint256 id) {
        vm.prank(oracleEoa);
        id = oracle.submitScore{
            value: STAKE
        }(
            pid,
            period,
            modelHash,
            reversal,
            keccak256("manifest"),
            "bafy-manifest",
            pqKeyId,
            hex"deadbeef",
            _instances(scoreFe)
        );
    }
}
