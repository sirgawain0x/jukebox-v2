// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {Script, console} from "forge-std/Script.sol";
import {SuperfluidRoyaltyRouter} from "../contracts/SuperfluidRoyaltyRouter.sol";

contract DeploySuperfluidRouter is Script {
    function run() external returns (SuperfluidRoyaltyRouter router) {
        // Get deployment parameters from environment
        address usdcAddress = vm.envAddress("USDC_ADDRESS");
        address playRateOracle = vm.envAddress("PLAY_RATE_ORACLE");
        
        console.log("Deploying SuperfluidRoyaltyRouter...");
        console.log("USDC Address:", usdcAddress);
        console.log("Play Rate Oracle:", playRateOracle);

        // Deploy the contract
        vm.startBroadcast();
        router = new SuperfluidRoyaltyRouter(usdcAddress, playRateOracle);
        vm.stopBroadcast();

        console.log("SuperfluidRoyaltyRouter deployed at:", address(router));

        // Verify deployment
        require(address(router) != address(0), "Deployment failed");
        require(address(router.usdcToken()) == usdcAddress, "USDC address mismatch");
        require(router.playRateOracle() == playRateOracle, "Oracle address mismatch");

        console.log("Deployment successful!");
        console.log("Contract address:", address(router));
        console.log("");
        console.log("Next steps:");
        console.log("1. Set Superfluid addresses using setSuperfluidAddresses()");
        console.log("2. Update .env with SUPERFLUID_ROUTER_ADDRESS");
        console.log("3. Verify the contract on BaseScan");
    }
}

