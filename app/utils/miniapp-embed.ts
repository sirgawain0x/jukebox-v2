import { MiniappEmbed, DEFAULT_MINIAPP_EMBED } from "../../types/miniapp";

/**
 * Generates Mini App Embed meta tags for HTML head
 * @param embed - Mini App Embed configuration
 * @returns Array of meta tag objects for Next.js Metadata
 */
export function generateMiniappEmbedMetaTags(
  embed: Partial<MiniappEmbed> = {}
): Array<{ name: string; content: string }> {
  const finalEmbed = { ...DEFAULT_MINIAPP_EMBED, ...embed };
  
  // Get the base URL from environment or use the actual domain
  const baseUrl = (process.env.NEXT_PUBLIC_URL || 'https://jukebox.creativeplatform.xyz').replace(/\/$/, '');
  
  // Helper function to ensure URL is absolute and valid
  const makeAbsoluteUrl = (url: string): string => {
    if (url.startsWith('http')) {
      return url;
    }
    // Remove leading slash if baseUrl already ends with one
    const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const absoluteUrl = `${cleanBaseUrl}/${cleanUrl}`;
    
    // Validate URL format
    try {
      new URL(absoluteUrl);
      return absoluteUrl;
    } catch (error) {
      console.error('Invalid URL generated:', absoluteUrl, error);
      // Fallback to a safe URL
      return `${cleanBaseUrl}/screenshot.png`;
    }
  };
  
  // Ensure all URLs are absolute
  const embedWithAbsoluteUrls = {
    ...finalEmbed,
    imageUrl: makeAbsoluteUrl(finalEmbed.imageUrl),
    homeUrl: baseUrl, // Use base URL directly for homeUrl to avoid trailing slash
    splashImageUrl: finalEmbed.splashImageUrl ? makeAbsoluteUrl(finalEmbed.splashImageUrl) : undefined,
  };

  // Debug logging
  console.log('Mini App Embed generated:', embedWithAbsoluteUrls);

  const embedJson = JSON.stringify(embedWithAbsoluteUrls);

  return [
    {
      name: "fc:miniapp",
      content: embedJson,
    },
    // For backward compatibility
    {
      name: "fc:frame",
      content: embedJson,
    },
  ];
}

/**
 * Creates a custom Mini App Embed configuration
 * @param overrides - Partial embed configuration to override defaults
 * @returns Complete MiniappEmbed configuration
 */
export function createMiniappEmbed(
  overrides: Partial<MiniappEmbed> = {}
): MiniappEmbed {
  return { ...DEFAULT_MINIAPP_EMBED, ...overrides };
}

/**
 * Validates a Mini App Embed configuration
 * @param embed - Embed configuration to validate
 * @returns Validation result with errors if any
 */
export function validateMiniappEmbed(embed: MiniappEmbed): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!embed.version) {
    errors.push("Version is required");
  }

  if (!embed.title) {
    errors.push("Title is required");
  }

  if (!embed.description) {
    errors.push("Description is required");
  }

  if (!embed.imageUrl) {
    errors.push("Image URL is required");
  }

  if (!embed.homeUrl) {
    errors.push("Home URL is required");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
