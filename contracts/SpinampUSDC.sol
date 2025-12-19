// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";
import {AutomationCompatibleInterface} from "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";
import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

contract SpinampUSDC is FunctionsClient, AutomationCompatibleInterface, ConfirmedOwner, Pausable {
    using FunctionsRequest for FunctionsRequest.Request;

    // --- Configuration ---
    bytes32 public immutable DON_ID; // Chainlink Functions DON ID (set in constructor)
    address public immutable ROUTER; // Chainlink Functions Router (set in constructor)
    uint32 public constant GAS_LIMIT = 300000;
    
    // Time Constants (UTC Anchor for EST Conversion)
    uint256 constant WEEK_IN_SECONDS = 604800; 
    uint256 constant EST_MONDAY_ANCHOR = 363600; // Jan 5, 1970 5:00 AM UTC (Midnight EST)

    // --- State Variables ---
    IERC20 public usdcToken;
    uint64 public s_subscriptionId;
    uint256 public s_marketCount;
    
    // Fees (Creation & Splits)
    uint256 public creationFee = 5 * 10**6; // $5 USDC to create a market
    
    // Security Limits
    uint256 public maxBetAmount = 100000 * 10**6; // $100,000 USDC max bet per transaction
    uint256 public minMarketDuration = 1 days; // Minimum 1 day from creation to resolution
    
    // Internal Balances (Pull Payment Pattern for Creators/Artists)
    // Tracks how much USDC each User/Artist can withdraw
    mapping(address => uint256) public rewardBalances;
    address public feeRecipient; // Address that receives platform fees (sent directly, no withdrawal needed) 

    // The JavaScript Source (Updated to use Chainlink Functions APIs)
    // Fetches Title + Artist Address and encodes them.
    // Note: artistByArtistId.id is in format "base/0x1234..." so we split to get the address
    string constant SOURCE = 
        "const q = `query T($f: Int!) { allTrendingTracks(first: $f) { edges { node { processedTrackByTrackId { title artistByArtistId { id } } } } } }`;"
        "const r = await Functions.makeHttpRequest({ url: 'https://api.spinamp.xyz/v3/graphql', method: 'POST', headers: {'Content-Type': 'application/json'}, data: { query: q, variables: { f: 1 } } });"
        "if (r.error) throw Error('Request failed');"
        "const n = r.data.data.allTrendingTracks.edges[0].node.processedTrackByTrackId;"
        "const t = n.title;"
        "const artistId = n.artistByArtistId.id;"
        "const a = artistId && artistId.includes('/') ? artistId.split('/')[1] : '0x0000000000000000000000000000000000000000';"
        "const e = ethers.utils.defaultAbiCoder.encode(['string', 'address'], [t, a]);"
        "return ethers.utils.arrayify(e);";

    struct Market {
        uint256 id;
        uint256 endTime;
        uint256 resolveTime;
        bool resolved;
        string winningTrack;
        address creator;
        uint256 totalPool;
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

    // Events
    event MarketCreated(uint256 indexed marketId, address creator, uint256 resolveTime);
    event BetPlaced(uint256 indexed marketId, address user, string prediction, uint256 amount);
    event MarketResolved(uint256 indexed marketId, string winningTrack, address winningArtist, uint256 netPool);
    event RewardsWithdrawn(address indexed user, uint256 amount);
    event WinningsClaimed(uint256 indexed marketId, address user, uint256 amount);
    event MaxBetAmountUpdated(uint256 newMaxBetAmount);
    event MinMarketDurationUpdated(uint256 newMinDuration);

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

    // --- 1. Market Creation (With $5 Fee) ---
    
    function getNextMondayEST() public view returns (uint256) {
        uint256 timeSinceAnchor = block.timestamp - EST_MONDAY_ANCHOR;
        uint256 weeksPassed = timeSinceAnchor / WEEK_IN_SECONDS;
        return EST_MONDAY_ANCHOR + ((weeksPassed + 1) * WEEK_IN_SECONDS);
    }

    function createWeeklyMarket() external whenNotPaused {
        // 1. Charge Creation Fee ($5) only if caller is not the owner
        // Owner/admin can create markets without paying the fee
        if (msg.sender != owner()) {
            require(usdcToken.transferFrom(msg.sender, address(this), creationFee), "Fee transfer failed");
            require(usdcToken.transfer(feeRecipient, creationFee), "Fee transfer to recipient failed");
        }

        // 2. Setup Timing
        s_marketCount++;
        uint256 resolveTime = getNextMondayEST();
        if (resolveTime - block.timestamp < 1 days) {
            resolveTime += WEEK_IN_SECONDS;
        }
        
        // 3. Enforce minimum market duration
        require(resolveTime - block.timestamp >= minMarketDuration, "Market duration too short");

        // 4. Initialize Market
        markets[s_marketCount] = Market({
            id: s_marketCount,
            endTime: resolveTime - 1 hours, 
            resolveTime: resolveTime,
            resolved: false,
            winningTrack: "",
            creator: msg.sender, // Track who made it so we can pay them later
            totalPool: 0,
            totalPaidOut: 0
        });

        emit MarketCreated(s_marketCount, msg.sender, resolveTime);
    }

    // --- 2. Betting ---
    
    function placeBet(uint256 marketId, string calldata predictedTrack, uint256 amount) external whenNotPaused {
        Market storage market = markets[marketId];
        require(block.timestamp < market.endTime, "Betting closed");
        require(!market.resolved, "Already resolved");
        require(amount > 0, "Bet > 0");
        require(amount <= maxBetAmount, "Bet exceeds maximum");

        require(usdcToken.transferFrom(msg.sender, address(this), amount), "USDC Transfer failed");

        market.totalPool += amount;
        marketBets[marketId].push(Bet({
            user: msg.sender,
            predictedTrack: predictedTrack,
            amount: amount,
            claimed: false
        }));

        emit BetPlaced(marketId, msg.sender, predictedTrack, amount);
    }

    // --- 3. Resolution (Chainlink Functions) ---

    function checkUpkeep(bytes calldata) external view override returns (bool upkeepNeeded, bytes memory performData) {
        // Checks if any market is ready to resolve
        for (uint256 i = 1; i <= s_marketCount; i++) {
            if (markets[i].resolveTime <= block.timestamp && !markets[i].resolved && !marketHasPendingRequest[i]) {
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
        
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(SOURCE);

        bytes32 requestId = _sendRequest(
            req.encodeCBOR(),
            s_subscriptionId,
            GAS_LIMIT,
            DON_ID
        );
        pendingRequests[requestId] = marketId;
        marketHasPendingRequest[marketId] = true;
    }

    // --- 4. The 3-Way Split (The "Pull" Pattern) ---

    function fulfillRequest(bytes32 requestId, bytes memory response, bytes memory) internal override {
        uint256 marketId = pendingRequests[requestId];
        if (marketId == 0) return;

        // A. Decode (String + Address)
        (string memory winningTrack, address artistAddress) = abi.decode(response, (string, address));
        Market storage market = markets[marketId];

        // B. Calculate Fees (10% Total)
        uint256 grossPool = market.totalPool;
        uint256 platformCut = (grossPool * 400) / 10000; // 4%
        uint256 creatorCut  = (grossPool * 300) / 10000; // 3%
        uint256 artistCut   = (grossPool * 300) / 10000; // 3%
        uint256 totalFee    = platformCut + creatorCut + artistCut;

        // C. Distribute Fees
        // Platform fees sent directly to fee recipient (no withdrawal needed)
        uint256 totalPlatformFees = platformCut;
        if (artistAddress == address(0)) {
            // If artist unknown, platform keeps artist cut too
            totalPlatformFees += artistCut;
        }
        
        // Send platform fees directly to fee recipient
        if (totalPlatformFees > 0) {
            require(usdcToken.transfer(feeRecipient, totalPlatformFees), "Platform fee transfer failed");
        }
        
        // Creator and artist rewards stored for withdrawal (pull pattern)
        rewardBalances[market.creator] += creatorCut;
        if (artistAddress != address(0)) {
            rewardBalances[artistAddress] += artistCut;
        }

        // D. Finalize
        market.winningTrack = winningTrack;
        market.totalPool = grossPool - totalFee;
        market.totalPaidOut = 0; // Initialize payout tracking
        market.resolved = true;
        marketHasPendingRequest[marketId] = false;
        delete pendingRequests[requestId];
        
        emit MarketResolved(marketId, winningTrack, artistAddress, market.totalPool);
    }

    // --- 5. Withdrawals (Earnings) ---
    
    // For Creators and Artists to pull their rewards
    function withdrawRewards() external {
        uint256 amount = rewardBalances[msg.sender];
        require(amount > 0, "No rewards");
        
        // Checks-Effects-Interactions pattern: Transfer first, then update state
        require(usdcToken.transfer(msg.sender, amount), "Transfer failed");
        rewardBalances[msg.sender] = 0;
        
        emit RewardsWithdrawn(msg.sender, amount);
    }

    // --- 7. Owner Functions ---
    
    // Owner function to set/update fee recipient
    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Invalid fee recipient address");
        feeRecipient = _feeRecipient;
    }
    
    // Emergency pause function
    function pause() external onlyOwner {
        _pause();
    }
    
    // Unpause function
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // Update maximum bet amount (owner only)
    function setMaxBetAmount(uint256 _maxBetAmount) external onlyOwner {
        require(_maxBetAmount > 0, "Max bet must be > 0");
        maxBetAmount = _maxBetAmount;
        emit MaxBetAmountUpdated(_maxBetAmount);
    }
    
    // Update minimum market duration (owner only)
    function setMinMarketDuration(uint256 _minDuration) external onlyOwner {
        require(_minDuration >= 1 hours, "Min duration must be >= 1 hour");
        minMarketDuration = _minDuration;
        emit MinMarketDurationUpdated(_minDuration);
    }

    // --- 6. Withdrawals (Winners) ---
    
    function claimWinnings(uint256 marketId) external {
        Market storage market = markets[marketId];
        require(market.resolved, "Not resolved");

        uint256 userWinningShare = 0;
        uint256 totalWinningStakes = 0;
        
        Bet[] storage bets = marketBets[marketId];
        
        // Calculate Total Winning Stake (Optimization: Store this in Market struct in prod)
        for (uint256 i = 0; i < bets.length; i++) {
            if (keccak256(bytes(bets[i].predictedTrack)) == keccak256(bytes(market.winningTrack))) {
                totalWinningStakes += bets[i].amount;
            }
        }
        require(totalWinningStakes > 0, "House wins (No winners)");

        // Calculate User Share
        for (uint256 i = 0; i < bets.length; i++) {
            if (bets[i].user == msg.sender && !bets[i].claimed) {
                 if (keccak256(bytes(bets[i].predictedTrack)) == keccak256(bytes(market.winningTrack))) {
                     userWinningShare += bets[i].amount;
                     bets[i].claimed = true;
                 }
            }
        }
        require(userWinningShare > 0, "Nothing to claim");

        // Calculate proportional payout
        uint256 payout = (userWinningShare * market.totalPool) / totalWinningStakes;
        
        // Handle remainder: if this payout would exceed remaining pool, give remainder to this claimer
        uint256 remainingInPool = market.totalPool - market.totalPaidOut;
        if (payout > remainingInPool) {
            payout = remainingInPool; // Give remainder to this claimer
        }
        
        require(payout > 0, "No payout available");
        require(usdcToken.transfer(msg.sender, payout), "Transfer failed");
        
        // Update state after successful transfer
        market.totalPaidOut += payout;
        
        emit WinningsClaimed(marketId, msg.sender, payout);
    }
}

