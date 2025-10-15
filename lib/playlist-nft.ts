import { Address } from "viem";
import { useReadContract, useWriteContract, useChainId } from "wagmi";
import { playlistNFTABI, getContractAddresses } from "./contracts";

// Re-export the ABI and main hooks from contracts.ts
export { playlistNFTABI } from "./contracts";

// Type definition for PlaylistMetadata that matches the contract
export type PlaylistMetadata = {
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
};

// Re-export main hooks from contracts.ts
export {
  useCreatePlaylistNFT,
  useGetPlaylistNFT,
  useMintPlaylistNFT,
} from "./contracts";

// Additional utility hooks for Playlist NFT contract

export const useAddSongToPlaylist = () => {
  const { writeContract, ...rest } = useWriteContract();
  const chainId = useChainId();

  const addSongToPlaylist = (
    playlistId: bigint,
    songId: string,
    artist: Address
  ) => {
    const addresses = getContractAddresses(chainId);
    return writeContract({
      address: addresses.PLAYLIST_NFT,
      abi: playlistNFTABI,
      functionName: "addSong",
      args: [playlistId, songId, artist],
    });
  };

  return { addSongToPlaylist, ...rest };
};

export const useAddCollaborator = () => {
  const { writeContract, ...rest } = useWriteContract();
  const chainId = useChainId();

  const addCollaborator = (playlistId: bigint, collaborator: Address) => {
    const addresses = getContractAddresses(chainId);
    return writeContract({
      address: addresses.PLAYLIST_NFT,
      abi: playlistNFTABI,
      functionName: "addCollaborator",
      args: [playlistId, collaborator],
    });
  };

  return { addCollaborator, ...rest };
};

export const useRemoveCollaborator = () => {
  const { writeContract, ...rest } = useWriteContract();
  const chainId = useChainId();

  const removeCollaborator = (playlistId: bigint, collaborator: Address) => {
    const addresses = getContractAddresses(chainId);
    return writeContract({
      address: addresses.PLAYLIST_NFT,
      abi: playlistNFTABI,
      functionName: "removeCollaborator",
      args: [playlistId, collaborator],
    });
  };

  return { removeCollaborator, ...rest };
};

export const useIsCollaborator = (playlistId?: bigint, account?: Address) => {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);

  return useReadContract({
    address: addresses.PLAYLIST_NFT,
    abi: playlistNFTABI,
    functionName: "isCollaborator",
    args: [playlistId!, account!] as const,
    query: {
      enabled:
        typeof playlistId !== "undefined" && typeof account !== "undefined",
    },
  });
};

export const useTotalSupply = (id?: bigint) => {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);

  return useReadContract({
    address: addresses.PLAYLIST_NFT,
    abi: playlistNFTABI,
    functionName: "totalSupply",
    args: [id!] as const,
    query: {
      enabled: typeof id !== "undefined",
    },
  });
};

export const usePlaylistPaused = () => {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);

  return useReadContract({
    address: addresses.PLAYLIST_NFT,
    abi: playlistNFTABI,
    functionName: "paused",
  });
};

export const usePlaylistOwner = () => {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);

  return useReadContract({
    address: addresses.PLAYLIST_NFT,
    abi: playlistNFTABI,
    functionName: "owner",
  });
};

export const useBalanceOf = (account?: Address, id?: bigint) => {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);

  return useReadContract({
    address: addresses.PLAYLIST_NFT,
    abi: playlistNFTABI,
    functionName: "balanceOf",
    args: [account!, id!] as const,
    query: {
      enabled: typeof account !== "undefined" && typeof id !== "undefined",
    },
  });
};

export const useSetURI = () => {
  const { writeContract, ...rest } = useWriteContract();
  const chainId = useChainId();

  const setURI = (newuri: string) => {
    const addresses = getContractAddresses(chainId);
    return writeContract({
      address: addresses.PLAYLIST_NFT,
      abi: playlistNFTABI,
      functionName: "setURI",
      args: [newuri],
    });
  };

  return { setURI, ...rest };
};

export const usePausePlaylist = () => {
  const { writeContract, ...rest } = useWriteContract();
  const chainId = useChainId();

  const pausePlaylist = () => {
    const addresses = getContractAddresses(chainId);
    return writeContract({
      address: addresses.PLAYLIST_NFT,
      abi: playlistNFTABI,
      functionName: "pause",
    });
  };

  return { pausePlaylist, ...rest };
};

export const useUnpausePlaylist = () => {
  const { writeContract, ...rest } = useWriteContract();
  const chainId = useChainId();

  const unpausePlaylist = () => {
    const addresses = getContractAddresses(chainId);
    return writeContract({
      address: addresses.PLAYLIST_NFT,
      abi: playlistNFTABI,
      functionName: "unpause",
    });
  };

  return { unpausePlaylist, ...rest };
};

// Helper function to get the Playlist NFT contract address
export const getPlaylistNFTAddress = (chainId: number) => {
  const addresses = getContractAddresses(chainId);
  return addresses.PLAYLIST_NFT;
};
