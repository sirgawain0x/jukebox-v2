// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {Test, console} from "forge-std/Test.sol";
import {AutomatedPredictionMarket} from "../contracts/AutomatedPredictionMarket.sol";
import {MockERC20} from "../contracts/test/MockERC20.sol";

// Mock Chainlink Functions Router
contract MockFunctionsRouter {
    mapping(bytes32 => bool) public s_fulfilled;
    mapping(bytes32 => bytes) public s_responses;

    function sendRequest(
        uint64 subscriptionId,
        bytes calldata data,
        uint16 dataVersion,
        uint32 callbackGasLimit,
        bytes32 donId
    ) external returns (bytes32 requestId) {
        requestId = keccak256(abi.encodePacked(block.timestamp, msg.sender, subscriptionId));
        return requestId;
    }

    function fulfillRequest(bytes32 requestId, bytes memory response) external {
        s_fulfilled[requestId] = true;
        s_responses[requestId] = response;
    }
}

contract AutomatedPredictionMarketTest is Test {
    AutomatedPredictionMarket public market;
    MockERC20 public usdc;
    MockFunctionsRouter public mockRouter;

    address public owner = address(1);
    address public user1 = address(3);
    address public user2 = address(4);
    address public user3 = address(5);

    uint256 public constant USDC_DECIMALS = 6;
    uint256 public constant INITIAL_BALANCE = 1000000 * 10**USDC_DECIMALS; // 1M USDC
    uint64 public constant SUBSCRIPTION_ID = 1;

    event MarketCreated(uint256 indexed marketId, uint256 resolveTime);
    event BetPlaced(uint256 indexed marketId, address user, string prediction, uint256 amount);
    event MarketResolved(uint256 indexed marketId, string winningTrack, uint256 netPool, uint256 feesCollected);
    event WinningsClaimed(uint256 indexed marketId, address user, uint256 amount);

    function setUp() public {
        // Deploy mock USDC
        usdc = new MockERC20("USD Coin", "USDC", 6);

        // Mint USDC to users
        usdc.mint(user1, INITIAL_BALANCE);
        usdc.mint(user2, INITIAL_BALANCE);
        usdc.mint(user3, INITIAL_BALANCE);

        // Deploy mock router (simplified for testing)
        mockRouter = new MockFunctionsRouter();

        // Use test values for Router and DON_ID (these don't matter for unit tests)
        address testRouter = address(mockRouter);
        bytes32 testDonId = 0x66756e2d626173652d7365706f6c69612d310000000000000000000000000000;

        // Deploy AutomatedPredictionMarket as owner
        vm.prank(owner);
        market = new AutomatedPredictionMarket(SUBSCRIPTION_ID, address(usdc), testRouter, testDonId);
    }

    // ============ Market Creation Tests ============

    function test_CreateWeeklyMarket() public {
        vm.prank(owner);
        market.createWeeklyMarket();

        assertEq(market.s_marketCount(), 1, "Market count should be 1");

        (uint256 id, uint256 endTime, uint256 resolveTime, bool resolved, string memory winningTrack, uint256 totalPool) =
            market.markets(1);

        assertEq(id, 1, "Market ID should be 1");
        assertGt(resolveTime, block.timestamp, "Resolve time should be in future");
        assertEq(endTime, resolveTime - 1 hours, "End time should be 1 hour before resolve time");
        assertEq(resolved, false, "Market should not be resolved");
        assertEq(bytes(winningTrack).length, 0, "Winning track should be empty");
        assertEq(totalPool, 0, "Total pool should be 0");
    }

    function test_GetNextMondayEST() public {
        uint256 nextMonday = market.getNextMondayEST();
        assertGt(nextMonday, block.timestamp, "Next Monday should be in future");
    }

    function test_CreateWeeklyMarket_OnlyOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        market.createWeeklyMarket();
    }

    // ============ Betting Tests ============

    function test_PlaceBet() public {
        vm.prank(owner);
        market.createWeeklyMarket();

        uint256 betAmount = 100 * 10**USDC_DECIMALS;
        string memory trackTitle = "Song Title";

        vm.prank(user1);
        usdc.approve(address(market), betAmount);

        vm.prank(user1);
        vm.expectEmit(true, false, false, true);
        emit BetPlaced(1, user1, trackTitle, betAmount);
        market.placeBet(1, trackTitle, betAmount);

        (,,,,, uint256 totalPool) = market.markets(1);
        assertEq(totalPool, betAmount, "Total pool should equal bet amount");

        AutomatedPredictionMarket.Bet[] memory bets = market.getMarketBets(1);
        assertEq(bets.length, 1, "Should have one bet");
        assertEq(bets[0].user, user1, "Bet user should match");
        assertEq(bets[0].predictedTrack, trackTitle, "Predicted track should match");
        assertEq(bets[0].amount, betAmount, "Bet amount should match");
        assertEq(bets[0].claimed, false, "Bet should not be claimed");
    }

    function test_PlaceBet_MultipleUsers() public {
        vm.prank(owner);
        market.createWeeklyMarket();

        uint256 betAmount1 = 100 * 10**USDC_DECIMALS;
        uint256 betAmount2 = 200 * 10**USDC_DECIMALS;
        string memory track1 = "Track 1";
        string memory track2 = "Track 2";

        vm.startPrank(user1);
        usdc.approve(address(market), betAmount1);
        market.placeBet(1, track1, betAmount1);
        vm.stopPrank();

        vm.startPrank(user2);
        usdc.approve(address(market), betAmount2);
        market.placeBet(1, track2, betAmount2);
        vm.stopPrank();

        (,,,,, uint256 totalPool) = market.markets(1);
        assertEq(totalPool, betAmount1 + betAmount2, "Total pool should equal sum of bets");

        AutomatedPredictionMarket.Bet[] memory bets = market.getMarketBets(1);
        assertEq(bets.length, 2, "Should have two bets");
    }

    function test_PlaceBet_BettingClosed() public {
        vm.prank(owner);
        market.createWeeklyMarket();

        // Fast forward past end time
        (,, uint256 resolveTime,,,) = market.markets(1);
        uint256 endTime = resolveTime - 1 hours;
        vm.warp(endTime + 1);

        uint256 betAmount = 100 * 10**USDC_DECIMALS;
        vm.prank(user1);
        usdc.approve(address(market), betAmount);

        vm.prank(user1);
        vm.expectRevert("Betting closed");
        market.placeBet(1, "Track", betAmount);
    }

    function test_PlaceBet_MarketNotExists() public {
        uint256 betAmount = 100 * 10**USDC_DECIMALS;
        vm.prank(user1);
        usdc.approve(address(market), betAmount);

        vm.prank(user1);
        vm.expectRevert("Market does not exist");
        market.placeBet(999, "Track", betAmount);
    }

    function test_PlaceBet_EmptyTrackTitle() public {
        vm.prank(owner);
        market.createWeeklyMarket();

        uint256 betAmount = 100 * 10**USDC_DECIMALS;
        vm.prank(user1);
        usdc.approve(address(market), betAmount);

        vm.prank(user1);
        vm.expectRevert("Track title cannot be empty");
        market.placeBet(1, "", betAmount);
    }

    // ============ Resolution Tests ============

    function test_CheckUpkeep_NotReady() public {
        vm.prank(owner);
        market.createWeeklyMarket();

        (bool upkeepNeeded, bytes memory performData) = market.checkUpkeep("");
        assertEq(upkeepNeeded, false, "Upkeep should not be needed");
        assertEq(performData.length, 0, "Perform data should be empty");
    }

    function test_CheckUpkeep_Ready() public {
        vm.prank(owner);
        market.createWeeklyMarket();

        // Fast forward to resolve time
        (,, uint256 resolveTime,,,) = market.markets(1);
        vm.warp(resolveTime);

        (bool upkeepNeeded, bytes memory performData) = market.checkUpkeep("");
        assertEq(upkeepNeeded, true, "Upkeep should be needed");
        assertGt(performData.length, 0, "Perform data should not be empty");
    }

    // Note: Full resolution testing would require mocking Chainlink Functions
    // This is a simplified test that verifies the structure

    // ============ Fee Calculation Tests ============

    function test_FeeCalculation() public {
        assertEq(market.protocolFeeBasisPoints(), 1000, "Fee should be 10% (1000 basis points)");

        uint256 pool = 1000 * 10**USDC_DECIMALS;
        uint256 expectedFee = (pool * 1000) / 10000; // 10%
        uint256 expectedNet = pool - expectedFee;

        assertEq(expectedFee, 100 * 10**USDC_DECIMALS, "Fee should be 100 USDC");
        assertEq(expectedNet, 900 * 10**USDC_DECIMALS, "Net pool should be 900 USDC");
    }

    // ============ Claiming Tests ============

    function test_ClaimWinnings_NotResolved() public {
        vm.prank(owner);
        market.createWeeklyMarket();

        vm.prank(user1);
        vm.expectRevert("Market not resolved");
        market.claimWinnings(1);
    }

    // Note: Full claiming tests would require resolving the market first
    // which needs Chainlink Functions integration

    // ============ Admin Functions Tests ============

    function test_WithdrawFees_OnlyOwner() public {
        // Set some accumulated fees (would normally come from resolution)
        // For testing, we'll need to manually set this or resolve a market

        vm.prank(user1);
        vm.expectRevert();
        market.withdrawFees();
    }

    // ============ Edge Cases ============

    function test_MultipleMarkets() public {
        vm.startPrank(owner);
        market.createWeeklyMarket();
        market.createWeeklyMarket();
        market.createWeeklyMarket();
        vm.stopPrank();

        assertEq(market.s_marketCount(), 3, "Should have 3 markets");
    }

    function test_PlaceBet_ZeroAmount() public {
        vm.prank(owner);
        market.createWeeklyMarket();

        vm.prank(user1);
        usdc.approve(address(market), 0);

        vm.prank(user1);
        vm.expectRevert("Bet amount must be > 0");
        market.placeBet(1, "Track", 0);
    }
}
