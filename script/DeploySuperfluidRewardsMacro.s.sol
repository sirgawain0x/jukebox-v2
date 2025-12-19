// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {Script, console} from "forge-std/Script.sol";
import {SuperfluidRewardsMacro} from "../contracts/SuperfluidRewardsMacro.sol";

contract DeploySuperfluidRewardsMacro is Script {
    function run() external returns (SuperfluidRewardsMacro macro) {
        // Get deployment parameters from environment
        address host = vm.envAddress("SUPERFLUID_HOST");
        address gda = vm.envAddress("SUPERFLUID_GDA");
        address cfa = vm.envAddress("SUPERFLUID_CFA");
        
        console.log("Deploying SuperfluidRewardsMacro...");
        console.log("Superfluid Host:", host);
        console.log("GDA Forwarder:", gda);
        console.log("CFA:", cfa);

        // Deploy the contract
        vm.startBroadcast();
        macro = new SuperfluidRewardsMacro(host, gda, cfa);
        vm.stopBroadcast();

        console.log("SuperfluidRewardsMacro deployed at:", address(macro));

        // Verify deployment
        require(address(macro) != address(0), "Deployment failed");
        require(address(macro.host()) == host, "Host address mismatch");
        require(address(macro.gda()) == gda, "GDA address mismatch");
        require(address(macro.cfa()) == cfa, "CFA address mismatch");

        console.log("Deployment successful!");
        console.log("Contract address:", address(macro));
        console.log("");
        console.log("Next steps:");
        console.log("1. Update .env with SUPERFLUID_REWARDS_MACRO_ADDRESS");
        console.log("2. Verify the contract on BaseScan");
        console.log("3. Test macro execution with test pool");
    }
}

