const ROOT_URL =
  process.env.NEXT_PUBLIC_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000');

/**
 * MiniApp configuration object. Must follow the Farcaster MiniApp specification.
 *
 * @see {@link https://miniapps.farcaster.xyz/docs/guides/publishing}
 */
export const minikitConfig = {
  accountAssociation: {
    "header": "eyJmaWQiOjc5MzUsInR5cGUiOiJhdXRoIiwia2V5IjoiMHgyRTc5REFFRDdjMjVFQmFGM0FEYzhBMDk3ODc3RjQ4Yzc5ZGM0MmY0In0",
    "payload": "eyJkb21haW4iOiJqdWtlYm94LXYyLnZlcmNlbC5hcHAifQ",
    "signature": "+wK3bLN3hTBubxxbbuPLv7XZvEmGwM1l7Pk3+jV+3oRf6c7tbaQmYdKMTwFHBx4dDPE3I9/ohWsbvUqU0F5rVRw="
  },
  miniapp: {
    version: "1",
    name: "Jukebox", 
    subtitle: "Not your parents jukebox.", 
    description: "On-chain music. Tip artists directly. AI-powered playlists.",
    screenshotUrls: [`${ROOT_URL}/screenshot.png`, `${ROOT_URL}/screenshot-2.png`, `${ROOT_URL}/screenshot-3.png`],
    iconUrl: `${ROOT_URL}/icon.png`,
    splashImageUrl: `${ROOT_URL}/splash.png`,
    splashBackgroundColor: "#000000",
    homeUrl: ROOT_URL,
    webhookUrl: `${ROOT_URL}/api/webhook`,
    primaryCategory: "music",
    tags: ["music", "ai", "onchain", "tip", "playlist"],
    heroImageUrl: `${ROOT_URL}/hero.png`, 
    tagline: "Not your parents jukebox.",
    ogTitle: "Jukebox",
    ogDescription: "On-chain music. Tip artists directly. AI-powered playlists.",
    ogImageUrl: `${ROOT_URL}/hero.png`,
    noindex: true,
  },
  baseBuilder: {
    ownerAddress: "0xc3118549B9bCd7Ed6672Ea2A5a3B26FfbE735F67"
  }
} as const;

