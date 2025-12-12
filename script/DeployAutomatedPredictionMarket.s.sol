// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {Script, console} from "forge-std/Script.sol";
import {AutomatedPredictionMarket} from "../contracts/AutomatedPredictionMarket.sol";

contract DeployAutomatedPredictionMarket is Script {
    function run() external returns (AutomatedPredictionMarket automatedMarket) {
        // Get deployment parameters from environment
        uint64 subscriptionId = uint64(vm.envUint("CHAINLINK_FUNCTIONS_SUBSCRIPTION_ID"));
        address usdcAddress = vm.envAddress("USDC_ADDRESS");
        address router = vm.envAddress("CHAINLINK_FUNCTIONS_ROUTER");
        
        // DON_ID: Read as hex string and convert to bytes32
        // Format: hex string with 0x prefix (e.g., 0x66756e2d626173652d7365706f6c69612d310000000000000000000000000000)
        string memory donIdHex = vm.envString("CHAINLINK_FUNCTIONS_DON_ID");
        bytes32 donId = vm.parseBytes32(donIdHex);

        console.log("Deploying AutomatedPredictionMarket...");
        console.log("Chainlink Functions Subscription ID:", subscriptionId);
        console.log("USDC Address:", usdcAddress);
        console.log("Chainlink Functions Router:", router);
        console.log("Chainlink Functions DON ID:");
        console.logBytes32(donId);

        // Deploy the contract
        vm.startBroadcast();
        automatedMarket = new AutomatedPredictionMarket(subscriptionId, usdcAddress, router, donId);
        vm.stopBroadcast();

        console.log("AutomatedPredictionMarket deployed at:", address(automatedMarket));

        // Verify deployment
        require(address(automatedMarket) != address(0), "Deployment failed");
        require(address(automatedMarket.usdcToken()) == usdcAddress, "USDC address mismatch");
        require(automatedMarket.s_subscriptionId() == subscriptionId, "Subscription ID mismatch");
        require(automatedMarket.protocolFeeBasisPoints() == 1000, "Protocol fee should be 10% (1000 bps)");

        console.log("Deployment successful!");
        console.log("Contract address:", address(automatedMarket));
        console.log("");
        console.log("Next steps:");
        console.log("1. Update lib/contracts/automated-prediction-market.ts with the contract address");
        console.log("2. Register contract with Chainlink Automation registry");
        console.log("3. Fund contract with LINK for Functions requests");
        console.log("4. Verify the contract on BaseScan");
        console.log("5. Create first weekly market using createWeeklyMarket()");
    }
}
