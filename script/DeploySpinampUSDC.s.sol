// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {Script, console} from "forge-std/Script.sol";
import {SpinampUSDC} from "../contracts/SpinampUSDC.sol";

contract DeploySpinampUSDC is Script {
    function run() external returns (SpinampUSDC spinampUSDC) {
        // Get deployment parameters from environment
        uint64 subscriptionId = uint64(vm.envUint("CHAINLINK_FUNCTIONS_SUBSCRIPTION_ID"));
        address usdcAddress = vm.envAddress("USDC_ADDRESS");
        address router = vm.envAddress("CHAINLINK_FUNCTIONS_ROUTER");
        address feeRecipient = vm.envAddress("FEE_RECIPIENT");
        
        // DON_ID: Read as hex string and convert to bytes32
        // Format: hex string with 0x prefix (e.g., 0x66756e2d626173652d6d61696e6e65742d310000000000000000000000000000)
        string memory donIdHex = vm.envString("CHAINLINK_FUNCTIONS_DON_ID");
        bytes32 donId = vm.parseBytes32(donIdHex);

        console.log("Deploying SpinampUSDC...");
        console.log("Chainlink Functions Subscription ID:", subscriptionId);
        console.log("USDC Address:", usdcAddress);
        console.log("Chainlink Functions Router:", router);
        console.log("Chainlink Functions DON ID:");
        console.logBytes32(donId);
        console.log("Fee Recipient:", feeRecipient);

        // Deploy the contract
        vm.startBroadcast();
        spinampUSDC = new SpinampUSDC(subscriptionId, usdcAddress, router, donId, feeRecipient);
        vm.stopBroadcast();

        console.log("SpinampUSDC deployed at:", address(spinampUSDC));

        // Verify deployment
        require(address(spinampUSDC) != address(0), "Deployment failed");
        require(address(spinampUSDC.usdcToken()) == usdcAddress, "USDC address mismatch");
        require(spinampUSDC.s_subscriptionId() == subscriptionId, "Subscription ID mismatch");
        require(spinampUSDC.creationFee() == 5 * 10**6, "Creation fee should be $5 USDC (5e6)");

        console.log("Deployment successful!");
        console.log("Contract address:", address(spinampUSDC));
        console.log("");
        console.log("Next steps:");
        console.log("1. Add this contract address as a Consumer in Chainlink Functions UI");
        console.log("2. Register contract with Chainlink Automation registry");
        console.log("   Registry address: 0xf4bAb6A129164aBa9B113cB96BA4266dF49f8743");
        console.log("   Visit: https://automation.chain.link/");
        console.log("3. Fund subscription with LINK for Functions requests");
        console.log("4. Verify the contract on BaseScan");
        console.log("5. Create first weekly market using createWeeklyMarket()");
    }
}

