import { minikitConfig } from "../../../minikit.config";

function withValidProperties(properties: Record<string, undefined | string | string[]>) {
  return Object.fromEntries(
    Object.entries(properties).filter(([_, value]) => {
      if (value === undefined || value === null) {
        return false;
      }
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      // Filter out empty strings - they should be omitted from the manifest
      return value !== '';
    })
  );
}

export async function GET() {
  const URL = process.env.NEXT_PUBLIC_URL || 'https://jukebox.creativeplatform.xyz';
  
  // Use account association from minikit.config, with environment variable overrides
  // Handle empty strings properly - if env var is empty string, fall back to config
  const getAccountAssociationValue = (envVar: string | undefined, configValue: string): string => {
    return (envVar && envVar.trim() !== '') ? envVar : configValue;
  };
  
  const accountAssociation = {
    header: getAccountAssociationValue(process.env.FARCASTER_ACCOUNT_ASSOCIATION_HEADER, minikitConfig.accountAssociation.header),
    payload: getAccountAssociationValue(process.env.FARCASTER_ACCOUNT_ASSOCIATION_PAYLOAD, minikitConfig.accountAssociation.payload),
    signature: getAccountAssociationValue(process.env.FARCASTER_ACCOUNT_ASSOCIATION_SIGNATURE, minikitConfig.accountAssociation.signature),
  };
  
  const manifest = {
    accountAssociation,
    
    miniapp: {
      ...withValidProperties({
        version: minikitConfig.miniapp.version,
        name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || minikitConfig.miniapp.name,
        homeUrl: URL,
        iconUrl: `${URL}/icon.png`,
        splashImageUrl: `${URL}/splash.png`,
        splashBackgroundColor: minikitConfig.miniapp.splashBackgroundColor,
        webhookUrl: `${URL}/api/webhook`,
        subtitle: minikitConfig.miniapp.subtitle,
        description: minikitConfig.miniapp.description,
        screenshotUrls: [...minikitConfig.miniapp.screenshotUrls],
        primaryCategory: minikitConfig.miniapp.primaryCategory,
        tags: [...minikitConfig.miniapp.tags],
        heroImageUrl: `${URL}/hero.png`,
        tagline: minikitConfig.miniapp.tagline,
        ogTitle: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || minikitConfig.miniapp.ogTitle,
        ogDescription: minikitConfig.miniapp.ogDescription,
        ogImageUrl: `${URL}/hero.png`,
        requiredCapabilities: [...minikitConfig.miniapp.requiredCapabilities],
      }),
      noindex: minikitConfig.miniapp.noindex,
    },
  };

  return Response.json(manifest);
}
