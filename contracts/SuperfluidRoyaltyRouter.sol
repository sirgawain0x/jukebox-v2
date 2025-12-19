// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";

/**
 * @title SuperfluidRoyaltyRouter
 * @notice Enhanced router with play-rate verification, auto-wrap, and fan-boost capabilities
 * @dev This contract works alongside the deployed SpinampUSDC contract without modifying it
 *      Artists opt-in to Superfluid royalties, and the backend routes funds to pools
 */
contract SuperfluidRoyaltyRouter is ConfirmedOwner {
    IERC20 public immutable usdcToken;
    address public superToken; // fUSDCx address (set after deployment)
    address public host; // Superfluid host address
    address public gda; // GDA Forwarder address
    
    // Oracle for verified play rates (backend-managed)
    address public playRateOracle; // Backend service address
    
    // Artist opt-in tracking
    mapping(address => bool) public optedInArtists;
    
    // Market pool tracking
    mapping(uint256 => address) public marketPools;
    
    // Fan boost tracking: artist => boost multiplier (basis points)
    mapping(address => uint256) public artistBoostMultipliers;
    
    // Boost expiration tracking
    mapping(address => uint256) public boostExpiresAt;
    
    // Minimum play completion rate (50% = 5000 basis points)
    uint256 public constant MIN_COMPLETION_RATE = 5000; // 50%
    
    // Maximum boost multiplier (5x = 50000 basis points)
    uint256 public constant MAX_BOOST_MULTIPLIER = 50000; // 5x
    
    // Events
    event ArtistOptedIn(address indexed artist);
    event ArtistOptedOut(address indexed artist);
    event PoolCreated(uint256 indexed marketId, address pool);
    event RoyaltyRouted(address indexed artist, uint256 amount, address pool);
    event FanBoosted(address indexed artist, uint256 multiplier, uint256 duration, address boostedBy);
    event PlayRateVerified(address indexed artist, string trackId, uint256 completionRate);
    event SuperfluidAddressesSet(address superToken, address host, address gda);
    event PlayRateOracleSet(address oracle);
    
    constructor(
        address _usdcToken,
        address _playRateOracle
    ) ConfirmedOwner(msg.sender) {
        require(_usdcToken != address(0), "Invalid USDC address");
        require(_playRateOracle != address(0), "Invalid oracle address");
        
        usdcToken = IERC20(_usdcToken);
        playRateOracle = _playRateOracle;
    }
    
    /**
     * @notice Set Superfluid contract addresses (owner only)
     * @param _superToken fUSDCx token address
     * @param _host Superfluid host address
     * @param _gda GDA Forwarder address
     */
    function setSuperfluidAddresses(
        address _superToken,
        address _host,
        address _gda
    ) external onlyOwner {
        require(_superToken != address(0), "Invalid superToken");
        require(_host != address(0), "Invalid host");
        require(_gda != address(0), "Invalid GDA");
        
        superToken = _superToken;
        host = _host;
        gda = _gda;
        
        emit SuperfluidAddressesSet(_superToken, _host, _gda);
    }
    
    /**
     * @notice Artist opts in to Superfluid royalties
     */
    function optIn() external {
        optedInArtists[msg.sender] = true;
        emit ArtistOptedIn(msg.sender);
    }
    
    /**
     * @notice Artist opts out of Superfluid royalties
     */
    function optOut() external {
        optedInArtists[msg.sender] = false;
        // Clear any active boosts
        artistBoostMultipliers[msg.sender] = 0;
        boostExpiresAt[msg.sender] = 0;
        emit ArtistOptedOut(msg.sender);
    }
    
    /**
     * @notice Set play rate oracle (owner only)
     */
    function setPlayRateOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "Invalid oracle");
        playRateOracle = _oracle;
        emit PlayRateOracleSet(_oracle);
    }
    
    /**
     * @notice Verify play completion rate (called by oracle/backend)
     * @param artist Artist address
     * @param trackId Track identifier
     * @param completionRate Completion rate in basis points (10000 = 100%)
     */
    function verifyPlayRate(
        address artist,
        string calldata trackId,
        uint256 completionRate
    ) external {
        require(msg.sender == playRateOracle, "Only oracle");
        require(completionRate <= 10000, "Invalid rate");
        
        emit PlayRateVerified(artist, trackId, completionRate);
    }
    
    /**
     * @notice Register pool for market (called by backend after pool creation)
     * @param marketId Market ID
     * @param poolAddress GDA pool address
     */
    function registerPool(uint256 marketId, address poolAddress) external onlyOwner {
        require(poolAddress != address(0), "Invalid pool address");
        marketPools[marketId] = poolAddress;
        emit PoolCreated(marketId, poolAddress);
    }
    
    /**
     * @notice Route royalty with auto-wrap and verification
     * @dev This function is called by backend service after artist withdrawal from SpinampUSDC
     * @param marketId Market ID
     * @param artist Artist address
     * @param amount USDC amount (will be auto-wrapped to fUSDCx by backend)
     * @param verifiedPlays Number of verified plays (from oracle)
     */
    function routeToPool(
        uint256 marketId,
        address artist,
        uint256 amount,
        uint256 verifiedPlays
    ) external {
        require(optedInArtists[artist], "Artist not opted in");
        require(marketPools[marketId] != address(0), "Pool not created");
        require(amount > 0, "Amount must be > 0");
        require(msg.sender == playRateOracle, "Only oracle can route");
        
        // Transfer USDC from oracle (oracle must approve this contract)
        require(usdcToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        // Note: Auto-wrap to fUSDCx is handled by backend service
        // This contract just tracks the routing
        
        emit RoyaltyRouted(artist, amount, marketPools[marketId]);
    }
    
    /**
     * @notice Fan boost: Increase flow rate to artist temporarily
     * @param artist Artist to boost
     * @param multiplier Boost multiplier in basis points (15000 = 1.5x)
     * @param duration Duration in seconds
     */
    function fanBoost(
        address artist,
        uint256 multiplier,
        uint256 duration
    ) external payable {
        require(optedInArtists[artist], "Artist not opted in");
        require(multiplier >= 10000 && multiplier <= MAX_BOOST_MULTIPLIER, "Invalid multiplier");
        require(duration > 0 && duration <= 7 days, "Invalid duration");
        
        // Store boost
        artistBoostMultipliers[artist] = multiplier;
        boostExpiresAt[artist] = block.timestamp + duration;
        
        emit FanBoosted(artist, multiplier, duration, msg.sender);
    }
    
    /**
     * @notice Clear expired boost (can be called by anyone)
     * @param artist Artist address
     */
    function clearExpiredBoost(address artist) external {
        if (boostExpiresAt[artist] > 0 && block.timestamp >= boostExpiresAt[artist]) {
            artistBoostMultipliers[artist] = 0;
            boostExpiresAt[artist] = 0;
        }
    }
    
    /**
     * @notice Get active boost for artist
     * @param artist Artist address
     * @return multiplier Current boost multiplier (basis points)
     * @return expiresAt Timestamp when boost expires
     */
    function getActiveBoost(address artist) external view returns (uint256 multiplier, uint256 expiresAt) {
        if (block.timestamp < boostExpiresAt[artist]) {
            return (artistBoostMultipliers[artist], boostExpiresAt[artist]);
        }
        return (0, 0);
    }
    
    /**
     * @notice Check if artist is opted in
     * @param artist Artist address
     * @return bool True if opted in
     */
    function isOptedIn(address artist) external view returns (bool) {
        return optedInArtists[artist];
    }
    
    /**
     * @notice Get pool address for market
     * @param marketId Market ID
     * @return poolAddress Pool address (zero if not created)
     */
    function getPoolAddress(uint256 marketId) external view returns (address poolAddress) {
        return marketPools[marketId];
    }
}

