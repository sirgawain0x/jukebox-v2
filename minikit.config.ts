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
    "header": "eyJmaWQiOjc5MzUsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHg3RGYyQzk0MTJiRDY3NDk3ZmVhRWY3M0M2Zjc4YUY2NzFGYWM4Njc0In0",
    "payload": "eyJkb21haW4iOiJqdWtlYm94LmNyZWF0aXZlcGxhdGZvcm0ueHl6In0",
    "signature": "MHhjYmUxYjNkYjY3MDVlM2QyZjY0MzVhNTc2N2JhMjM2ZTJlMDg4YjJmNjgxYjk1ZGU2ZjFhN2Q0MDI5MWUwODU3MDFjNGI5OTY2NDYzYzM0NmM5OTgzOGZkNzQ0NjA3ZjY4ZWQzYmM4YmRmODRkZWVmYjM5YjY0MzliNmQ0MWRlNzFj"
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
    allowedAddresses: ["0xc3118549B9bCd7Ed6672Ea2A5a3B26FfbE735F67"]
  }
} as const;

