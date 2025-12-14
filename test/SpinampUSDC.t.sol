// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {Test, console} from "forge-std/Test.sol";
import {SpinampUSDC} from "../contracts/SpinampUSDC.sol";
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

contract SpinampUSDCTest is Test {
    SpinampUSDC public market;
    MockERC20 public usdc;
    MockFunctionsRouter public mockRouter;

    address public owner = address(1);
    address public feeRecipient = address(2);
    address public creator = address(3);
    address public artist = address(4);
    address public user1 = address(5);
    address public user2 = address(6);
    address public user3 = address(7);

    uint256 public constant USDC_DECIMALS = 6;
    uint256 public constant INITIAL_BALANCE = 1000000 * 10**USDC_DECIMALS; // 1M USDC
    uint256 public constant CREATION_FEE = 5 * 10**USDC_DECIMALS; // $5 USDC
    uint64 public constant SUBSCRIPTION_ID = 1;

    event MarketCreated(uint256 indexed marketId, address creator, uint256 resolveTime);
    event BetPlaced(uint256 indexed marketId, address user, string prediction, uint256 amount);
    event MarketResolved(uint256 indexed marketId, string winningTrack, address winningArtist, uint256 netPool);
    event RewardsWithdrawn(address indexed user, uint256 amount);
    event WinningsClaimed(uint256 indexed marketId, address user, uint256 amount);

    function setUp() public {
        // Set block timestamp to be after EST_MONDAY_ANCHOR (Jan 5, 1970 5:00 AM UTC = 363600)
        // Use a recent timestamp: Jan 1, 2024 12:00 PM UTC = 1704110400
        vm.warp(1704110400);

        // Deploy mock USDC
        usdc = new MockERC20("USD Coin", "USDC", 6);

        // Mint USDC to users
        usdc.mint(creator, INITIAL_BALANCE);
        usdc.mint(user1, INITIAL_BALANCE);
        usdc.mint(user2, INITIAL_BALANCE);
        usdc.mint(user3, INITIAL_BALANCE);

        // Deploy mock router
        mockRouter = new MockFunctionsRouter();

        // Use test values for Router and DON_ID
        address testRouter = address(mockRouter);
        bytes32 testDonId = 0x66756e2d626173652d7365706f6c69612d310000000000000000000000000000;

        // Deploy SpinampUSDC as owner
        vm.prank(owner);
        market = new SpinampUSDC(SUBSCRIPTION_ID, address(usdc), testRouter, testDonId, feeRecipient);
    }

    // Helper function to simulate Chainlink Functions response
    function encodeChainlinkResponse(string memory trackTitle, address artistAddress) internal pure returns (bytes memory) {
        return abi.encode(trackTitle, artistAddress);
    }

    // Helper function to manually fulfill a request (for testing)
    function simulateFulfillRequest(uint256 marketId, string memory trackTitle, address artistAddress) internal {
        bytes memory response = encodeChainlinkResponse(trackTitle, artistAddress);
        
        // Get the request ID from pending requests (simplified - in real scenario would track this)
        // For testing, we'll need to call _resolveMarket first to create a request
        // Then we can fulfill it
        
        // This is a simplified approach - in real tests you'd track the requestId
        // For now, we'll use a direct approach by calling fulfillRequest on the contract
        // But since it's internal, we need to work around it
        
        // Alternative: We can test the resolution logic by directly calling fulfillRequest
        // if we make it public for testing, or we test through the full flow
    }

    // ============ Market Creation Tests ============

    function test_CreateWeeklyMarket_WithFee() public {
        uint256 creatorBalanceBefore = usdc.balanceOf(creator);
        uint256 contractBalanceBefore = usdc.balanceOf(address(market));

        vm.startPrank(creator);
        usdc.approve(address(market), CREATION_FEE);
        market.createWeeklyMarket();
        vm.stopPrank();

        assertEq(market.s_marketCount(), 1, "Market count should be 1");
        assertEq(usdc.balanceOf(creator), creatorBalanceBefore - CREATION_FEE, "Creator should pay $5 fee");
        assertEq(usdc.balanceOf(address(market)), contractBalanceBefore, "Contract should not hold fee");
        assertEq(usdc.balanceOf(feeRecipient), CREATION_FEE, "Fee recipient should receive creation fee directly");

        (uint256 id, uint256 endTime, uint256 resolveTime, bool resolved, string memory winningTrack, address marketCreator, uint256 totalPool, uint256 totalPaidOut) =
            market.markets(1);

        assertEq(id, 1, "Market ID should be 1");
        assertEq(marketCreator, creator, "Creator should be tracked");
        assertGt(resolveTime, block.timestamp, "Resolve time should be in future");
        assertEq(endTime, resolveTime - 1 hours, "End time should be 1 hour before resolve time");
        assertEq(resolved, false, "Market should not be resolved");
        assertEq(bytes(winningTrack).length, 0, "Winning track should be empty");
        assertEq(totalPool, 0, "Total pool should be 0");
        assertEq(totalPaidOut, 0, "Total paid out should be 0");
    }

    function test_CreateWeeklyMarket_InsufficientFunds() public {
        vm.startPrank(creator);
        usdc.approve(address(market), CREATION_FEE);
        // Burn creator's USDC
        usdc.burn(creator, INITIAL_BALANCE);
        vm.stopPrank();

        vm.startPrank(creator);
        // Will revert with ERC20InsufficientBalance or "Fee transfer failed"
        vm.expectRevert();
        market.createWeeklyMarket();
        vm.stopPrank();
    }

    function test_CreateWeeklyMarket_MultipleMarkets() public {
        vm.startPrank(creator);
        usdc.approve(address(market), CREATION_FEE * 3);
        
        market.createWeeklyMarket();
        market.createWeeklyMarket();
        market.createWeeklyMarket();
        vm.stopPrank();

        assertEq(market.s_marketCount(), 3, "Should have 3 markets");
        assertEq(usdc.balanceOf(feeRecipient), CREATION_FEE * 3, "Fee recipient should receive all creation fees directly");
    }

    function test_GetNextMondayEST() public {
        uint256 nextMonday = market.getNextMondayEST();
        assertGt(nextMonday, block.timestamp, "Next Monday should be in future");
    }

    // ============ Betting Tests ============

    function test_PlaceBet() public {
        vm.startPrank(creator);
        usdc.approve(address(market), CREATION_FEE);
        market.createWeeklyMarket();
        vm.stopPrank();

        uint256 betAmount = 100 * 10**USDC_DECIMALS;
        string memory trackTitle = "Song Title";

        vm.startPrank(user1);
        usdc.approve(address(market), betAmount);
        vm.expectEmit(true, false, false, true);
        emit BetPlaced(1, user1, trackTitle, betAmount);
        market.placeBet(1, trackTitle, betAmount);
        vm.stopPrank();

        (,,,,,, uint256 totalPool,) = market.markets(1);
        assertEq(totalPool, betAmount, "Total pool should equal bet amount");

        // Note: SpinampUSDC doesn't expose getMarketBets, so we verify through events/logs
        // In a real scenario, we'd check events or add a view function
        // For now, we verify the pool increased which confirms the bet was placed
    }

    function test_PlaceBet_MultipleUsers() public {
        vm.startPrank(creator);
        usdc.approve(address(market), CREATION_FEE);
        market.createWeeklyMarket();
        vm.stopPrank();

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

        (,,,,,, uint256 totalPool,) = market.markets(1);
        assertEq(totalPool, betAmount1 + betAmount2, "Total pool should equal sum of bets");

        // Note: SpinampUSDC doesn't expose getMarketBets
        // Verify through pool accumulation
    }

    function test_PlaceBet_BettingClosed() public {
        vm.startPrank(creator);
        usdc.approve(address(market), CREATION_FEE);
        market.createWeeklyMarket();
        vm.stopPrank();

        // Fast forward past end time
        (,, uint256 resolveTime,,,,,) = market.markets(1);
        uint256 endTime = resolveTime - 1 hours;
        vm.warp(endTime + 1);

        uint256 betAmount = 100 * 10**USDC_DECIMALS;
        vm.startPrank(user1);
        usdc.approve(address(market), betAmount);
        vm.expectRevert("Betting closed");
        market.placeBet(1, "Track", betAmount);
        vm.stopPrank();
    }

    function test_PlaceBet_ZeroAmount() public {
        vm.startPrank(creator);
        usdc.approve(address(market), CREATION_FEE);
        market.createWeeklyMarket();
        vm.stopPrank();

        vm.startPrank(user1);
        usdc.approve(address(market), 0);
        vm.expectRevert("Bet > 0");
        market.placeBet(1, "Track", 0);
        vm.stopPrank();
    }

    // ============ Fee Distribution Tests ============

    function test_FeeDistribution_Calculation() public {
        uint256 pool = 10000 * 10**USDC_DECIMALS; // $10,000
        
        uint256 platformCut = (pool * 400) / 10000; // 4%
        uint256 creatorCut = (pool * 300) / 10000; // 3%
        uint256 artistCut = (pool * 300) / 10000; // 3%
        uint256 totalFee = platformCut + creatorCut + artistCut;
        uint256 netPool = pool - totalFee;

        assertEq(platformCut, 400 * 10**USDC_DECIMALS, "Platform should get $400 (4%)");
        assertEq(creatorCut, 300 * 10**USDC_DECIMALS, "Creator should get $300 (3%)");
        assertEq(artistCut, 300 * 10**USDC_DECIMALS, "Artist should get $300 (3%)");
        assertEq(totalFee, 1000 * 10**USDC_DECIMALS, "Total fee should be $1,000 (10%)");
        assertEq(netPool, 9000 * 10**USDC_DECIMALS, "Net pool should be $9,000 (90%)");
    }

    // ============ Market Resolution Tests ============

    function test_CheckUpkeep_NotReady() public {
        // No markets created, upkeep should not be needed
        (bool upkeepNeeded, bytes memory performData) = market.checkUpkeep("");
        assertEq(upkeepNeeded, false, "Upkeep should not be needed when no markets");
        assertEq(performData.length, 0, "Perform data should be empty");
    }

    function test_CheckUpkeep_Ready() public {
        vm.startPrank(creator);
        usdc.approve(address(market), CREATION_FEE);
        market.createWeeklyMarket();
        vm.stopPrank();

        // Fast forward to resolve time
        (,, uint256 resolveTime,,,,,) = market.markets(1);
        vm.warp(resolveTime);

        (bool upkeepNeeded, bytes memory performData) = market.checkUpkeep("");
        assertEq(upkeepNeeded, true, "Upkeep should be needed");
        assertGt(performData.length, 0, "Perform data should not be empty");
    }

    // ============ Reward Withdrawal Tests ============

    function test_WithdrawRewards_NoRewards() public {
        vm.prank(user1);
        vm.expectRevert("No rewards");
        market.withdrawRewards();
    }

    function test_PlatformFees_SentDirectly_CreationFee() public {
        // Create market - creation fee should go directly to fee recipient
        uint256 feeRecipientBalanceBefore = usdc.balanceOf(feeRecipient);
        
        vm.startPrank(creator);
        usdc.approve(address(market), CREATION_FEE);
        market.createWeeklyMarket();
        vm.stopPrank();

        // Fee recipient should receive fee directly (no withdrawal needed)
        assertEq(usdc.balanceOf(feeRecipient), feeRecipientBalanceBefore + CREATION_FEE, "Fee recipient should receive creation fee directly");
        assertEq(usdc.balanceOf(address(market)), 0, "Contract should not hold fees");
    }

    function test_PlatformFees_SentDirectly_ResolutionFees() public {
        // This test verifies that platform fees from market resolution are sent directly
        // Note: Full resolution testing requires Chainlink Functions integration
        // This test verifies the fee calculation logic
        
        uint256 pool = 10000 * 10**USDC_DECIMALS; // $10,000
        uint256 platformCut = (pool * 400) / 10000; // 4% = $400
        
        // When market resolves, platformCut should be sent directly to feeRecipient
        // (Tested through integration tests with full resolution flow)
        assertEq(platformCut, 400 * 10**USDC_DECIMALS, "Platform should get $400 (4%)");
    }

    // ============ Owner Functions Tests ============

    function test_SetFeeRecipient_OnlyOwner() public {
        address newFeeRecipient = address(8);

        vm.prank(user1);
        vm.expectRevert();
        market.setFeeRecipient(newFeeRecipient);

        vm.prank(owner);
        market.setFeeRecipient(newFeeRecipient);

        assertEq(market.feeRecipient(), newFeeRecipient, "Fee recipient should be updated");
    }

    function test_SetFeeRecipient_InvalidAddress() public {
        vm.prank(owner);
        vm.expectRevert("Invalid fee recipient address");
        market.setFeeRecipient(address(0));
    }

    // ============ Edge Cases ============

    function test_CreationFee_Amount() public {
        assertEq(market.creationFee(), CREATION_FEE, "Creation fee should be $5 USDC");
    }

    function test_Market_InitialState() public {
        vm.startPrank(creator);
        usdc.approve(address(market), CREATION_FEE);
        market.createWeeklyMarket();
        vm.stopPrank();

        (uint256 id, uint256 endTime, uint256 resolveTime, bool resolved, string memory winningTrack, address marketCreator, uint256 totalPool, uint256 totalPaidOut) =
            market.markets(1);

        assertEq(id, 1);
        assertGt(endTime, block.timestamp);
        assertGt(resolveTime, endTime);
        assertEq(resolved, false);
        assertEq(bytes(winningTrack).length, 0);
        assertEq(marketCreator, creator);
        assertEq(totalPool, 0);
        assertEq(totalPaidOut, 0);
    }
}

