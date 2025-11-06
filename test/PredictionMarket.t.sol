// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Test, console} from "forge-std/Test.sol";
import {PredictionMarket} from "../contracts/PredictionMarket.sol";
import {MockERC20} from "../contracts/test/MockERC20.sol";

contract PredictionMarketTest is Test {
    PredictionMarket public market;
    MockERC20 public usdc;
    
    address public owner = address(1);
    address public feeRecipient = address(2);
    address public user1 = address(3);
    address public user2 = address(4);
    address public user3 = address(5);
    
    uint256 public constant PLATFORM_FEE_BPS = 100; // 1%
    uint256 public constant USDC_DECIMALS = 6;
    uint256 public constant INITIAL_BALANCE = 1000000 * 10**USDC_DECIMALS; // 1M USDC
    uint256 public constant TIMELOCK_DELAY = 1 days;
    uint256 public constant MIN_MARKET_DURATION = 1 days;
    
    event MarketCreated(uint256 indexed marketId, string songId, uint256 endTime, uint256 maxBetAmount);
    event BetPlaced(uint256 indexed marketId, address indexed user, bool side, uint256 amount);
    event MarketResolved(uint256 indexed marketId, bool winner, uint256 totalPayout);
    event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 amount);
    event ResolutionScheduled(uint256 indexed marketId, bool winner, uint256 executeTime);

    function setUp() public {
        // Deploy mock USDC
        usdc = new MockERC20("USD Coin", "USDC", 6);
        
        // Mint USDC to users
        usdc.mint(user1, INITIAL_BALANCE);
        usdc.mint(user2, INITIAL_BALANCE);
        usdc.mint(user3, INITIAL_BALANCE);
        
        // Deploy PredictionMarket as owner
        vm.prank(owner);
        market = new PredictionMarket(
            address(usdc),
            feeRecipient,
            PLATFORM_FEE_BPS,
            TIMELOCK_DELAY,
            MIN_MARKET_DURATION
        );
    }

    // ============ Market Creation Tests ============

    function test_CreateMarket() public {
        string memory songId = "song-123";
        uint256 endTime = block.timestamp + 7 days;
        uint256 maxBetAmount = 0; // No limit

        
        vm.expectEmit(true, false, false, true);
        emit MarketCreated(0, songId, endTime, maxBetAmount);
        
        uint256 marketId = market.createMarket(songId, endTime, maxBetAmount);
        
        assertEq(marketId, 0, "Market ID should be 0");
        assertEq(market.marketCount(), 1, "Market count should be 1");
        
        // Market struct has 8 fields: songId, endTime, resolved, winner, cancelled, totalPoolYes, totalPoolNo, maxBetAmount
        (string memory storedSongId, uint256 storedEndTime, bool isResolved, bool isWinner, bool isCancelled, uint256 poolYes, uint256 poolNo, uint256 storedMaxBetAmount) = 
            market.markets(0);
        
        assertEq(storedSongId, songId, "Song ID should match");
        assertEq(storedEndTime, endTime, "End time should match");
        assertEq(isResolved, false, "Market should not be resolved");
        assertEq(poolYes, 0, "YES pool should be 0");
        assertEq(poolNo, 0, "NO pool should be 0");
        assertEq(storedMaxBetAmount, maxBetAmount, "Max bet amount should match");
    }

    function test_CreateMarket_InvalidEndTime() public {
        uint256 pastTime = block.timestamp - 1;
        
        vm.expectRevert("End time must be in the future");
        market.createMarket("song-123", pastTime, 0);
    }

    function test_CreateMarket_EmptySongId() public {
        vm.expectRevert("Song ID cannot be empty");
        market.createMarket("", block.timestamp + 7 days, 0);
    }

    function test_CreateMarket_BelowMinimumDuration() public {
        uint256 endTime = block.timestamp + 1 hours; // Less than MIN_MARKET_DURATION
        
        vm.expectRevert("Market duration below minimum");
        market.createMarket("song-123", endTime, 0);
    }

    function test_CreateMultipleMarkets() public {
        market.createMarket("song-1", block.timestamp + 7 days, 0);
        market.createMarket("song-2", block.timestamp + 7 days, 0);
        market.createMarket("song-3", block.timestamp + 7 days, 0);
        
        assertEq(market.marketCount(), 3, "Should have 3 markets");
    }

    // ============ Betting Tests ============

    function test_PlaceBet_YES() public {
        uint256 marketId = market.createMarket("song-123", block.timestamp + 7 days, 0);
        uint256 betAmount = 100 * 10**USDC_DECIMALS; // 100 USDC
        
        vm.startPrank(user1);
        usdc.approve(address(market), betAmount);
        
        vm.expectEmit(true, true, false, true);
        emit BetPlaced(marketId, user1, true, betAmount);
        
        market.placeBet(marketId, betAmount, true);
        vm.stopPrank();
        
        (,,, bool winner, bool cancelled, uint256 poolYes, uint256 poolNo,) = market.markets(marketId);
        assertEq(poolYes, betAmount, "YES pool should equal bet amount");
        assertEq(poolNo, 0, "NO pool should be 0");
        
        (uint256 userYes, uint256 userNo,) = market.userBets(marketId, user1);
        assertEq(userYes, betAmount, "User YES bet should match");
        assertEq(userNo, 0, "User NO bet should be 0");
    }

    function test_PlaceBet_NO() public {
        uint256 marketId = market.createMarket("song-123", block.timestamp + 7 days, 0);
        uint256 betAmount = 50 * 10**USDC_DECIMALS; // 50 USDC
        
        vm.startPrank(user1);
        usdc.approve(address(market), betAmount);
        market.placeBet(marketId, betAmount, false);
        vm.stopPrank();
        
        (,,, bool winner, bool cancelled, uint256 poolYes, uint256 poolNo,) = market.markets(marketId);
        assertEq(poolYes, 0, "YES pool should be 0");
        assertEq(poolNo, betAmount, "NO pool should equal bet amount");
    }

    function test_PlaceBet_MaxBetLimit() public {
        uint256 maxBetAmount = 100 * 10**USDC_DECIMALS;
        uint256 marketId = market.createMarket("song-123", block.timestamp + 7 days, maxBetAmount);
        
        uint256 betAmount = 50 * 10**USDC_DECIMALS;
        
        vm.startPrank(user1);
        usdc.approve(address(market), betAmount * 3);
        
        // First bet should succeed
        market.placeBet(marketId, betAmount, true);
        
        // Second bet should succeed (total = 100, at limit)
        market.placeBet(marketId, betAmount, true);
        
        // Third bet should fail (total = 150, exceeds limit)
        vm.expectRevert("Bet exceeds maximum allowed");
        market.placeBet(marketId, betAmount, true);
        vm.stopPrank();
    }

    function test_PlaceBet_MultipleUsers() public {
        uint256 marketId = market.createMarket("song-123", block.timestamp + 7 days, 0);
        uint256 bet1 = 100 * 10**USDC_DECIMALS;
        uint256 bet2 = 200 * 10**USDC_DECIMALS;
        uint256 bet3 = 150 * 10**USDC_DECIMALS;
        
        // User1 bets YES
        vm.prank(user1);
        usdc.approve(address(market), bet1);
        vm.prank(user1);
        market.placeBet(marketId, bet1, true);
        
        // User2 bets NO
        vm.prank(user2);
        usdc.approve(address(market), bet2);
        vm.prank(user2);
        market.placeBet(marketId, bet2, false);
        
        // User3 bets YES
        vm.prank(user3);
        usdc.approve(address(market), bet3);
        vm.prank(user3);
        market.placeBet(marketId, bet3, true);
        
        (,,, bool winner, bool cancelled, uint256 poolYes, uint256 poolNo,) = market.markets(marketId);
        assertEq(poolYes, bet1 + bet3, "YES pool should be sum of YES bets");
        assertEq(poolNo, bet2, "NO pool should equal NO bet");
    }

    function test_PlaceBet_MarketResolved() public {
        uint256 marketId = market.createMarket("song-123", block.timestamp + 7 days, 0);
        
        // Fast forward past end time
        vm.warp(block.timestamp + 7 days + 1);
        
        vm.prank(owner);
        market.scheduleResolution(marketId, true);
        
        // Fast forward past timelock
        vm.warp(block.timestamp + TIMELOCK_DELAY + 1);
        
        market.executeResolution(marketId);
        
        uint256 betAmount = 100 * 10**USDC_DECIMALS;
        vm.startPrank(user1);
        usdc.approve(address(market), betAmount);
        
        vm.expectRevert("Market already resolved or cancelled");
        market.placeBet(marketId, betAmount, true);
        vm.stopPrank();
    }

    function test_PlaceBet_MarketEnded() public {
        uint256 marketId = market.createMarket("song-123", block.timestamp + MIN_MARKET_DURATION + 1 hours, 0);
        
        // Fast forward past end time
        vm.warp(block.timestamp + MIN_MARKET_DURATION + 2 hours);
        
        uint256 betAmount = 100 * 10**USDC_DECIMALS;
        vm.startPrank(user1);
        usdc.approve(address(market), betAmount);
        
        vm.expectRevert("Market has ended");
        market.placeBet(marketId, betAmount, true);
        vm.stopPrank();
    }

    function test_PlaceBet_ZeroAmount() public {
        uint256 marketId = market.createMarket("song-123", block.timestamp + 7 days, 0);
        
        vm.prank(user1);
        usdc.approve(address(market), type(uint256).max);
        
        vm.prank(user1);
        vm.expectRevert("Bet amount must be greater than 0");
        market.placeBet(marketId, 0, true);
    }

    function test_PlaceBet_InvalidMarket() public {
        uint256 betAmount = 100 * 10**USDC_DECIMALS;
        
        vm.startPrank(user1);
        usdc.approve(address(market), betAmount);
        
        // Non-existent market has empty songId, but contract checks endTime first
        // So it will revert with "Market has ended" (endTime = 0) before checking songId
        vm.expectRevert(); // Accept either "Market has ended" or "Market does not exist"
        market.placeBet(999, betAmount, true);
        vm.stopPrank();
    }

    function test_PlaceBet_WhenPaused() public {
        uint256 marketId = market.createMarket("song-123", block.timestamp + 7 days, 0);
        
        vm.prank(owner);
        market.pause();
        
        uint256 betAmount = 100 * 10**USDC_DECIMALS;
        vm.startPrank(user1);
        usdc.approve(address(market), betAmount);
        
        vm.expectRevert();
        market.placeBet(marketId, betAmount, true);
        vm.stopPrank();
    }

    // ============ Market Resolution Tests ============

    function test_ScheduleResolution_YES() public {
        uint256 marketId = market.createMarket("song-123", block.timestamp + 7 days, 0);
        
        // Add some bets
        vm.prank(user1);
        usdc.approve(address(market), 100 * 10**USDC_DECIMALS);
        vm.prank(user1);
        market.placeBet(marketId, 100 * 10**USDC_DECIMALS, true);
        
        vm.warp(block.timestamp + 7 days + 1);
        
        vm.expectEmit(true, false, false, true);
        emit ResolutionScheduled(marketId, true, block.timestamp + TIMELOCK_DELAY);
        
        vm.prank(owner);
        market.scheduleResolution(marketId, true);
        
        (bool exists, bool winner, uint256 executeTime) = market.scheduledResolutions(marketId);
        assertEq(exists, true, "Resolution should be scheduled");
        assertEq(winner, true, "Winner should be YES");
        assertEq(executeTime, block.timestamp + TIMELOCK_DELAY, "Execute time should be correct");
    }

    function test_ExecuteResolution_YES() public {
        uint256 marketId = market.createMarket("song-123", block.timestamp + 7 days, 0);
        
        vm.prank(user1);
        usdc.approve(address(market), 100 * 10**USDC_DECIMALS);
        vm.prank(user1);
        market.placeBet(marketId, 100 * 10**USDC_DECIMALS, true);
        
        vm.warp(block.timestamp + 7 days + 1);
        
        vm.prank(owner);
        market.scheduleResolution(marketId, true);
        
        // Fast forward past timelock
        vm.warp(block.timestamp + TIMELOCK_DELAY + 1);
        
        // Check event is emitted (checking marketId and winner)
        vm.expectEmit(true, false, false, false);
        emit MarketResolved(marketId, true, 100 * 10**USDC_DECIMALS);
        
        market.executeResolution(marketId);
        
        (,, bool resolved, bool winner, bool cancelled,,,) = market.markets(marketId);
        assertEq(resolved, true, "Market should be resolved");
        assertEq(winner, true, "Winner should be YES");
        
        // Scheduled resolution should be cleared
        (bool exists,,) = market.scheduledResolutions(marketId);
        assertEq(exists, false, "Scheduled resolution should be cleared");
    }

    function test_ExecuteResolution_BeforeTimelock() public {
        uint256 marketId = market.createMarket("song-123", block.timestamp + 7 days, 0);
        
        vm.warp(block.timestamp + 7 days + 1);
        
        vm.prank(owner);
        market.scheduleResolution(marketId, true);
        
        // Try to execute before timelock expires
        vm.expectRevert("Timelock not expired");
        market.executeResolution(marketId);
    }

    function test_ScheduleResolution_NotEnded() public {
        uint256 marketId = market.createMarket("song-123", block.timestamp + 7 days, 0);
        
        vm.prank(owner);
        vm.expectRevert("Market has not ended");
        market.scheduleResolution(marketId, true);
    }

    function test_ScheduleResolution_AlreadyResolved() public {
        uint256 marketId = market.createMarket("song-123", block.timestamp + 7 days, 0);
        
        vm.warp(block.timestamp + 7 days + 1);
        vm.prank(owner);
        market.scheduleResolution(marketId, true);
        
        vm.warp(block.timestamp + TIMELOCK_DELAY + 1);
        market.executeResolution(marketId);
        
        vm.warp(block.timestamp - TIMELOCK_DELAY - 1); // Go back for test
        vm.warp(block.timestamp + 7 days + 1); // Market ended again
        
        vm.prank(owner);
        vm.expectRevert("Market already resolved or cancelled");
        market.scheduleResolution(marketId, true);
    }

    function test_ScheduleResolution_OnlyOwner() public {
        uint256 marketId = market.createMarket("song-123", block.timestamp + 7 days, 0);
        vm.warp(block.timestamp + 7 days + 1);
        
        vm.prank(user1);
        vm.expectRevert();
        market.scheduleResolution(marketId, true);
    }

    function test_CancelScheduledResolution() public {
        uint256 marketId = market.createMarket("song-123", block.timestamp + 7 days, 0);
        
        vm.warp(block.timestamp + 7 days + 1);
        
        vm.prank(owner);
        market.scheduleResolution(marketId, true);
        
        (bool existsBefore,,) = market.scheduledResolutions(marketId);
        assertEq(existsBefore, true, "Resolution should be scheduled");
        
        vm.prank(owner);
        market.cancelScheduledResolution(marketId);
        
        (bool existsAfter,,) = market.scheduledResolutions(marketId);
        assertEq(existsAfter, false, "Resolution should be cancelled");
    }

    // ============ Claiming Winnings Tests ============

    function test_ClaimWinnings_YES_Winner() public {
        uint256 marketId = market.createMarket("song-123", block.timestamp + 7 days, 0);
        uint256 betAmount = 100 * 10**USDC_DECIMALS;
        
        // User1 bets YES
        vm.startPrank(user1);
        usdc.approve(address(market), betAmount);
        market.placeBet(marketId, betAmount, true);
        vm.stopPrank();
        
        // User2 bets NO
        vm.startPrank(user2);
        usdc.approve(address(market), betAmount);
        market.placeBet(marketId, betAmount, false);
        vm.stopPrank();
        
        // Resolve as YES
        vm.warp(block.timestamp + 7 days + 1);
        vm.prank(owner);
        market.scheduleResolution(marketId, true);
        
        vm.warp(block.timestamp + TIMELOCK_DELAY + 1);
        market.executeResolution(marketId);
        
        // User1 claims (YES won)
        uint256 balanceBefore = usdc.balanceOf(user1);
        uint256 feeRecipientBalanceBefore = usdc.balanceOf(feeRecipient);
        
        vm.prank(user1);
        market.claimWinnings(marketId);
        
        uint256 balanceAfter = usdc.balanceOf(user1);
        uint256 feeRecipientBalanceAfter = usdc.balanceOf(feeRecipient);
        
        // Total pool = 200 USDC, user gets (100/100) * 200 = 200 USDC
        // Fee = 200 * 1% = 2 USDC
        // User gets = 198 USDC
        uint256 expectedPayout = 198 * 10**USDC_DECIMALS;
        uint256 expectedFee = 2 * 10**USDC_DECIMALS;
        
        assertEq(balanceAfter - balanceBefore, expectedPayout, "User should receive correct payout");
        assertEq(feeRecipientBalanceAfter - feeRecipientBalanceBefore, expectedFee, "Fee recipient should receive fee");
        
        (,, bool claimed) = market.userBets(marketId, user1);
        assertEq(claimed, true, "Bet should be marked as claimed");
    }

    function test_ClaimWinnings_NO_Winner() public {
        uint256 marketId = market.createMarket("song-123", block.timestamp + 7 days, 0);
        uint256 betAmount = 100 * 10**USDC_DECIMALS;
        
        // User1 bets YES
        vm.startPrank(user1);
        usdc.approve(address(market), betAmount);
        market.placeBet(marketId, betAmount, true);
        vm.stopPrank();
        
        // User2 bets NO
        vm.startPrank(user2);
        usdc.approve(address(market), betAmount);
        market.placeBet(marketId, betAmount, false);
        vm.stopPrank();
        
        // Resolve as NO
        vm.warp(block.timestamp + 7 days + 1);
        vm.prank(owner);
        market.scheduleResolution(marketId, false);
        
        vm.warp(block.timestamp + TIMELOCK_DELAY + 1);
        market.executeResolution(marketId);
        
        // User2 claims (NO won)
        uint256 balanceBefore = usdc.balanceOf(user2);
        vm.prank(user2);
        market.claimWinnings(marketId);
        
        uint256 balanceAfter = usdc.balanceOf(user2);
        uint256 expectedPayout = 198 * 10**USDC_DECIMALS; // 200 - 2 fee
        
        assertEq(balanceAfter - balanceBefore, expectedPayout, "User should receive correct payout");
    }

    function test_ClaimWinnings_NotWinner() public {
        uint256 marketId = market.createMarket("song-123", block.timestamp + 7 days, 0);
        uint256 betAmount = 100 * 10**USDC_DECIMALS;
        
        // User1 bets YES
        vm.startPrank(user1);
        usdc.approve(address(market), betAmount);
        market.placeBet(marketId, betAmount, true);
        vm.stopPrank();
        
        // Resolve as NO (user1 lost)
        vm.warp(block.timestamp + 7 days + 1);
        vm.prank(owner);
        market.scheduleResolution(marketId, false);
        
        vm.warp(block.timestamp + TIMELOCK_DELAY + 1);
        market.executeResolution(marketId);
        
        // User1 tries to claim (but lost)
        vm.prank(user1);
        vm.expectRevert("No winning bet to claim");
        market.claimWinnings(marketId);
    }

    function test_ClaimWinnings_NotResolved() public {
        uint256 marketId = market.createMarket("song-123", block.timestamp + 7 days, 0);
        uint256 betAmount = 100 * 10**USDC_DECIMALS;
        
        vm.startPrank(user1);
        usdc.approve(address(market), betAmount);
        market.placeBet(marketId, betAmount, true);
        vm.stopPrank();
        
        vm.prank(user1);
        vm.expectRevert("Market not resolved");
        market.claimWinnings(marketId);
    }

    function test_ClaimWinnings_AlreadyClaimed() public {
        uint256 marketId = market.createMarket("song-123", block.timestamp + 7 days, 0);
        uint256 betAmount = 100 * 10**USDC_DECIMALS;
        
        vm.startPrank(user1);
        usdc.approve(address(market), betAmount);
        market.placeBet(marketId, betAmount, true);
        vm.stopPrank();
        
        vm.warp(block.timestamp + 7 days + 1);
        vm.prank(owner);
        market.scheduleResolution(marketId, true);
        
        vm.warp(block.timestamp + TIMELOCK_DELAY + 1);
        market.executeResolution(marketId);
        
        // First claim
        vm.prank(user1);
        market.claimWinnings(marketId);
        
        // Second claim should fail
        vm.prank(user1);
        vm.expectRevert("Winnings already claimed");
        market.claimWinnings(marketId);
    }

    function test_ClaimWinnings_WhenPaused() public {
        uint256 marketId = market.createMarket("song-123", block.timestamp + 7 days, 0);
        uint256 betAmount = 100 * 10**USDC_DECIMALS;
        
        vm.startPrank(user1);
        usdc.approve(address(market), betAmount);
        market.placeBet(marketId, betAmount, true);
        vm.stopPrank();
        
        vm.warp(block.timestamp + 7 days + 1);
        vm.prank(owner);
        market.scheduleResolution(marketId, true);
        
        vm.warp(block.timestamp + TIMELOCK_DELAY + 1);
        market.executeResolution(marketId);
        
        vm.prank(owner);
        market.pause();
        
        vm.prank(user1);
        vm.expectRevert();
        market.claimWinnings(marketId);
    }

    // ============ Payout Calculation Tests ============

    function test_PayoutCalculation_Proportional() public {
        uint256 marketId = market.createMarket("song-123", block.timestamp + 7 days, 0);
        
        // User1 bets 100 YES
        vm.startPrank(user1);
        usdc.approve(address(market), 100 * 10**USDC_DECIMALS);
        market.placeBet(marketId, 100 * 10**USDC_DECIMALS, true);
        vm.stopPrank();
        
        // User2 bets 200 YES
        vm.startPrank(user2);
        usdc.approve(address(market), 200 * 10**USDC_DECIMALS);
        market.placeBet(marketId, 200 * 10**USDC_DECIMALS, true);
        vm.stopPrank();
        
        // User3 bets 300 NO
        vm.startPrank(user3);
        usdc.approve(address(market), 300 * 10**USDC_DECIMALS);
        market.placeBet(marketId, 300 * 10**USDC_DECIMALS, false);
        vm.stopPrank();
        
        // Total: YES = 300, NO = 300
        // Resolve as YES
        vm.warp(block.timestamp + 7 days + 1);
        vm.prank(owner);
        market.scheduleResolution(marketId, true);
        
        vm.warp(block.timestamp + TIMELOCK_DELAY + 1);
        market.executeResolution(marketId);
        
        // User1 (100 YES) should get: (100/300) * 600 = 200 USDC - 2 fee = 198
        // User2 (200 YES) should get: (200/300) * 600 = 400 USDC - 4 fee = 396
        
        uint256 balanceBefore1 = usdc.balanceOf(user1);
        vm.prank(user1);
        market.claimWinnings(marketId);
        uint256 payout1 = usdc.balanceOf(user1) - balanceBefore1;
        
        uint256 balanceBefore2 = usdc.balanceOf(user2);
        vm.prank(user2);
        market.claimWinnings(marketId);
        uint256 payout2 = usdc.balanceOf(user2) - balanceBefore2;
        
        assertEq(payout1, 198 * 10**USDC_DECIMALS, "User1 should get correct proportional payout");
        assertEq(payout2, 396 * 10**USDC_DECIMALS, "User2 should get correct proportional payout");
        
        // Total fees should be 6 USDC (2 + 4)
        assertEq(usdc.balanceOf(feeRecipient), 6 * 10**USDC_DECIMALS, "Total fees should be correct");
    }

    // ============ Fee Tests ============

    function test_PlatformFee() public {
        uint256 marketId = market.createMarket("song-123", block.timestamp + 7 days, 0);
        uint256 betAmount = 1000 * 10**USDC_DECIMALS; // 1000 USDC
        
        vm.startPrank(user1);
        usdc.approve(address(market), betAmount);
        market.placeBet(marketId, betAmount, true);
        vm.stopPrank();
        
        vm.startPrank(user2);
        usdc.approve(address(market), betAmount);
        market.placeBet(marketId, betAmount, false);
        vm.stopPrank();
        
        vm.warp(block.timestamp + 7 days + 1);
        vm.prank(owner);
        market.scheduleResolution(marketId, true);
        
        vm.warp(block.timestamp + TIMELOCK_DELAY + 1);
        market.executeResolution(marketId);
        
        // User1 wins, payout = 2000 USDC, fee = 20 USDC (1%)
        uint256 feeRecipientBalanceBefore = usdc.balanceOf(feeRecipient);
        vm.prank(user1);
        market.claimWinnings(marketId);
        
        uint256 fee = usdc.balanceOf(feeRecipient) - feeRecipientBalanceBefore;
        assertEq(fee, 20 * 10**USDC_DECIMALS, "Fee should be 1% of payout");
    }

    // ============ Owner Functions Tests ============

    function test_FeeRecipient_Immutable() public {
        // Fee recipient is now immutable, cannot be changed
        address originalFeeRecipient = market.feeRecipient();
        assertEq(originalFeeRecipient, feeRecipient, "Fee recipient should match constructor parameter");
        
        // Verify there's no setFeeRecipient function (it's immutable)
        // This test just confirms the fee recipient is set correctly at deployment
    }

    function test_SetPlatformFeeBps() public {
        vm.prank(owner);
        market.setPlatformFeeBps(200); // 2%
        
        assertEq(market.platformFeeBps(), 200, "Platform fee should be updated");
    }

    function test_SetPlatformFeeBps_MaxFee() public {
        vm.prank(owner);
        vm.expectRevert("Fee cannot exceed 10%");
        market.setPlatformFeeBps(1001); // 10.01%
    }

    function test_SetPlatformFeeBps_OnlyOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        market.setPlatformFeeBps(200);
    }

    // ============ Edge Cases ============

    function test_Fuzz_PlaceBet(uint256 amount) public {
        amount = bound(amount, 1, INITIAL_BALANCE);
        uint256 marketId = market.createMarket("song-123", block.timestamp + 7 days, 0);
        
        vm.startPrank(user1);
        usdc.approve(address(market), amount);
        market.placeBet(marketId, amount, true);
        vm.stopPrank();
        
        (,,, bool winner, bool cancelled, uint256 poolYes, uint256 poolNo,) = market.markets(marketId);
        assertEq(poolYes, amount, "Pool should match bet amount");
    }

    function test_NoBets_ResolveMarket() public {
        uint256 marketId = market.createMarket("song-123", block.timestamp + 7 days, 0);
        
        vm.warp(block.timestamp + 7 days + 1);
        vm.prank(owner);
        market.scheduleResolution(marketId, true);
        
        vm.warp(block.timestamp + TIMELOCK_DELAY + 1);
        market.executeResolution(marketId);
        
        (,, bool resolved, bool winner, bool cancelled,,,) = market.markets(marketId);
        assertEq(resolved, true, "Market should be resolved even with no bets");
        assertEq(winner, true, "Winner should be set");
    }

    // ============ Pause Tests ============

    function test_Pause_Unpause() public {
        vm.prank(owner);
        market.pause();
        
        assertTrue(market.paused(), "Contract should be paused");
        
        vm.prank(owner);
        market.unpause();
        
        assertFalse(market.paused(), "Contract should be unpaused");
    }

    function test_Pause_OnlyOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        market.pause();
    }

    // ============ Admin Functions Tests ============

    function test_SetTimelockDelay() public {
        uint256 newDelay = 2 days;
        
        vm.prank(owner);
        market.setTimelockDelay(newDelay);
        
        assertEq(market.timelockDelay(), newDelay, "Timelock delay should be updated");
    }

    function test_SetMinMarketDuration() public {
        uint256 newDuration = 2 days;
        
        vm.prank(owner);
        market.setMinMarketDuration(newDuration);
        
        assertEq(market.minMarketDuration(), newDuration, "Minimum market duration should be updated");
    }

    function test_SetMaxBetAmount() public {
        uint256 marketId = market.createMarket("song-123", block.timestamp + 7 days, 0);
        uint256 newMaxBet = 500 * 10**USDC_DECIMALS;
        
        vm.prank(owner);
        market.setMaxBetAmount(marketId, newMaxBet);
        
        (,,,,,,, uint256 maxBetAmount) = market.markets(marketId);
        assertEq(maxBetAmount, newMaxBet, "Max bet amount should be updated");
    }

    function test_SetMaxBetAmount_ResolvedMarket() public {
        uint256 marketId = market.createMarket("song-123", block.timestamp + 7 days, 0);
        
        vm.warp(block.timestamp + 7 days + 1);
        vm.prank(owner);
        market.scheduleResolution(marketId, true);
        
        vm.warp(block.timestamp + TIMELOCK_DELAY + 1);
        market.executeResolution(marketId);
        
        vm.prank(owner);
        vm.expectRevert("Cannot update resolved market");
        market.setMaxBetAmount(marketId, 100 * 10**USDC_DECIMALS);
    }

    // ============ Market Cancellation Tests ============

    function test_ScheduleCancellation() public {
        uint256 marketId = market.createMarket("song-123", block.timestamp + 7 days, 0);
        
        vm.prank(owner);
        market.scheduleCancellation(marketId);
        
        (bool exists, uint256 executeTime) = market.scheduledCancellations(marketId);
        assertEq(exists, true, "Cancellation should be scheduled");
        assertEq(executeTime, block.timestamp + TIMELOCK_DELAY, "Execute time should be correct");
    }

    function test_ExecuteCancellation() public {
        uint256 marketId = market.createMarket("song-123", block.timestamp + 7 days, 0);
        
        uint256 betAmount = 100 * 10**USDC_DECIMALS;
        vm.startPrank(user1);
        usdc.approve(address(market), betAmount);
        market.placeBet(marketId, betAmount, true);
        vm.stopPrank();
        
        vm.prank(owner);
        market.scheduleCancellation(marketId);
        
        vm.warp(block.timestamp + TIMELOCK_DELAY + 1);
        market.executeCancellation(marketId);
        
        (,, bool resolved, bool winner, bool cancelled,,,) = market.markets(marketId);
        assertEq(resolved, true, "Market should be resolved");
        assertEq(cancelled, true, "Market should be cancelled");
        assertEq(winner, false, "Winner should not be set for cancelled market");
    }

    function test_ClaimRefund() public {
        uint256 marketId = market.createMarket("song-123", block.timestamp + 7 days, 0);
        
        uint256 betAmount = 100 * 10**USDC_DECIMALS;
        vm.startPrank(user1);
        usdc.approve(address(market), betAmount);
        market.placeBet(marketId, betAmount, true);
        vm.stopPrank();
        
        vm.prank(owner);
        market.scheduleCancellation(marketId);
        
        vm.warp(block.timestamp + TIMELOCK_DELAY + 1);
        market.executeCancellation(marketId);
        
        uint256 balanceBefore = usdc.balanceOf(user1);
        vm.prank(user1);
        market.claimRefund(marketId);
        uint256 balanceAfter = usdc.balanceOf(user1);
        
        assertEq(balanceAfter - balanceBefore, betAmount, "User should receive full refund");
        
        (,, bool claimed) = market.userBets(marketId, user1);
        assertEq(claimed, true, "Refund should be marked as claimed");
    }

    function test_CancelScheduledCancellation() public {
        uint256 marketId = market.createMarket("song-123", block.timestamp + 7 days, 0);
        
        vm.prank(owner);
        market.scheduleCancellation(marketId);
        
        (bool existsBefore,) = market.scheduledCancellations(marketId);
        assertEq(existsBefore, true, "Cancellation should be scheduled");
        
        vm.prank(owner);
        market.cancelScheduledCancellation(marketId);
        
        (bool existsAfter,) = market.scheduledCancellations(marketId);
        assertEq(existsAfter, false, "Cancellation should be cancelled");
    }
}

