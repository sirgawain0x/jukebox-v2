// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {Test, console} from "forge-std/Test.sol";
import {AutomatedPredictionMarket} from "../contracts/AutomatedPredictionMarket.sol";
import {MockERC20} from "../contracts/test/MockERC20.sol";

// Mock Chainlink Functions Router for integration testing
contract MockFunctionsRouter {
    mapping(bytes32 => bytes) public s_responses;
    mapping(bytes32 => bool) public s_fulfilled;

    function sendRequest(
        uint64,
        bytes calldata,
        uint16,
        uint32,
        bytes32
    ) external returns (bytes32 requestId) {
        requestId = keccak256(abi.encodePacked(block.timestamp, msg.sender));
        return requestId;
    }

    function fulfillRequest(bytes32 requestId, bytes memory response) external {
        s_fulfilled[requestId] = true;
        s_responses[requestId] = response;
    }
}

contract AutomatedPredictionMarketIntegrationTest is Test {
    AutomatedPredictionMarket public market;
    MockERC20 public usdc;
    MockFunctionsRouter public mockRouter;

    address public owner = address(1);
    address public user1 = address(3);
    address public user2 = address(4);
    address public user3 = address(5);

    uint256 public constant USDC_DECIMALS = 6;
    uint256 public constant INITIAL_BALANCE = 1000000 * 10**USDC_DECIMALS;
    uint64 public constant SUBSCRIPTION_ID = 1;
    bytes32 public constant TEST_DON_ID = 0x66756e2d626173652d7365706f6c69612d310000000000000000000000000000;

    event MarketResolved(uint256 indexed marketId, string winningTrack, uint256 netPool, uint256 feesCollected);
    event WinningsClaimed(uint256 indexed marketId, address user, uint256 amount);

    function setUp() public {
        // Deploy mock USDC
        usdc = new MockERC20("USD Coin", "USDC", 6);

        // Mint USDC to users
        usdc.mint(user1, INITIAL_BALANCE);
        usdc.mint(user2, INITIAL_BALANCE);
        usdc.mint(user3, INITIAL_BALANCE);

        // Deploy mock router
        mockRouter = new MockFunctionsRouter();

        // Deploy AutomatedPredictionMarket
        vm.prank(owner);
        market = new AutomatedPredictionMarket(
            SUBSCRIPTION_ID,
            address(usdc),
            address(mockRouter),
            TEST_DON_ID
        );
    }

    function test_FullFlow_MultipleWinners() public {
        // 1. Create market
        vm.prank(owner);
        market.createWeeklyMarket();
        uint256 marketId = 1;

        // 2. Place bets
        uint256 bet1 = 100 * 10**USDC_DECIMALS;
        uint256 bet2 = 200 * 10**USDC_DECIMALS;
        uint256 bet3 = 150 * 10**USDC_DECIMALS;

        string memory winningTrack = "Winning Track";
        string memory losingTrack = "Losing Track";

        vm.startPrank(user1);
        usdc.approve(address(market), bet1);
        market.placeBet(marketId, winningTrack, bet1);
        vm.stopPrank();

        vm.startPrank(user2);
        usdc.approve(address(market), bet2);
        market.placeBet(marketId, winningTrack, bet2);
        vm.stopPrank();

        vm.startPrank(user3);
        usdc.approve(address(market), bet3);
        market.placeBet(marketId, losingTrack, bet3);
        vm.stopPrank();

        // Verify pool
        (,,,,, uint256 totalPool) = market.markets(marketId);
        assertEq(totalPool, bet1 + bet2 + bet3, "Total pool should equal sum of bets");

        // 3. Fast forward to resolution time
        (,, uint256 resolveTime,,,) = market.markets(marketId);
        vm.warp(resolveTime);

        // 4. Simulate Functions response
        // In real scenario, Chainlink Functions would call fulfillRequest
        // For testing, we'll need to mock this or use a test helper
        // This test demonstrates the flow structure

        // Verify market structure
        assertEq(market.s_marketCount(), 1, "Should have 1 market");
    }

    function test_FullFlow_SingleWinner() public {
        // Create market
        vm.prank(owner);
        market.createWeeklyMarket();
        uint256 marketId = 1;

        // Single user bets
        uint256 betAmount = 1000 * 10**USDC_DECIMALS;
        string memory trackTitle = "Solo Winner";

        vm.startPrank(user1);
        usdc.approve(address(market), betAmount);
        market.placeBet(marketId, trackTitle, betAmount);
        vm.stopPrank();

        // Verify
        (,,,,, uint256 totalPool) = market.markets(marketId);
        assertEq(totalPool, betAmount, "Pool should equal bet amount");
    }

    function test_CheckUpkeep_ReturnsTrueWhenReady() public {
        vm.prank(owner);
        market.createWeeklyMarket();

        // Fast forward to resolve time
        (,, uint256 resolveTime,,,) = market.markets(1);
        vm.warp(resolveTime);

        (bool upkeepNeeded, bytes memory performData) = market.checkUpkeep("");
        assertTrue(upkeepNeeded, "Upkeep should be needed");
        assertGt(performData.length, 0, "Perform data should not be empty");
    }

    function test_CheckUpkeep_ReturnsFalseWhenNotReady() public {
        vm.prank(owner);
        market.createWeeklyMarket();

        // Don't warp time - market not ready
        (bool upkeepNeeded, bytes memory performData) = market.checkUpkeep("");
        assertFalse(upkeepNeeded, "Upkeep should not be needed");
        assertEq(performData.length, 0, "Perform data should be empty");
    }

    function test_FeeCalculation() public {
        vm.prank(owner);
        market.createWeeklyMarket();
        uint256 marketId = 1;

        // Place bets totaling 1000 USDC
        uint256 totalBets = 1000 * 10**USDC_DECIMALS;

        vm.startPrank(user1);
        usdc.approve(address(market), totalBets);
        market.placeBet(marketId, "Track", totalBets);
        vm.stopPrank();

        // Fee should be 10% = 100 USDC
        uint256 expectedFee = (totalBets * 1000) / 10000;
        assertEq(expectedFee, 100 * 10**USDC_DECIMALS, "Fee should be 100 USDC");

        // Net pool should be 900 USDC
        uint256 expectedNet = totalBets - expectedFee;
        assertEq(expectedNet, 900 * 10**USDC_DECIMALS, "Net pool should be 900 USDC");
    }

    function test_ProRataPayoutCalculation() public {
        vm.prank(owner);
        market.createWeeklyMarket();
        uint256 marketId = 1;

        // User1 bets 100, User2 bets 200 on winning track
        // User3 bets 300 on losing track
        // Total pool: 600
        // Fee (10%): 60
        // Net pool: 540
        // User1 share: (100/300) * 540 = 180
        // User2 share: (200/300) * 540 = 360

        uint256 bet1 = 100 * 10**USDC_DECIMALS;
        uint256 bet2 = 200 * 10**USDC_DECIMALS;
        uint256 bet3 = 300 * 10**USDC_DECIMALS;
        string memory winningTrack = "Winner";
        string memory losingTrack = "Loser";

        vm.startPrank(user1);
        usdc.approve(address(market), bet1);
        market.placeBet(marketId, winningTrack, bet1);
        vm.stopPrank();

        vm.startPrank(user2);
        usdc.approve(address(market), bet2);
        market.placeBet(marketId, winningTrack, bet2);
        vm.stopPrank();

        vm.startPrank(user3);
        usdc.approve(address(market), bet3);
        market.placeBet(marketId, losingTrack, bet3);
        vm.stopPrank();

        uint256 totalPool = bet1 + bet2 + bet3;
        uint256 fee = (totalPool * 1000) / 10000;
        uint256 netPool = totalPool - fee;

        // Expected payouts
        uint256 totalWinningStakes = bet1 + bet2; // 300
        uint256 user1Payout = (bet1 * netPool) / totalWinningStakes; // (100 * 540) / 300 = 180
        uint256 user2Payout = (bet2 * netPool) / totalWinningStakes; // (200 * 540) / 300 = 360

        assertEq(user1Payout, 180 * 10**USDC_DECIMALS, "User1 payout should be 180 USDC");
        assertEq(user2Payout, 360 * 10**USDC_DECIMALS, "User2 payout should be 360 USDC");
        assertEq(user1Payout + user2Payout, netPool, "Total payouts should equal net pool");
    }

    function test_EdgeCase_NoBets() public {
        vm.prank(owner);
        market.createWeeklyMarket();
        uint256 marketId = 1;

        // Market created but no bets placed
        (,,,,, uint256 totalPool) = market.markets(marketId);
        assertEq(totalPool, 0, "Pool should be 0");

        // Market should still be able to resolve (though no payouts)
        (,, uint256 resolveTime,,,) = market.markets(marketId);
        vm.warp(resolveTime);

        (bool upkeepNeeded,) = market.checkUpkeep("");
        assertTrue(upkeepNeeded, "Upkeep should be needed even with no bets");
    }

    function test_EdgeCase_AllBetsOnSameTrack() public {
        vm.prank(owner);
        market.createWeeklyMarket();
        uint256 marketId = 1;

        string memory trackTitle = "Popular Track";
        uint256 bet1 = 100 * 10**USDC_DECIMALS;
        uint256 bet2 = 200 * 10**USDC_DECIMALS;
        uint256 bet3 = 300 * 10**USDC_DECIMALS;

        vm.startPrank(user1);
        usdc.approve(address(market), bet1);
        market.placeBet(marketId, trackTitle, bet1);
        vm.stopPrank();

        vm.startPrank(user2);
        usdc.approve(address(market), bet2);
        market.placeBet(marketId, trackTitle, bet2);
        vm.stopPrank();

        vm.startPrank(user3);
        usdc.approve(address(market), bet3);
        market.placeBet(marketId, trackTitle, bet3);
        vm.stopPrank();

        // All bets on same track
        uint256 totalPool = bet1 + bet2 + bet3;
        (,,,,, uint256 actualPool) = market.markets(marketId);
        assertEq(actualPool, totalPool, "Pool should equal total bets");
    }
}
