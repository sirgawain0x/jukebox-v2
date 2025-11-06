// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title PredictionMarket
 * @notice A prediction market contract for betting on song outcomes
 */
contract PredictionMarket is Ownable, Pausable {
    using SafeERC20 for IERC20;

    struct Market {
        string songId;
        uint256 endTime;
        bool resolved;
        bool winner; // true = YES won, false = NO won
        bool cancelled; // true if market was cancelled
        uint256 totalPoolYes;
        uint256 totalPoolNo;
        uint256 maxBetAmount; // Maximum bet amount per market
    }

    struct UserBet {
        uint256 amountYes;
        uint256 amountNo;
        bool claimed;
    }

    struct ScheduledResolution {
        bool exists;
        bool winner;
        uint256 executeTime;
    }

    struct ScheduledCancellation {
        bool exists;
        uint256 executeTime;
    }

    // Events
    event MarketCreated(uint256 indexed marketId, string songId, uint256 endTime, uint256 maxBetAmount);
    event BetPlaced(uint256 indexed marketId, address indexed user, bool side, uint256 amount);
    event MarketResolved(uint256 indexed marketId, bool winner, uint256 totalPayout);
    event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 amount);
    event ResolutionScheduled(uint256 indexed marketId, bool winner, uint256 executeTime);
    event CancellationScheduled(uint256 indexed marketId, uint256 executeTime);
    event MarketCancelled(uint256 indexed marketId, uint256 totalRefunded);
    event TimelockDelayUpdated(uint256 oldDelay, uint256 newDelay);
    event MaxBetAmountUpdated(uint256 indexed marketId, uint256 oldAmount, uint256 newAmount);
    event MinMarketDurationUpdated(uint256 oldDuration, uint256 newDuration);

    // State variables
    IERC20 public immutable usdc;
    address public immutable feeRecipient; // Immutable for security
    uint256 public platformFeeBps; // Basis points (e.g., 100 = 1%)
    uint256 public marketCount;
    uint256 public timelockDelay; // Delay in seconds before resolution can be executed
    uint256 public minMarketDuration; // Minimum duration in seconds for a market
    
    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => UserBet)) public userBets;
    mapping(uint256 => ScheduledResolution) public scheduledResolutions;
    mapping(uint256 => ScheduledCancellation) public scheduledCancellations;

    /**
     * @param _usdc USDC token address
     * @param _feeRecipient Address to receive platform fees
     * @param _platformFeeBps Platform fee in basis points
     * @param _timelockDelay Delay in seconds before resolution can be executed (e.g., 1 day = 86400)
     * @param _minMarketDuration Minimum duration in seconds for a market (e.g., 1 day = 86400)
     */
    constructor(
        address _usdc,
        address _feeRecipient,
        uint256 _platformFeeBps,
        uint256 _timelockDelay,
        uint256 _minMarketDuration
    ) Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC address");
        require(_feeRecipient != address(0), "Invalid fee recipient");
        require(_platformFeeBps <= 1000, "Fee cannot exceed 10%"); // Max 10% fee
        require(_timelockDelay > 0, "Timelock delay must be greater than 0");
        require(_minMarketDuration > 0, "Minimum market duration must be greater than 0");
        
        usdc = IERC20(_usdc);
        feeRecipient = _feeRecipient;
        platformFeeBps = _platformFeeBps;
        timelockDelay = _timelockDelay;
        minMarketDuration = _minMarketDuration;
    }

    /**
     * @notice Create a new prediction market
     * @param songId The song identifier
     * @param endTime Unix timestamp when market closes
     * @param maxBetAmount Maximum bet amount allowed for this market (0 = no limit)
     * @return marketId The ID of the created market
     */
    function createMarket(
        string memory songId,
        uint256 endTime,
        uint256 maxBetAmount
    ) external whenNotPaused returns (uint256) {
        require(endTime > block.timestamp, "End time must be in the future");
        require(endTime - block.timestamp >= minMarketDuration, "Market duration below minimum");
        require(bytes(songId).length > 0, "Song ID cannot be empty");
        
        uint256 marketId = marketCount;
        markets[marketId] = Market({
            songId: songId,
            endTime: endTime,
            resolved: false,
            winner: false,
            cancelled: false,
            totalPoolYes: 0,
            totalPoolNo: 0,
            maxBetAmount: maxBetAmount
        });
        
        marketCount++;
        
        emit MarketCreated(marketId, songId, endTime, maxBetAmount);
        return marketId;
    }

    /**
     * @notice Place a bet on a market
     * @param marketId The market ID
     * @param amount The amount of USDC to bet
     * @param side true = YES, false = NO
     */
    function placeBet(uint256 marketId, uint256 amount, bool side) external whenNotPaused {
        Market storage market = markets[marketId];
        require(!market.resolved && !market.cancelled, "Market already resolved or cancelled");
        require(block.timestamp < market.endTime, "Market has ended");
        require(amount > 0, "Bet amount must be greater than 0");
        require(bytes(market.songId).length > 0, "Market does not exist");
        
        // Check max bet limit if set
        if (market.maxBetAmount > 0) {
            uint256 currentBet = side ? userBets[marketId][msg.sender].amountYes : userBets[marketId][msg.sender].amountNo;
            require(currentBet + amount <= market.maxBetAmount, "Bet exceeds maximum allowed");
        }
        
        // Transfer USDC from user
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        
        // Update pools
        if (side) {
            market.totalPoolYes += amount;
            userBets[marketId][msg.sender].amountYes += amount;
        } else {
            market.totalPoolNo += amount;
            userBets[marketId][msg.sender].amountNo += amount;
        }
        
        emit BetPlaced(marketId, msg.sender, side, amount);
    }

    /**
     * @notice Schedule a market resolution (subject to timelock)
     * @param marketId The market ID
     * @param winner true = YES won, false = NO won
     */
    function scheduleResolution(uint256 marketId, bool winner) external onlyOwner {
        Market storage market = markets[marketId];
        require(!market.resolved && !market.cancelled, "Market already resolved or cancelled");
        require(block.timestamp >= market.endTime, "Market has not ended");
        require(bytes(market.songId).length > 0, "Market does not exist");
        require(!scheduledResolutions[marketId].exists, "Resolution already scheduled");
        require(!scheduledCancellations[marketId].exists, "Cannot schedule resolution if cancellation is scheduled");
        
        uint256 executeTime = block.timestamp + timelockDelay;
        scheduledResolutions[marketId] = ScheduledResolution({
            exists: true,
            winner: winner,
            executeTime: executeTime
        });
        
        emit ResolutionScheduled(marketId, winner, executeTime);
    }

    /**
     * @notice Execute a scheduled market resolution (after timelock delay)
     * @param marketId The market ID
     */
    function executeResolution(uint256 marketId) external whenNotPaused {
        Market storage market = markets[marketId];
        ScheduledResolution storage scheduled = scheduledResolutions[marketId];
        
        require(!market.resolved, "Market already resolved");
        require(scheduled.exists, "Resolution not scheduled");
        require(block.timestamp >= scheduled.executeTime, "Timelock not expired");
        
        market.resolved = true;
        market.winner = scheduled.winner;
        
        uint256 totalPayout = scheduled.winner ? market.totalPoolYes : market.totalPoolNo;
        
        // Clear scheduled resolution
        delete scheduledResolutions[marketId];
        
        emit MarketResolved(marketId, scheduled.winner, totalPayout);
    }

    /**
     * @notice Cancel a scheduled resolution (only owner)
     * @param marketId The market ID
     */
    function cancelScheduledResolution(uint256 marketId) external onlyOwner {
        require(scheduledResolutions[marketId].exists, "Resolution not scheduled");
        delete scheduledResolutions[marketId];
    }

    /**
     * @notice Claim winnings from a resolved market
     * @param marketId The market ID
     */
    function claimWinnings(uint256 marketId) external whenNotPaused {
        Market storage market = markets[marketId];
        require(market.resolved, "Market not resolved");
        require(!market.cancelled, "Market was cancelled, use claimRefund instead");
        
        UserBet storage bet = userBets[marketId][msg.sender];
        require(!bet.claimed, "Winnings already claimed");
        
        uint256 userBetAmount = market.winner ? bet.amountYes : bet.amountNo;
        require(userBetAmount > 0, "No winning bet to claim");
        
        uint256 totalPool = market.winner ? market.totalPoolYes : market.totalPoolNo;
        uint256 totalOppositePool = market.winner ? market.totalPoolNo : market.totalPoolYes;
        
        // Explicit check to prevent division by zero
        require(totalPool > 0, "Pool cannot be zero");
        
        // Calculate payout: user gets proportional share of total pool
        // Formula: (userBet / totalPool) * (totalPool + totalOppositePool)
        uint256 payout = (userBetAmount * (totalPool + totalOppositePool)) / totalPool;
        
        // Calculate platform fee
        uint256 fee = (payout * platformFeeBps) / 10000;
        uint256 userPayout = payout - fee;
        
        // Transfer fee to fee recipient
        if (fee > 0) {
            usdc.safeTransfer(feeRecipient, fee);
        }
        
        // Mark as claimed and transfer payout
        bet.claimed = true;
        usdc.safeTransfer(msg.sender, userPayout);
        
        emit WinningsClaimed(marketId, msg.sender, userPayout);
    }

    /**
     * @notice Schedule a market cancellation (subject to timelock)
     * @param marketId The market ID to cancel
     */
    function scheduleCancellation(uint256 marketId) external onlyOwner {
        Market storage market = markets[marketId];
        require(bytes(market.songId).length > 0, "Market does not exist");
        require(!market.resolved && !market.cancelled, "Cannot cancel resolved or cancelled market");
        require(block.timestamp < market.endTime, "Cannot cancel after market end");
        require(!scheduledCancellations[marketId].exists, "Cancellation already scheduled");
        require(!scheduledResolutions[marketId].exists, "Cannot cancel if resolution is scheduled");
        
        uint256 executeTime = block.timestamp + timelockDelay;
        scheduledCancellations[marketId] = ScheduledCancellation({
            exists: true,
            executeTime: executeTime
        });
        
        emit CancellationScheduled(marketId, executeTime);
    }

    /**
     * @notice Execute a scheduled market cancellation (after timelock delay)
     * @param marketId The market ID
     */
    function executeCancellation(uint256 marketId) external {
        Market storage market = markets[marketId];
        ScheduledCancellation storage scheduled = scheduledCancellations[marketId];
        
        require(bytes(market.songId).length > 0, "Market does not exist");
        require(!market.resolved && !market.cancelled, "Market already resolved or cancelled");
        require(scheduled.exists, "Cancellation not scheduled");
        require(block.timestamp >= scheduled.executeTime, "Timelock not expired");
        require(block.timestamp < market.endTime, "Cannot cancel after market end");
        
        // Mark market as cancelled
        market.resolved = true;
        market.cancelled = true;
        
        // Calculate total refundable amount
        uint256 totalRefunded = market.totalPoolYes + market.totalPoolNo;
        
        // Clear scheduled cancellation
        delete scheduledCancellations[marketId];
        
        emit MarketCancelled(marketId, totalRefunded);
    }

    /**
     * @notice Cancel a scheduled cancellation (only owner)
     * @param marketId The market ID
     */
    function cancelScheduledCancellation(uint256 marketId) external onlyOwner {
        require(scheduledCancellations[marketId].exists, "Cancellation not scheduled");
        delete scheduledCancellations[marketId];
    }

    /**
     * @notice Claim refund from a cancelled market
     * @param marketId The market ID
     */
    function claimRefund(uint256 marketId) external whenNotPaused {
        Market storage market = markets[marketId];
        require(market.cancelled, "Market not cancelled");
        
        UserBet storage bet = userBets[marketId][msg.sender];
        require(!bet.claimed, "Refund already claimed");
        
        // Calculate refund: user gets back their original bet amounts
        uint256 refundAmount = bet.amountYes + bet.amountNo;
        require(refundAmount > 0, "No bet to refund");
        
        // Mark as claimed
        bet.claimed = true;
        
        // Transfer refund
        usdc.safeTransfer(msg.sender, refundAmount);
        
        emit WinningsClaimed(marketId, msg.sender, refundAmount);
    }

    /**
     * @notice Update platform fee (only owner, max 10%)
     */
    function setPlatformFeeBps(uint256 _platformFeeBps) external onlyOwner {
        require(_platformFeeBps <= 1000, "Fee cannot exceed 10%");
        platformFeeBps = _platformFeeBps;
    }

    /**
     * @notice Update timelock delay (only owner)
     * @param _timelockDelay New timelock delay in seconds
     */
    function setTimelockDelay(uint256 _timelockDelay) external onlyOwner {
        require(_timelockDelay > 0, "Timelock delay must be greater than 0");
        uint256 oldDelay = timelockDelay;
        timelockDelay = _timelockDelay;
        emit TimelockDelayUpdated(oldDelay, _timelockDelay);
    }

    /**
     * @notice Update minimum market duration (only owner)
     * @param _minMarketDuration New minimum duration in seconds
     */
    function setMinMarketDuration(uint256 _minMarketDuration) external onlyOwner {
        require(_minMarketDuration > 0, "Minimum market duration must be greater than 0");
        uint256 oldDuration = minMarketDuration;
        minMarketDuration = _minMarketDuration;
        emit MinMarketDurationUpdated(oldDuration, _minMarketDuration);
    }

    /**
     * @notice Update max bet amount for a market (only owner)
     * @param marketId The market ID
     * @param _maxBetAmount New max bet amount (0 = no limit)
     */
    function setMaxBetAmount(uint256 marketId, uint256 _maxBetAmount) external onlyOwner {
        require(bytes(markets[marketId].songId).length > 0, "Market does not exist");
        require(!markets[marketId].resolved, "Cannot update resolved market");
        
        uint256 oldAmount = markets[marketId].maxBetAmount;
        markets[marketId].maxBetAmount = _maxBetAmount;
        emit MaxBetAmountUpdated(marketId, oldAmount, _maxBetAmount);
    }

    /**
     * @notice Pause the contract (only owner)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the contract (only owner)
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}

