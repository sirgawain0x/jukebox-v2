// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";
import {AutomationCompatibleInterface} from "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";
import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract AutomatedPredictionMarket is FunctionsClient, AutomationCompatibleInterface, ConfirmedOwner {
    using FunctionsRequest for FunctionsRequest.Request;
    using SafeERC20 for IERC20;

    // --- Configuration ---
    bytes32 public immutable DON_ID; // Chainlink Functions DON ID (set in constructor)
    address public immutable ROUTER; // Chainlink Functions Router (set in constructor)
    uint32 public constant GAS_LIMIT = 300000;

    // Time Constants
    uint256 constant WEEK_IN_SECONDS = 604800;
    uint256 constant EST_MONDAY_ANCHOR = 363600; // Jan 5, 1970 5:00 AM UTC (Midnight EST)

    // --- State Variables ---
    IERC20 public usdcToken;
    uint64 public s_subscriptionId;
    uint256 public s_marketCount;

    uint256 public protocolFeeBasisPoints = 1000; // 10% (1000/10000)
    uint256 public accumulatedFees; // Fees collected for Admin
    address public feeRecipient; // Address that receives platform fees

    // The JavaScript Source (matches lib/source.js)
    // This code queries Spinamp GraphQL API to get the #1 trending track
    string constant SOURCE =
        "const query = `query TrendingTracks($first: Int!) { allTrendingTracks(first: $first) { edges { node { processedTrackByTrackId { id title artistByArtistId { name } } } } } }`;"
        "const variables = { first: 1 };"
        "const response = await Functions.makeHttpRequest({"
        "url: 'https://api.spinamp.xyz/v3/graphql',"
        "method: 'POST',"
        "headers: { 'Content-Type': 'application/json' },"
        "data: { query: query, variables: variables }"
        "});"
        "if (response.error) { throw Error('Request failed'); }"
        "const data = response.data.data;"
        "const trendingEdges = data.allTrendingTracks.edges;"
        "if (!trendingEdges || trendingEdges.length === 0) { throw Error('No trending tracks found'); }"
        "const topTrackTitle = trendingEdges[0].node.processedTrackByTrackId.title;"
        "return Functions.encodeString(topTrackTitle);";

    struct Market {
        uint256 id;
        uint256 endTime;
        uint256 resolveTime;
        bool resolved;
        string winningTrack;
        address creator; // Market creator address
        uint256 totalPool; // Holds the NET pool (after fees) once resolved
        uint256 totalPaidOut; // Track total payouts to handle remainder distribution
    }

    struct Bet {
        address user;
        string predictedTrack;
        uint256 amount;
        bool claimed;
    }

    mapping(uint256 => Market) public markets;
    mapping(uint256 => Bet[]) public marketBets;
    mapping(bytes32 => uint256) public pendingRequests;
    mapping(uint256 => bool) public marketHasPendingRequest;
    mapping(uint256 => bool) public marketFundsSwept; // Track if unclaimed funds have been swept

    event MarketCreated(uint256 indexed marketId, uint256 resolveTime);
    event BetPlaced(uint256 indexed marketId, address user, string prediction, uint256 amount);
    event MarketResolved(uint256 indexed marketId, string winningTrack, uint256 netPool, uint256 feesCollected);
    event WinningsClaimed(uint256 indexed marketId, address user, uint256 amount);
    event FundsCarriedOver(uint256 indexed fromMarketId, uint256 indexed toMarketId, uint256 amount);

    constructor(
        uint64 subscriptionId,
        address _usdcAddress,
        address _router,
        bytes32 _donId,
        address _feeRecipient
    ) FunctionsClient(_router) ConfirmedOwner(msg.sender) {
        require(_router != address(0), "Invalid router address");
        require(_usdcAddress != address(0), "Invalid USDC address");
        require(_feeRecipient != address(0), "Invalid fee recipient address");
        
        s_subscriptionId = subscriptionId;
        usdcToken = IERC20(_usdcAddress);
        ROUTER = _router;
        DON_ID = _donId;
        feeRecipient = _feeRecipient;
    }

    // --- 1. Market Creation ---
    function getNextMondayEST() public view returns (uint256) {
        if (block.timestamp < EST_MONDAY_ANCHOR) {
            return EST_MONDAY_ANCHOR;
        }
        uint256 timeSinceAnchor = block.timestamp - EST_MONDAY_ANCHOR;
        uint256 weeksPassed = timeSinceAnchor / WEEK_IN_SECONDS;
        return EST_MONDAY_ANCHOR + ((weeksPassed + 1) * WEEK_IN_SECONDS);
    }

    function createWeeklyMarket() external onlyOwner {
        s_marketCount++;
        uint256 resolveTime = getNextMondayEST();

        if (resolveTime - block.timestamp < 1 days) {
            resolveTime += WEEK_IN_SECONDS;
        }

        uint256 newMarketId = s_marketCount;
        markets[newMarketId] = Market({
            id: newMarketId,
            endTime: resolveTime - 1 hours,
            resolveTime: resolveTime,
            resolved: false,
            winningTrack: "",
            creator: msg.sender, // Market creator address
            totalPool: 0,
            totalPaidOut: 0 // Initialize payout tracking
        });

        // Carry over unclaimed funds from previous markets
        uint256 carriedOverAmount = _sweepUnclaimedFundsToNewMarket(newMarketId);
        
        if (carriedOverAmount > 0) {
            markets[newMarketId].totalPool = carriedOverAmount;
        }

        emit MarketCreated(newMarketId, resolveTime);
    }

    // --- 2. Betting with USDC ---
    function placeBet(uint256 marketId, string calldata predictedTrack, uint256 amount) external {
        Market storage market = markets[marketId];

        require(market.id == marketId && market.id > 0, "Market does not exist");
        require(block.timestamp < market.endTime, "Betting closed");
        require(!market.resolved, "Market already resolved");
        require(amount > 0, "Bet amount must be > 0");
        require(bytes(predictedTrack).length > 0, "Track title cannot be empty");

        // Transfer USDC from User -> Contract
        // Front-end must call usdc.approve(contractAddress, amount) first!
        usdcToken.safeTransferFrom(msg.sender, address(this), amount);

        market.totalPool += amount;

        marketBets[marketId].push(Bet({user: msg.sender, predictedTrack: predictedTrack, amount: amount, claimed: false}));

        emit BetPlaced(marketId, msg.sender, predictedTrack, amount);
    }

    // --- 3. Chainlink Resolution (With Fee Logic) ---
    function checkUpkeep(bytes calldata) external view override returns (bool upkeepNeeded, bytes memory performData) {
        for (uint256 i = 1; i <= s_marketCount; i++) {
            if (
                markets[i].resolveTime <= block.timestamp &&
                !markets[i].resolved &&
                !marketHasPendingRequest[i]
            ) {
                return (true, abi.encode(i));
            }
        }
        return (false, "");
    }

    function performUpkeep(bytes calldata performData) external override {
        uint256 marketId = abi.decode(performData, (uint256));
        _resolveMarket(marketId);
    }

    function _resolveMarket(uint256 marketId) internal {
        Market storage market = markets[marketId];
        require(!market.resolved, "Already resolved");
        require(block.timestamp >= market.resolveTime, "Too early");
        require(!marketHasPendingRequest[marketId], "Request already pending");

        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(SOURCE);

        bytes32 requestId = _sendRequest(req.encodeCBOR(), s_subscriptionId, GAS_LIMIT, DON_ID);
        pendingRequests[requestId] = marketId;
        marketHasPendingRequest[marketId] = true;
    }

    function fulfillRequest(bytes32 requestId, bytes memory response, bytes memory) internal override {
        uint256 marketId = pendingRequests[requestId];
        if (marketId == 0) return;

        string memory winningTrack = string(response);
        Market storage market = markets[marketId];

        // --- FEE LOGIC (Calculate Once) ---
        uint256 grossPool = market.totalPool;
        uint256 fee = (grossPool * protocolFeeBasisPoints) / 10000;
        uint256 netPool = grossPool - fee;

        market.totalPool = netPool; // Update pool to only reflect what is claimable
        accumulatedFees += fee; // Bank the fee for admin

        market.winningTrack = winningTrack;
        market.resolved = true;

        delete pendingRequests[requestId];
        marketHasPendingRequest[marketId] = false;
        emit MarketResolved(marketId, winningTrack, netPool, fee);
    }

    // --- 4. Claiming USDC ---
    function claimWinnings(uint256 marketId) external {
        Market storage market = markets[marketId];
        require(market.resolved, "Market not resolved");

        uint256 userWinningShare = 0;
        uint256 totalWinningStakes = 0;

        // Optimize: In production, track totalWinningStakes in a mapping to avoid this loop
        Bet[] storage bets = marketBets[marketId];
        for (uint256 i = 0; i < bets.length; i++) {
            if (keccak256(bytes(bets[i].predictedTrack)) == keccak256(bytes(market.winningTrack))) {
                totalWinningStakes += bets[i].amount;
            }
        }
        require(totalWinningStakes > 0, "No winners for this market");

        for (uint256 i = 0; i < bets.length; i++) {
            if (bets[i].user == msg.sender && !bets[i].claimed) {
                if (keccak256(bytes(bets[i].predictedTrack)) == keccak256(bytes(market.winningTrack))) {
                    userWinningShare += bets[i].amount;
                    bets[i].claimed = true;
                }
            }
        }
        require(userWinningShare > 0, "No winnings to claim");

        // Pay out share of the NET pool (Fees already deducted)
        uint256 payout = (userWinningShare * market.totalPool) / totalWinningStakes;

        usdcToken.safeTransfer(msg.sender, payout);
        emit WinningsClaimed(marketId, msg.sender, payout);
    }

    // --- 5. Admin Withdraw ---
    function withdrawFees() external {
        require(msg.sender == feeRecipient, "Only fee recipient can withdraw");
        uint256 amount = accumulatedFees;
        require(amount > 0, "No fees to withdraw");
        accumulatedFees = 0;
        usdcToken.safeTransfer(feeRecipient, amount);
    }

    // --- 6. Owner Functions ---
    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Invalid fee recipient address");
        feeRecipient = _feeRecipient;
    }

    // --- 7. Fund Carryover Functions ---
    
    /**
     * @notice Check if a market has unclaimed funds (no winners)
     * @param marketId The market ID to check
     * @return hasUnclaimedFunds True if market has unclaimed funds
     * @return unclaimedAmount The amount of unclaimed funds
     */
    function hasUnclaimedFunds(uint256 marketId) public view returns (bool hasUnclaimedFunds, uint256 unclaimedAmount) {
        Market storage market = markets[marketId];
        
        // Market must be resolved and have funds
        if (!market.resolved || market.totalPool == 0) {
            return (false, 0);
        }
        
        // Check if funds have already been swept
        if (marketFundsSwept[marketId]) {
            return (false, 0);
        }
        
        // Check if there are any winning bets that haven't been fully claimed
        Bet[] storage bets = marketBets[marketId];
        uint256 totalWinningStakes = 0;
        uint256 unclaimedWinningStakes = 0;
        
        for (uint256 i = 0; i < bets.length; i++) {
            if (keccak256(bytes(bets[i].predictedTrack)) == keccak256(bytes(market.winningTrack))) {
                totalWinningStakes += bets[i].amount;
                if (!bets[i].claimed) {
                    unclaimedWinningStakes += bets[i].amount;
                }
            }
        }
        
        // If no winning bets at all, funds are unclaimed
        if (totalWinningStakes == 0) {
            // Verify contract actually has the funds (safety check)
            uint256 contractBalance = usdcToken.balanceOf(address(this));
            uint256 availableAmount = market.totalPool;
            // Don't sweep more than contract balance (in case of accounting errors)
            if (availableAmount > contractBalance) {
                availableAmount = contractBalance;
            }
            return (true, availableAmount);
        }
        
        // If there are winning bets but they're all claimed, check if there's a remainder
        // (due to rounding or if all winners claimed but pool wasn't fully depleted)
        if (totalWinningStakes > 0 && unclaimedWinningStakes == 0) {
            // All winners have claimed, but there might be a remainder due to rounding
            // However, we should NOT sweep this as it could be rounding dust that belongs to winners
            // For safety, only sweep if there are NO winners at all
            return (false, 0);
        }
        
        // If there are unclaimed winning bets, funds are still claimable
        return (false, 0);
    }
    
    /**
     * @notice Sweep unclaimed funds from all previous markets to the new market
     * @param newMarketId The new market ID to receive the funds
     * @return totalCarriedOver Total amount carried over
     * @dev Gas limit consideration: If there are many markets, this could be expensive
     *      Consider batching or limiting the number of markets checked in production
     */
    function _sweepUnclaimedFundsToNewMarket(uint256 newMarketId) internal returns (uint256 totalCarriedOver) {
        totalCarriedOver = 0;
        
        // Security: Limit the number of markets to check to prevent gas limit issues
        // In production, you might want to make this configurable or use pagination
        uint256 maxMarketsToCheck = 100; // Reasonable limit to prevent DoS
        uint256 startMarket = newMarketId > maxMarketsToCheck ? newMarketId - maxMarketsToCheck : 1;
        
        // Loop through recent markets (excluding the new one)
        for (uint256 i = startMarket; i < newMarketId; i++) {
            (bool hasUnclaimed, uint256 amount) = hasUnclaimedFunds(i);
            
            if (hasUnclaimed && amount > 0) {
                // Mark funds as swept BEFORE updating pools (checks-effects-interactions pattern)
                marketFundsSwept[i] = true;
                
                // Clear old market's pool
                markets[i].totalPool = 0;
                
                // Add to carryover total
                totalCarriedOver += amount;
                
                emit FundsCarriedOver(i, newMarketId, amount);
            }
        }
        
        return totalCarriedOver;
    }
    
    /**
     * @notice Manually sweep unclaimed funds from a specific market to another market
     * @param fromMarketId The market to sweep funds from
     * @param toMarketId The market to transfer funds to
     * @dev Only owner can call this
     * @dev Follows checks-effects-interactions pattern for security
     */
    function sweepUnclaimedFunds(uint256 fromMarketId, uint256 toMarketId) external onlyOwner {
        require(fromMarketId < toMarketId, "Target market must be newer");
        require(markets[toMarketId].id > 0, "Target market does not exist");
        require(!markets[toMarketId].resolved, "Target market already resolved");
        
        (bool hasUnclaimed, uint256 amount) = hasUnclaimedFunds(fromMarketId);
        require(hasUnclaimed && amount > 0, "No unclaimed funds to sweep");
        
        // Checks-Effects-Interactions pattern
        // 1. Mark funds as swept (effect)
        marketFundsSwept[fromMarketId] = true;
        
        // 2. Update state (effect)
        markets[fromMarketId].totalPool = 0;
        markets[toMarketId].totalPool += amount;
        
        // 3. Emit event (no external interaction, safe)
        emit FundsCarriedOver(fromMarketId, toMarketId, amount);
    }

    // --- 8. View Functions ---
    function getMarketBets(uint256 marketId) external view returns (Bet[] memory) {
        return marketBets[marketId];
    }

    function getMarketBetsLength(uint256 marketId) external view returns (uint256) {
        return marketBets[marketId].length;
    }
}
