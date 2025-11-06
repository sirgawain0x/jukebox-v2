// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Script, console} from "forge-std/Script.sol";
import {PredictionMarket} from "../contracts/PredictionMarket.sol";

contract DeployPredictionMarket is Script {
    function run() external returns (PredictionMarket predictionMarket) {
        // Get deployment parameters from environment
        address usdcAddress = vm.envAddress("USDC_ADDRESS");
        address feeRecipient = vm.envAddress("FEE_RECIPIENT");
        uint256 platformFeeBps = vm.envUint("PLATFORM_FEE_BPS");
        
        // Timelock delay: default to 1 day (86400 seconds) if not provided
        uint256 timelockDelay = vm.envOr("TIMELOCK_DELAY", uint256(86400));
        
        // Minimum market duration: default to 1 day (86400 seconds) if not provided
        uint256 minMarketDuration = vm.envOr("MIN_MARKET_DURATION", uint256(86400));

        console.log("Deploying PredictionMarket...");
        console.log("USDC Address:", usdcAddress);
        console.log("Fee Recipient:", feeRecipient);
        console.log("Platform Fee (BPS):", platformFeeBps);
        console.log("Timelock Delay (seconds):", timelockDelay);
        console.log("Minimum Market Duration (seconds):", minMarketDuration);

        // Deploy the contract
        vm.startBroadcast();
        predictionMarket = new PredictionMarket(
            usdcAddress,
            feeRecipient,
            platformFeeBps,
            timelockDelay,
            minMarketDuration
        );
        vm.stopBroadcast();

        console.log("PredictionMarket deployed at:", address(predictionMarket));

        // Verify deployment
        require(address(predictionMarket) != address(0), "Deployment failed");
        require(address(predictionMarket.usdc()) == usdcAddress, "USDC address mismatch");
        require(predictionMarket.feeRecipient() == feeRecipient, "Fee recipient mismatch");
        require(predictionMarket.platformFeeBps() == platformFeeBps, "Platform fee mismatch");
        require(predictionMarket.timelockDelay() == timelockDelay, "Timelock delay mismatch");
        require(predictionMarket.minMarketDuration() == minMarketDuration, "Minimum market duration mismatch");

        console.log("Deployment successful!");
        console.log("Contract address:", address(predictionMarket));
        console.log("");
        console.log("Next steps:");
        console.log("1. Update lib/contracts/prediction-market.ts with the contract address");
        console.log("2. Verify the contract on BaseScan:");
        console.log("   forge verify-contract", address(predictionMarket), "PredictionMarket");
    }
}

