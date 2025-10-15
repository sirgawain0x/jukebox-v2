"use client";

import { useEffect } from "react";
import { MiniappEmbed } from "../../../types/miniapp";
import { generateMiniappEmbedMetaTags, validateMiniappEmbed } from "../../utils/miniapp-embed";

interface MiniAppEmbedProps {
  embed: Partial<MiniappEmbed>;
  onValidationError?: (errors: string[]) => void;
}

/**
 * Component to dynamically update Mini App Embed meta tags
 * This component can be used on specific pages to override the default embed
 */
export function MiniAppEmbed({ embed, onValidationError }: MiniAppEmbedProps) {
  useEffect(() => {
    // Validate the embed configuration
    const validation = validateMiniappEmbed(embed as MiniappEmbed);
    
    if (!validation.isValid) {
      console.warn("Mini App Embed validation errors:", validation.errors);
      onValidationError?.(validation.errors);
      return;
    }

    // Generate meta tags
    const metaTags = generateMiniappEmbedMetaTags(embed);
    
    // Update or create meta tags in the document head
    metaTags.forEach(({ name, content }) => {
      let metaElement = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
      
      if (!metaElement) {
        metaElement = document.createElement("meta");
        metaElement.name = name;
        document.head.appendChild(metaElement);
      }
      
      metaElement.content = content;
    });

    // Cleanup function to remove meta tags when component unmounts
    return () => {
      metaTags.forEach(({ name }) => {
        const metaElement = document.querySelector(`meta[name="${name}"]`);
        if (metaElement) {
          metaElement.remove();
        }
      });
    };
  }, [embed, onValidationError]);

  // This component doesn't render anything visible
  return null;
}

/**
 * Hook to programmatically update Mini App Embed meta tags
 */
export function useMiniAppEmbed(embed: Partial<MiniappEmbed>) {
  useEffect(() => {
    const metaTags = generateMiniappEmbedMetaTags(embed);
    
    metaTags.forEach(({ name, content }) => {
      let metaElement = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
      
      if (!metaElement) {
        metaElement = document.createElement("meta");
        metaElement.name = name;
        document.head.appendChild(metaElement);
      }
      
      metaElement.content = content;
    });
  }, [embed]);
}
