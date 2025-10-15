import { Address } from "viem";
import { useReadContract, useWriteContract, useChainId } from "wagmi";

// Contract addresses by chain
const CONTRACT_ADDRESSES = {
  // Base Sepolia (Testnet)
  84532: {
    CREATE2_FACTORY: "0x5A7861D29088B67Cc03d85c4D89B855201e030EB" as const,
    PLAYLIST_NFT: "0x4B9c51D7F985DD62f226dAB60EaA254975cB177B" as const,
    PRICE_FEED: "0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1" as const, // ETH/USD
  },
  // Base Mainnet (Production)
  8453: {
    CREATE2_FACTORY: "0x585571bF2BE914e0C9CE549E99E2E61888d09cC2" as const,
    PLAYLIST_NFT: "0x4B9c51D7F985DD62f226dAB60EaA254975cB177B" as const,
    PRICE_FEED: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70" as const, // ETH/USD
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

export function useGetRequiredETH(cents: bigint) {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);

  const { data, isLoading, isError, ...rest } = useReadContract({
    address: addresses.CREATE2_FACTORY,
    abi: create2FactoryABI,
    functionName: "getRequiredETHForCents",
    args: [cents],
    // Only run query if cents is greater than 0
    query: {
      enabled: cents > BigInt(0),
    },
  });

  // If cents is 0, return 0 immediately
  if (cents === BigInt(0)) {
    return { data: BigInt(0), isLoading: false, isError: false, ...rest };
  }

  return { data, isLoading, isError, ...rest };
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
