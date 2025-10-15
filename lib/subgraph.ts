// Subgraph configuration for Playlist NFT
export const SUBGRAPH_CONFIG = {
  // GraphQL API endpoint
  endpoint:
    "https://subgraph.satsuma-prod.com/dd26579d39d0/creative-organization-dao--378139/playlist-nft/version/v0.0.2/api",

  // Playground URL for development
  playground:
    "https://subgraph.satsuma-prod.com/creative-organization-dao--378139/playlist-nft/playground",

  // Indexing status endpoint
  status:
    "https://subgraph.satsuma-prod.com/dd26579d39d0/creative-organization-dao--378139/playlist-nft/status",

  // Query key (already embedded in the endpoint)
  queryKey: "dd26579d39d0",
};

// Common GraphQL queries for the subgraph
export const SUBGRAPH_QUERIES = {
  // Get basic metadata
  meta: `
    query GetMeta {
      _meta {
        block {
          number
          hash
        }
      }
    }
  `,

  // Get all playlists
  playlists: `
    query GetPlaylists($first: Int = 10, $skip: Int = 0) {
      playlists(first: $first, skip: $skip, orderBy: createdAt, orderDirection: desc) {
        id
        name
        description
        coverImageUrl
        creator
        createdAt
        isPrivate
        maxSupply
        price
        tags
        songs
        artists
        collaborators
      }
    }
  `,

  // Get playlist by ID
  playlist: `
    query GetPlaylist($id: ID!) {
      playlist(id: $id) {
        id
        name
        description
        coverImageUrl
        creator
        createdAt
        isPrivate
        maxSupply
        price
        tags
        songs
        artists
        collaborators
      }
    }
  `,

  // Get playlists by creator
  playlistsByCreator: `
    query GetPlaylistsByCreator($creator: Bytes!, $first: Int = 10, $skip: Int = 0) {
      playlists(
        where: { creator: $creator }
        first: $first
        skip: $skip
        orderBy: createdAt
        orderDirection: desc
      ) {
        id
        name
        description
        coverImageUrl
        creator
        createdAt
        isPrivate
        maxSupply
        price
        tags
        songs
        artists
        collaborators
      }
    }
  `,

  // Get recent playlist deployments
  recentDeployments: `
    query GetRecentDeployments($first: Int = 10) {
      playlistDeployeds(first: $first, orderBy: blockTimestamp, orderDirection: desc) {
        id
        playlistAddress
        name
        owner
        salt
        tags
        blockNumber
        blockTimestamp
        transactionHash
      }
    }
  `,

  // Get playlist created events
  playlistCreated: `
    query GetPlaylistCreatedEvents($first: Int = 10) {
      playlistCreateds(first: $first, orderBy: blockTimestamp, orderDirection: desc) {
        id
        tokenId
        creator
        name
        blockNumber
        blockTimestamp
        transactionHash
      }
    }
  `,

  // Get playlist minted events
  playlistMinted: `
    query GetPlaylistMintedEvents($first: Int = 10) {
      playlistMinteds(first: $first, orderBy: blockTimestamp, orderDirection: desc) {
        id
        tokenId
        to
        amount
        blockNumber
        blockTimestamp
        transactionHash
      }
    }
  `,

  // Get songs added to playlists
  songsAdded: `
    query GetSongsAdded($first: Int = 10) {
      songAddeds(first: $first, orderBy: blockTimestamp, orderDirection: desc) {
        id
        tokenId
        songId
        artist
        blockNumber
        blockTimestamp
        transactionHash
      }
    }
  `,
};

// Utility function to query the subgraph
export async function querySubgraph(
  query: string,
  variables?: Record<string, unknown>
) {
  try {
    const response = await fetch(SUBGRAPH_CONFIG.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    return result.data;
  } catch (error) {
    console.error("Error querying subgraph:", error);
    throw error;
  }
}

// Convenience functions for common queries
export async function getPlaylists(first: number = 10, skip: number = 0) {
  return querySubgraph(SUBGRAPH_QUERIES.playlists, { first, skip });
}

export async function getPlaylist(id: string) {
  return querySubgraph(SUBGRAPH_QUERIES.playlist, { id });
}

export async function getPlaylistsByCreator(
  creator: string,
  first: number = 10,
  skip: number = 0
) {
  return querySubgraph(SUBGRAPH_QUERIES.playlistsByCreator, {
    creator,
    first,
    skip,
  });
}

export async function getRecentDeployments(first: number = 10) {
  return querySubgraph(SUBGRAPH_QUERIES.recentDeployments, { first });
}

export async function getPlaylistCreatedEvents(first: number = 10) {
  return querySubgraph(SUBGRAPH_QUERIES.playlistCreated, { first });
}

export async function getPlaylistMintedEvents(first: number = 10) {
  return querySubgraph(SUBGRAPH_QUERIES.playlistMinted, { first });
}

export async function getSongsAddedEvents(first: number = 10) {
  return querySubgraph(SUBGRAPH_QUERIES.songsAdded, { first });
}

export async function getSubgraphMeta() {
  return querySubgraph(SUBGRAPH_QUERIES.meta);
}

// Type definitions for subgraph responses
export interface PlaylistSubgraphData {
  id: string;
  name: string;
  description: string;
  coverImageUrl: string;
  creator: string;
  createdAt: string;
  isPrivate: boolean;
  maxSupply: string;
  price: string;
  tags: string[];
  songs: string[];
  artists: string[];
  collaborators: string[];
}

export interface PlaylistDeployedEvent {
  id: string;
  playlistAddress: string;
  name: string;
  owner: string;
  salt: string;
  tags: string[];
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

export interface PlaylistCreatedEvent {
  id: string;
  tokenId: string;
  creator: string;
  name: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

export interface PlaylistMintedEvent {
  id: string;
  tokenId: string;
  to: string;
  amount: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

export interface SongAddedEvent {
  id: string;
  tokenId: string;
  songId: string;
  artist: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

export interface SubgraphMeta {
  _meta: {
    block: {
      number: number;
      hash: string;
    };
  };
}
