// Spinamp API Utility Types and Functions
// Based on Spinamp API utilities for external links, mint types, and feed items

// ============================================================================
// External Link Types and Utilities
// ============================================================================

export type WebsiteType =
  | 'twitter'
  | 'instagram'
  | 'facebook'
  | 'youtube'
  | 'soundcloud'
  | 'tiktok'
  | 'twitch'
  | 'discord'
  | 'bandcamp'
  | 'itunes'
  | 'spotify'
  | 'tidal'
  | 'catalog'
  | 'sound'
  | 'nina'
  | 'noizd'
  | 'zora'
  | 'hey' // aka lens
  | 'custom'

export type Website = {
  id: WebsiteType
  profileRegex: string
  name: string
  placeholder: string
}

export type ExternalLinkUser = {
  url: string
  userId: string
  type: WebsiteType
  updatedAtTime: Date
}

export const SupportedWebsites: Website[] = [
  {
    id: 'twitter',
    profileRegex: '^https?://(?:www.)?(?:twitter.com|x.com)(/.*)?$',
    name: 'X',
    placeholder: 'https://x.com/',
  },
  {
    id: 'instagram',
    profileRegex: '^https?://(?:www.)?instagram.com(/.*)?$',
    name: 'Instagram',
    placeholder: 'https://instagram.com/',
  },
  {
    id: 'facebook',
    profileRegex: '^https?://(?:www.)?facebook.com(/.*)?$',
    name: 'Facebook',
    placeholder: 'https://facebook.com/',
  },
  {
    id: 'youtube',
    profileRegex: '^https?://(?:www.)?youtube.com(/.*)?$',
    name: 'Youtube',
    placeholder: 'https://youtube.com/',
  },
  {
    id: 'soundcloud',
    profileRegex: '^https?://(?:www.)?soundcloud.com(/.*)?$',
    name: 'SoundCloud',
    placeholder: 'https://soundcloud.com/',
  },
  {
    id: 'tiktok',
    profileRegex: '^https?://(?:www.)?tiktok.com(/.*)?$',
    name: 'TikTok',
    placeholder: 'https://tiktok.com/',
  },
  {
    id: 'twitch',
    profileRegex: '^https?://(?:www.)?twitch.tv(/.*)?$',
    name: 'Twitch',
    placeholder: 'https://twitch.tv/',
  },
  {
    id: 'discord',
    profileRegex: '^(?:https?://)?(discordapp.com|discord.(com|gg))(/.*)?$',
    name: 'Discord',
    placeholder: 'https://discord.com/',
  },
  {
    id: 'bandcamp',
    profileRegex: '^https?://(?:www.)?bandcamp.com(/.*)?$',
    name: 'bandcamp',
    placeholder: 'https://bandcamp.com/',
  },
  {
    id: 'itunes',
    profileRegex: '^https?://music.apple.com(/.*)?$',
    name: 'Apple Music',
    placeholder: 'https://music.apple.com/',
  },
  {
    id: 'spotify',
    profileRegex: '^https?://open.spotify.com(/.*)?$',
    name: 'Spotify',
    placeholder: 'https://spotify.com/',
  },
  {
    id: 'tidal',
    profileRegex: '^https?://(?:www.)?tidal.com(/.*)?$',
    name: 'Tidal',
    placeholder: 'https://tidal.com/',
  },
  {
    id: 'catalog',
    profileRegex: '^https?://(www\\.)?(beta\\.)?catalog.works(/.*)?$',
    name: 'Catalog',
    placeholder: 'https://catalog.works/',
  },
  {
    id: 'sound',
    profileRegex: '^https?://(www.)?sound.xyz(/.*)?$',
    name: 'Sound',
    placeholder: 'https://sound.xyz/',
  },
  {
    id: 'nina',
    profileRegex: '^https?://(www.)?ninaprotocol.com(/.*)?$',
    name: 'nina',
    placeholder: 'https://ninaprotocol.com/',
  },
  {
    id: 'noizd',
    profileRegex: 'https?://(www.)?noizd.com(/.*)?$',
    name: 'NOIZD',
    placeholder: 'https://noizd.com/',
  },
  {
    id: 'hey',
    profileRegex: '^https?://(www.)?hey.xyz(/.*)?$',
    name: 'Hey',
    placeholder: 'https://hey.xyz/',
  },
  {
    id: 'zora',
    profileRegex: '^https?://(www.)?zora.co(/.*)?$',
    name: 'Zora',
    placeholder: 'https://zora.co/',
  },
]

export function getWebsiteTypeFromUrl(url: string): WebsiteType {
  for (const website of SupportedWebsites) {
    const regex = new RegExp(website.profileRegex)
    if (regex.test(url)) {
      return website.id
    }
  }
  return 'custom'
}

export function getSoundUrlFromHandle(handle: string): string {
  return `https://www.sound.xyz/${handle}`
}

export function deriveTwitterHandleFromUrl(url: string): string | undefined {
  const regex =
    /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/(?:#!\/)?@?([^\/\?]+)/;

  return url.match(regex)?.[1];
}

// ============================================================================
// Mint Types
// ============================================================================

export type Asset = {
  symbol: string;
  decimals: number;
  address: string;
};

export enum MintType {
  KNOWN_TRACK = "known_track",
  RANDOM_UNREVEALED = "random_unrevealed",
  RANDOM_REVEALVED = "random_revealed",
  NFT_PACK = "nft_pack",
  UNKNOWN = "unknown",
}

export type UnsignedTransaction = {
  to: string;
  from?: string;
  value?: string;
  data: string;
  gasLimit?: string;
  chainId: number;
};

export type MintError =
  | "not for sale"
  | "sold out"
  | "sale not started"
  | "sale ended"
  | "user limit reached"
  | "user not in allow list"
  | "mint limit exceeded"
  | "precondition not met"
  | "not supported";

export type Error = {
  reason: MintError;
  metadata?: any;
};

export type MintPreconditionError = Error;

export type NotFollowingError = Error & {
  metadata: {
    requiredFollow: string;
    suggestedUrl: string;
  };
};

export type MintAmountExceededError = Error & {
  metadata: {
    allowance: number;
    minted?: number;
    remaining: number;
  };
};

export type BaseMintDetails = {
  available: boolean | null;
  price?: {
    asset: Asset;
    value: string;
  };
  mintTransaction?: UnsignedTransaction;
  approvalTransaction?: UnsignedTransaction;
  mintType?: MintType;
  saleType?:
    | {
        type: "instant";
      }
    | {
        type: "bid";
        externalUrl: string;
      };
  error?: Error;
  quantity?: number;
  maxQuantity?: number;
  metadata?: {
    sound_tier?: "Forever" | "Limited";
  };
};

export type MintDetails = BaseMintDetails & {
  fallback: boolean; // enable for ethereum mints only - reservoir fallback only supports ethereum
  editions: number | undefined;
  multicallSupport?: boolean; // can the mint transaction be used in a multicall (e.g does the nft get minted to msg.sender or a provided address)
};

export type MulticallMintDetails = BaseMintDetails;

type TrackMintResult = {
  trackId: string;
  result: MintDetails;
};

export type MulticallMintResponse = {
  includedTracks: TrackMintResult[];
  excludedTracks: TrackMintResult[];
  mintDetails: BaseMintDetails;
};

// ============================================================================
// Feed Item Utilities
// ============================================================================

export function getFeedItemId(data: {
  userId: string;
  entityType: string;
  entityId: string;
}): string {
  if (!data.userId || !data.entityType || !data.entityId) {
    throw new Error('Missing feedItem data')
  }

  return `${data.userId}/${data.entityType}/${data.entityId}`
}

