// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ProjectRegistry} from "../src/ProjectRegistry.sol";
import {VeriCredit} from "../src/VeriCredit.sol";
import {RetirementRegistry} from "../src/RetirementRegistry.sol";
import {BufferPool} from "../src/BufferPool.sol";
import {ModelRegistry} from "../src/ModelRegistry.sol";
import {PQKeyRegistry} from "../src/PQKeyRegistry.sol";
import {IntegrityOracle} from "../src/IntegrityOracle.sol";
import {ChallengeManager} from "../src/ChallengeManager.sol";
import {Marketplace} from "../src/Marketplace.sol";
import {MockVerifier} from "../test/mocks/MockVerifier.sol";

/// @notice Deploys the full VeriCanopy stack with demo parameters and writes deployments/<chainId>.json.
/// @dev Env: USE_MOCK_VERIFIER (bool), VERIFIER_ADDRESS (address, optional pre-deployed Halo2Verifier),
///      MODEL_HASH (bytes32), OUTPUT_SCALE (uint), ORACLE_ADDRESS, RESOLVER_ADDRESSES (comma list), API_URL.
contract Deploy is Script {
    function run() external {
        address deployer = msg.sender;
        bool useMock = vm.envOr("USE_MOCK_VERIFIER", false);
        address verifierAddr = vm.envOr("VERIFIER_ADDRESS", address(0));
        bytes32 modelHash = vm.envOr("MODEL_HASH", keccak256("vericanopy-mock-model"));
        uint8 outputScale = uint8(vm.envOr("OUTPUT_SCALE", uint256(7)));
        address oracleEoa = vm.envOr("ORACLE_ADDRESS", address(0x70997970C51812dc3A010C7d01b50e0d17dc79C8));
        string memory apiUrl = vm.envOr("API_URL", string("http://127.0.0.1:8000"));
        address[] memory resolvers = vm.envOr("RESOLVER_ADDRESSES", ",", _defaultResolvers());

        vm.startBroadcast();
        ProjectRegistry reg = new ProjectRegistry(deployer);
        VeriCredit credit = new VeriCredit(deployer, address(reg), string.concat(apiUrl, "/api/v1/metadata/{id}"));
        RetirementRegistry retire = new RetirementRegistry(address(credit));
        BufferPool pool = new BufferPool(deployer, address(credit));
        ModelRegistry models = new ModelRegistry(deployer);
        PQKeyRegistry pqKeys = new PQKeyRegistry();
        bool isMock = verifierAddr == address(0);
        if (isMock) {
            if (!useMock) {
                console.log("No VERIFIER_ADDRESS given; deploying MockVerifier (set USE_MOCK_VERIFIER=true to silence)");
            }
            verifierAddr = address(new MockVerifier());
        }
        IntegrityOracle oracle = new IntegrityOracle(
            deployer, address(reg), address(credit), address(pool), address(models), address(pqKeys)
        );
        ChallengeManager cm = new ChallengeManager(deployer, address(oracle));
        Marketplace market = new Marketplace(deployer, address(credit), deployer, 100);

        // wiring
        reg.grantRole(reg.ISSUER_ROLE(), deployer);
        reg.grantRole(reg.ORACLE_CONTRACT_ROLE(), address(oracle));
        credit.grantRole(credit.ISSUER_ROLE(), deployer);
        credit.setRetirementRegistry(address(retire));
        credit.setBufferPool(address(pool));
        credit.setOracle(address(oracle));
        pool.setOracle(address(oracle));
        models.registerModel(modelHash, verifierAddr, "ipfs://model-artifacts", 1, outputScale);
        oracle.grantRole(oracle.ORACLE_ROLE(), oracleEoa);
        oracle.grantRole(oracle.CHALLENGE_MANAGER_ROLE(), address(cm));
        // demo parameters (06 §2)
        oracle.setParams(5 minutes, 0.001 ether, deployer);
        cm.setParams(0.0005 ether, 2, 10 minutes, deployer);
        for (uint256 i = 0; i < resolvers.length; ++i) {
            cm.grantRole(cm.RESOLVER_ROLE(), resolvers[i]);
        }
        vm.stopBroadcast();

        string memory j = "deploy";
        vm.serializeUint(j, "chainId", block.chainid);
        vm.serializeUint(j, "startBlock", block.number);
        vm.serializeAddress(j, "deployer", deployer);
        vm.serializeAddress(j, "oracleAddress", oracleEoa);
        string memory c = "contracts";
        vm.serializeAddress(c, "ProjectRegistry", address(reg));
        vm.serializeAddress(c, "VeriCredit", address(credit));
        vm.serializeAddress(c, "RetirementRegistry", address(retire));
        vm.serializeAddress(c, "BufferPool", address(pool));
        vm.serializeAddress(c, "ModelRegistry", address(models));
        vm.serializeAddress(c, "PQKeyRegistry", address(pqKeys));
        vm.serializeAddress(c, "IntegrityOracle", address(oracle));
        vm.serializeAddress(c, "ChallengeManager", address(cm));
        vm.serializeAddress(c, "Marketplace", address(market));
        string memory cj = vm.serializeAddress(c, "Verifier", verifierAddr);
        vm.serializeString(j, "contracts", cj);
        string memory p = "params";
        vm.serializeUint(p, "challengeWindow", 5 minutes);
        vm.serializeUint(p, "resolutionPeriod", 10 minutes);
        vm.serializeUint(p, "minOracleStake", 0.001 ether);
        vm.serializeUint(p, "minChallengeBond", 0.0005 ether);
        vm.serializeUint(p, "resolverQuorum", 2);
        vm.serializeUint(p, "impairThresholdBps", 5000);
        vm.serializeUint(p, "minIssueScoreBps", 7000);
        vm.serializeUint(p, "bufferBps", 2000);
        vm.serializeUint(p, "outputScale", outputScale);
        vm.serializeBytes32(p, "modelHash", modelHash);
        string memory pj = vm.serializeBool(p, "mockVerifier", isMock);
        string memory out = vm.serializeString(j, "params", pj);
        string memory path = string.concat("deployments/", vm.toString(block.chainid), ".json");
        vm.writeJson(out, path);
        console.log("deployments written to", path);
    }

    function _defaultResolvers() internal pure returns (address[] memory r) {
        r = new address[](3);
        r[0] = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC; // anvil #2
        r[1] = 0x90F79bf6EB2c4f870365E785982E1f101E93b906; // anvil #3
        r[2] = 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65; // anvil #4
    }
}
