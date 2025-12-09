function withValidProperties(properties: Record<string, undefined | string | string[]>) {
  return Object.fromEntries(
    Object.entries(properties).filter(([_, value]) => (Array.isArray(value) ? value.length > 0 : !!value))
  );
}

export async function GET() {
  const URL = process.env.NEXT_PUBLIC_URL || 'https://jukebox.creativeplatform.xyz';
  
  const manifest = {
    accountAssociation: {
      // TODO: Generate these using Base Build Account association tool
      // https://build.base.org/tools/account-association
      header: process.env.FARCASTER_ACCOUNT_ASSOCIATION_HEADER || "",
      payload: process.env.FARCASTER_ACCOUNT_ASSOCIATION_PAYLOAD || "",
      signature: process.env.FARCASTER_ACCOUNT_ASSOCIATION_SIGNATURE || "",
    },
    baseBuilder: {
      ownerAddress: process.env.BASE_BUILDER_OWNER_ADDRESS || "0x",
    },
    miniapp: {
      ...withValidProperties({
        version: "1",
        name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || "Jukebox",
        homeUrl: URL,
        iconUrl: `${URL}/icon.png`,
        splashImageUrl: `${URL}/splash.png`,
        splashBackgroundColor: "#000000",
        webhookUrl: `${URL}/api/webhook`,
        subtitle: "On-chain music platform",
        description: "On-chain music. Tip artists directly. AI-powered playlists.",
        screenshotUrls: [
          `${URL}/screenshot.png`,
          `${URL}/screenshot-2.png`,
          `${URL}/Screenshot-3.png`,
        ],
        primaryCategory: "music",
        tags: ["music", "onchain", "miniapp", "baseapp", "jukebox"],
        heroImageUrl: `${URL}/hero.png`,
        tagline: "Play instantly",
        ogTitle: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || "Jukebox",
        ogDescription: "On-chain music. Tip artists directly. AI-powered playlists.",
        ogImageUrl: `${URL}/hero.png`,
      }),
      noindex: false,
    },
  };

  return Response.json(manifest);
}
