export interface MiniappUser {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl: string;
}

export interface MiniappEmbed {
  version: string;
  title: string;
  description: string;
  imageUrl: string;
  homeUrl: string;
  splashImageUrl?: string;
  mentions?: MiniappUser[];
  [key: string]: any; // Allow for future extensions
}

export interface MiniappCast {
  text: string;
  mentions: MiniappUser[];
  embeds?: MiniappEmbed[];
  [key: string]: any; // Allow for future extensions
}

// Default Mini App Embed configuration
export const DEFAULT_MINIAPP_EMBED: MiniappEmbed = {
  version: "1.0",
  title: "Jukebox",
  description: "On-chain music. Tip artists directly. AI-powered playlists.",
  imageUrl: `${process.env.NEXT_PUBLIC_URL}/screenshot.png`,
  homeUrl: "https://jukebox.creativeplatform.xyz",
  splashImageUrl: `${process.env.NEXT_PUBLIC_URL}/splash.png`,
};
