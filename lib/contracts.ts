import { Address } from "viem";
import { useReadContract, useWriteContract, useChainId } from "wagmi";

// Fallback price feed for when Chainlink is unavailable
const FALLBACK_ETH_PRICE = 3787; // USD per ETH - updated based on current market price

// Calculate fallback ETH amount for given cents
function calculateFallbackETH(cents: bigint): bigint {
  const centsNumber = Number(cents);
  const ethAmount = centsNumber / 100 / FALLBACK_ETH_PRICE;
  return BigInt(Math.ceil(ethAmount * 1e18)); // Convert to wei and round up
}

// Utility function to test price feed directly (for debugging)
export function useTestPriceFeed() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);

  const { data: description } = useReadContract({
    address: addresses.PRICE_FEED,
    abi: chainlinkPriceFeedABI,
    functionName: "description",
  });

  const { data: version } = useReadContract({
    address: addresses.PRICE_FEED,
    abi: chainlinkPriceFeedABI,
    functionName: "version",
  });

  const { data: decimals } = useReadContract({
    address: addresses.PRICE_FEED,
    abi: chainlinkPriceFeedABI,
    functionName: "decimals",
  });

  const { data: latestRoundData } = useReadContract({
    address: addresses.PRICE_FEED,
    abi: chainlinkPriceFeedABI,
    functionName: "latestRoundData",
  });

  return {
    description,
    version,
    decimals,
    latestRoundData,
    priceFeedAddress: addresses.PRICE_FEED,
    chainId,
  };
}

// Contract addresses by chain
const CONTRACT_ADDRESSES = {
  // Base Sepolia (Testnet)
  84532: {
    CREATE2_FACTORY: "0x5A7861D29088B67Cc03d85c4D89B855201e030EB" as const,
    PLAYLIST_NFT: "0x4B9c51D7F985DD62f226dAB60EaA254975cB177B" as const,
    PRICE_FEED: "0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1" as const, // ETH/USD - Base Sepolia Chainlink price feed
  },
  // Base Mainnet (Production)
  8453: {
    CREATE2_FACTORY: "0x585571bF2BE914e0C9CE549E99E2E61888d09cC2" as const,
    PLAYLIST_NFT: "0x4B9c51D7F985DD62f226dAB60EaA254975cB177B" as const,
    PRICE_FEED: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70" as const, // ETH/USD - Base mainnet Chainlink price feed
  },
} as const;

// Helper function to get contract addresses for current chain
export function getContractAddresses(chainId: number) {
  const addresses =
    CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES];
  if (!addresses) {
    throw new Error(
      `Unsupported chain ID: ${chainId}. Supported chains: Base Sepolia (84532), Base Mainnet (8453)`
    );
  }
  return addresses;
}

// Legacy exports for backward compatibility (Base Sepolia)
export const CREATE2_FACTORY_ADDRESS =
  CONTRACT_ADDRESSES[84532].CREATE2_FACTORY;

// Contract ABIs - Updated with deployed contract ABIs
export const create2FactoryABI = [
  {
    inputs: [{ internalType: "address", name: "_priceFeed", type: "address" }],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "playlistAddress",
        type: "address",
      },
      {
        indexed: false,
        internalType: "string",
        name: "name",
        type: "string",
      },
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "salt",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "string[]",
        name: "tags",
        type: "string[]",
      },
    ],
    name: "PlaylistDeployed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "string",
        name: "name",
        type: "string",
      },
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: false,
        internalType: "string",
        name: "reason",
        type: "string",
      },
    ],
    name: "PlaylistDeploymentFailed",
    type: "event",
  },
  {
    inputs: [],
    name: "MAX_DESCRIPTION_LENGTH",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "MAX_NAME_LENGTH",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "MAX_TAGS",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "MAX_TAG_LENGTH",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "PLATFORM_FEE_CENTS",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "string", name: "name", type: "string" },
      { internalType: "string", name: "coverImageUrl", type: "string" },
      { internalType: "string", name: "description", type: "string" },
      { internalType: "string[]", name: "tags", type: "string[]" },
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "_priceFeed", type: "address" },
      { internalType: "uint256", name: "salt", type: "uint256" },
    ],
    name: "computePlaylistAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "string", name: "name", type: "string" },
      { internalType: "string", name: "coverImageUrl", type: "string" },
      { internalType: "string", name: "description", type: "string" },
      { internalType: "string[]", name: "tags", type: "string[]" },
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "_priceFeed", type: "address" },
      { internalType: "uint256", name: "salt", type: "uint256" },
    ],
    name: "deployPlaylist",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "getLatestETHUSDPrice",
    outputs: [{ internalType: "int256", name: "", type: "int256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "string", name: "name", type: "string" },
      { internalType: "string", name: "coverImageUrl", type: "string" },
      { internalType: "string", name: "description", type: "string" },
      { internalType: "string[]", name: "tags", type: "string[]" },
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "_priceFeed", type: "address" },
    ],
    name: "getPlaylistBytecode",
    outputs: [{ internalType: "bytes", name: "", type: "bytes" }],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "cents", type: "uint256" }],
    name: "getRequiredETHForCents",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "priceFeed",
    outputs: [
      {
        internalType: "contract AggregatorV3Interface",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "string", name: "name", type: "string" },
      { internalType: "string", name: "description", type: "string" },
      { internalType: "string[]", name: "tags", type: "string[]" },
    ],
    name: "validatePlaylistMetadata",
    outputs: [
      { internalType: "bool", name: "", type: "bool" },
      { internalType: "string", name: "", type: "string" },
    ],
    stateMutability: "pure",
    type: "function",
  },
] as const;

export const playlistNFTABI = [
  { inputs: [], stateMutability: "nonpayable", type: "constructor" },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "operator",
        type: "address",
      },
      {
        indexed: false,
        internalType: "bool",
        name: "approved",
        type: "bool",
      },
    ],
    name: "ApprovalForAll",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "collaborator",
        type: "address",
      },
    ],
    name: "CollaboratorAdded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "collaborator",
        type: "address",
      },
    ],
    name: "CollaboratorRemoved",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint8",
        name: "version",
        type: "uint8",
      },
    ],
    name: "Initialized",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "Paused",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "creator",
        type: "address",
      },
      {
        indexed: false,
        internalType: "string",
        name: "name",
        type: "string",
      },
    ],
    name: "PlaylistCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "PlaylistMinted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "string",
        name: "songId",
        type: "string",
      },
      {
        indexed: true,
        internalType: "address",
        name: "artist",
        type: "address",
      },
    ],
    name: "SongAdded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "operator",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256[]",
        name: "ids",
        type: "uint256[]",
      },
      {
        indexed: false,
        internalType: "uint256[]",
        name: "values",
        type: "uint256[]",
      },
    ],
    name: "TransferBatch",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "operator",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "id",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "TransferSingle",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "string",
        name: "value",
        type: "string",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "id",
        type: "uint256",
      },
    ],
    name: "URI",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "Unpaused",
    type: "event",
  },
  {
    inputs: [],
    name: "CONTRACT_NAME",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "playlistId", type: "uint256" },
      { internalType: "address", name: "collaborator", type: "address" },
    ],
    name: "addCollaborator",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "playlistId", type: "uint256" },
      { internalType: "string", name: "songId", type: "string" },
      { internalType: "address", name: "artist", type: "address" },
    ],
    name: "addSong",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "account", type: "address" },
      { internalType: "uint256", name: "id", type: "uint256" },
    ],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address[]", name: "accounts", type: "address[]" },
      { internalType: "uint256[]", name: "ids", type: "uint256[]" },
    ],
    name: "balanceOfBatch",
    outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          { internalType: "string", name: "name", type: "string" },
          { internalType: "string", name: "description", type: "string" },
          {
            internalType: "string",
            name: "coverImageUrl",
            type: "string",
          },
          { internalType: "string[]", name: "tags", type: "string[]" },
          { internalType: "address", name: "creator", type: "address" },
          { internalType: "uint256", name: "createdAt", type: "uint256" },
          { internalType: "string[]", name: "songs", type: "string[]" },
          {
            internalType: "address[]",
            name: "artists",
            type: "address[]",
          },
          { internalType: "bool", name: "isPrivate", type: "bool" },
          { internalType: "uint256", name: "maxSupply", type: "uint256" },
          { internalType: "uint256", name: "price", type: "uint256" },
          {
            internalType: "address[]",
            name: "collaborators",
            type: "address[]",
          },
        ],
        internalType: "struct PlaylistNFT.PlaylistMetadata",
        name: "metadata",
        type: "tuple",
      },
      {
        internalType: "address",
        name: "storageContract",
        type: "address",
      },
    ],
    name: "createPlaylist",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "id", type: "uint256" }],
    name: "getPlaylist",
    outputs: [
      {
        components: [
          { internalType: "string", name: "name", type: "string" },
          { internalType: "string", name: "description", type: "string" },
          {
            internalType: "string",
            name: "coverImageUrl",
            type: "string",
          },
          { internalType: "string[]", name: "tags", type: "string[]" },
          { internalType: "address", name: "creator", type: "address" },
          { internalType: "uint256", name: "createdAt", type: "uint256" },
          { internalType: "string[]", name: "songs", type: "string[]" },
          {
            internalType: "address[]",
            name: "artists",
            type: "address[]",
          },
          { internalType: "bool", name: "isPrivate", type: "bool" },
          { internalType: "uint256", name: "maxSupply", type: "uint256" },
          { internalType: "uint256", name: "price", type: "uint256" },
          {
            internalType: "address[]",
            name: "collaborators",
            type: "address[]",
          },
        ],
        internalType: "struct PlaylistNFT.PlaylistMetadata",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "initialize",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "account", type: "address" },
      { internalType: "address", name: "operator", type: "address" },
    ],
    name: "isApprovedForAll",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "playlistId", type: "uint256" },
      { internalType: "address", name: "account", type: "address" },
    ],
    name: "isCollaborator",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "id", type: "uint256" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "mintPlaylist",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "pause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "paused",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "playlistStorageContracts",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "playlists",
    outputs: [
      { internalType: "string", name: "name", type: "string" },
      { internalType: "string", name: "description", type: "string" },
      { internalType: "string", name: "coverImageUrl", type: "string" },
      { internalType: "address", name: "creator", type: "address" },
      { internalType: "uint256", name: "createdAt", type: "uint256" },
      { internalType: "bool", name: "isPrivate", type: "bool" },
      { internalType: "uint256", name: "maxSupply", type: "uint256" },
      { internalType: "uint256", name: "price", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "playlistId", type: "uint256" },
      { internalType: "address", name: "collaborator", type: "address" },
    ],
    name: "removeCollaborator",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "from", type: "address" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256[]", name: "ids", type: "uint256[]" },
      { internalType: "uint256[]", name: "amounts", type: "uint256[]" },
      { internalType: "bytes", name: "data", type: "bytes" },
    ],
    name: "safeBatchTransferFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "from", type: "address" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "id", type: "uint256" },
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "bytes", name: "data", type: "bytes" },
    ],
    name: "safeTransferFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "operator", type: "address" },
      { internalType: "bool", name: "approved", type: "bool" },
    ],
    name: "setApprovalForAll",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "string", name: "newuri", type: "string" }],
    name: "setURI",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes4", name: "interfaceId", type: "bytes4" }],
    name: "supportsInterface",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "id", type: "uint256" }],
    name: "totalSupply",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "unpause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "uri",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Legacy playlist ABI for backward compatibility
export const playlistABI = [
  {
    name: "getSongs",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        components: [
          { name: "id", type: "string" },
          { name: "title", type: "string" },
          { name: "artist", type: "string" },
          { name: "cover", type: "string" },
          { name: "creatorAddress", type: "address" },
          { name: "audioUrl", type: "string" },
          { name: "playCount", type: "uint256" },
        ],
        name: "songs",
        type: "tuple[]",
      },
    ],
  },
] as const;

// Hooks for contract interactions
export function useDeployPlaylist() {
  const {
    writeContract,
    data: hash,
    isPending,
    isSuccess,
    isError,
    error,
  } = useWriteContract();
  const chainId = useChainId();

  const deployPlaylist = (
    name: string,
    coverImageUrl: string,
    description: string,
    tags: string[],
    owner: Address,
    salt: bigint,
    value: bigint
  ) => {
    const addresses = getContractAddresses(chainId);
    writeContract({
      abi: create2FactoryABI,
      address: addresses.CREATE2_FACTORY,
      functionName: "deployPlaylist",
      args: [
        name,
        coverImageUrl,
        description,
        tags,
        owner,
        addresses.PRICE_FEED,
        salt,
      ],
      value,
    });
  };

  return { deployPlaylist, hash, isPending, isSuccess, isError, error };
}

// Complete Chainlink AggregatorV3Interface ABI for direct price feed access
const chainlinkPriceFeedABI = [
  {
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "description",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint80", name: "_roundId", type: "uint80" }],
    name: "getRoundData",
    outputs: [
      { internalType: "uint80", name: "roundId", type: "uint80" },
      { internalType: "int256", name: "answer", type: "int256" },
      { internalType: "uint256", name: "startedAt", type: "uint256" },
      { internalType: "uint256", name: "updatedAt", type: "uint256" },
      { internalType: "uint80", name: "answeredInRound", type: "uint80" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "latestAnswer",
    outputs: [{ internalType: "int256", name: "", type: "int256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "latestRound",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "latestRoundData",
    outputs: [
      { internalType: "uint80", name: "roundId", type: "uint80" },
      { internalType: "int256", name: "answer", type: "int256" },
      { internalType: "uint256", name: "startedAt", type: "uint256" },
      { internalType: "uint256", name: "updatedAt", type: "uint256" },
      { internalType: "uint80", name: "answeredInRound", type: "uint80" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "latestTimestamp",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "version",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export function useGetRequiredETH(cents: bigint): {
  data: bigint | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
  _debug?: {
    contractError: boolean;
    fallbackUsed: boolean;
    priceSource: string;
    originalError: Error | null;
  };
} {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);

  // Try multiple methods to get price from Chainlink price feed
  const { data: latestRoundData, isError: latestRoundError } = useReadContract({
    address: addresses.PRICE_FEED,
    abi: chainlinkPriceFeedABI,
    functionName: "latestRoundData",
    query: {
      enabled: cents > BigInt(0),
      retry: 2,
      staleTime: 30000,
    },
  });

  const { data: latestAnswer, isError: latestAnswerError } = useReadContract({
    address: addresses.PRICE_FEED,
    abi: chainlinkPriceFeedABI,
    functionName: "latestAnswer",
    query: {
      enabled: cents > BigInt(0),
      retry: 2,
      staleTime: 30000,
    },
  });

  const { data: decimals, isError: decimalsError } = useReadContract({
    address: addresses.PRICE_FEED,
    abi: chainlinkPriceFeedABI,
    functionName: "decimals",
    query: {
      enabled: cents > BigInt(0),
      retry: 2,
      staleTime: 300000, // Decimals don't change often
    },
  });

  const { data, isLoading, isError, error, refetch, ...rest } = useReadContract({
    address: addresses.CREATE2_FACTORY,
    abi: create2FactoryABI,
    functionName: "getRequiredETHForCents",
    args: [cents],
    // Only run query if cents is greater than 0
    query: {
      enabled: cents > BigInt(0),
      retry: 2, // Reduced retries since we have fallback
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      staleTime: 30000,
      refetchInterval: 60000,
    },
  });

  // If cents is 0, return 0 immediately
  if (cents === BigInt(0)) {
    return { 
      data: BigInt(0), 
      isLoading: false, 
      isError: false, 
      error: null,
      refetch: () => Promise.resolve({ data: BigInt(0), error: null }),
      ...rest 
    };
  }

  // Calculate fallback price from Chainlink data if available
  let fallbackData: bigint | undefined;
  let priceSource = "none";
  
  if (latestRoundData && !latestRoundError) {
    const [, answer, , updatedAt] = latestRoundData;
    const priceDecimals = decimals && !decimalsError ? Number(decimals) : 8; // Default to 8 decimals
    const price = Number(answer) / (10 ** priceDecimals);
    const ethAmount = Number(cents) / 100 / price;
    fallbackData = BigInt(Math.ceil(ethAmount * 1e18)); // Convert to wei
    priceSource = "latestRoundData";
    
    // Check data freshness (warn if older than 1 hour)
    const currentTime = Math.floor(Date.now() / 1000);
    const dataAge = currentTime - Number(updatedAt);
    if (dataAge > 3600) {
      console.warn(`Price feed data is ${dataAge} seconds old (${Math.floor(dataAge / 60)} minutes)`);
    }
  } else if (latestAnswer && !latestAnswerError) {
    const priceDecimals = decimals && !decimalsError ? Number(decimals) : 8;
    const price = Number(latestAnswer) / (10 ** priceDecimals);
    const ethAmount = Number(cents) / 100 / price;
    fallbackData = BigInt(Math.ceil(ethAmount * 1e18));
    priceSource = "latestAnswer";
  }

  // Use fallback calculation if contract call fails
  const finalData = isError ? (fallbackData || calculateFallbackETH(cents)) : data;
  const finalIsError = isError && !fallbackData;

  // Log error details for debugging
  if (isError && error) {
    console.warn("Price feed contract call failed, using fallback:", {
      error: error.message,
      chainId,
      contractAddress: addresses.CREATE2_FACTORY,
      priceFeedAddress: addresses.PRICE_FEED,
      cents: cents.toString(),
      fallbackUsed: !!fallbackData,
      priceSource,
      fallbackPrice: fallbackData ? (Number(fallbackData) / 1e18).toFixed(6) : "none",
      latestRoundError: latestRoundError,
      latestAnswerError: latestAnswerError,
      decimalsError: decimalsError,
    });
  }

  return { 
    data: finalData, 
    isLoading, 
    isError: finalIsError, 
    error: finalIsError ? error : null, // Only return error if we truly failed
    refetch: refetch || (() => Promise.resolve({ data: finalData, error: null })),
    // Add debugging info for development
    _debug: {
      contractError: isError,
      fallbackUsed: !!fallbackData,
      priceSource,
      originalError: error,
    },
    ...rest 
  };
}

export function useGetPlaylistSongs(playlistAddress?: `0x${string}`) {
  const { data, isLoading, isError, ...rest } = useReadContract({
    address: playlistAddress,
    abi: playlistABI,
    functionName: "getSongs",
    query: {
      enabled: !!playlistAddress,
    },
  });

  return { data, isLoading, isError, ...rest };
}

// New hooks for Playlist NFT contract interactions
export function useCreatePlaylistNFT() {
  const { writeContract, ...rest } = useWriteContract();
  const chainId = useChainId();

  const createPlaylist = (
    metadata: {
      name: string;
      description: string;
      coverImageUrl: string;
      tags: string[];
      creator: Address;
      createdAt: bigint;
      songs: string[];
      artists: Address[];
      isPrivate: boolean;
      maxSupply: bigint;
      price: bigint;
      collaborators: Address[];
    },
    storageContract: Address
  ) => {
    const addresses = getContractAddresses(chainId);
    writeContract({
      abi: playlistNFTABI,
      address: addresses.PLAYLIST_NFT,
      functionName: "createPlaylist",
      args: [metadata, storageContract],
    });
  };

  return { createPlaylist, ...rest };
}

export function useGetPlaylistNFT(id?: bigint) {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);

  return useReadContract({
    address: addresses.PLAYLIST_NFT,
    abi: playlistNFTABI,
    functionName: "getPlaylist",
    args: [id!],
    query: {
      enabled: typeof id !== "undefined",
    },
  });
}

export function useMintPlaylistNFT() {
  const { writeContract, ...rest } = useWriteContract();
  const chainId = useChainId();

  const mintPlaylist = (
    to: Address,
    id: bigint,
    amount: bigint,
    value: bigint
  ) => {
    const addresses = getContractAddresses(chainId);
    writeContract({
      abi: playlistNFTABI,
      address: addresses.PLAYLIST_NFT,
      functionName: "mintPlaylist",
      args: [to, id, amount],
      value,
    });
  };

  return { mintPlaylist, ...rest };
}
