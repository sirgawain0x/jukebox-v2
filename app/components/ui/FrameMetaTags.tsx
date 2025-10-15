'use client';

import { useEffect } from 'react';

interface FrameMetaTagsProps {
  imageUrl: string;
  postUrl: string;
  buttonText?: string;
  state?: string;
}

export function FrameMetaTags({ 
  imageUrl, 
  postUrl, 
  buttonText = "Open Jukebox",
  state = "jukebox"
}: FrameMetaTagsProps) {
  useEffect(() => {
    // Ensure we're in the browser environment
    if (typeof window === 'undefined' || !document.head) {
      return;
    }

    // Add Frame meta tags to the document head
    const addMetaTag = (name: string, content: string) => {
      try {
        let metaElement = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
        if (!metaElement) {
          metaElement = document.createElement('meta');
          metaElement.name = name;
          if (document.head) {
            document.head.appendChild(metaElement);
          }
        }
        metaElement.content = content;
      } catch (error) {
        console.error(`Error adding meta tag ${name}:`, error);
      }
    };

    // Add Frame-specific meta tags
    addMetaTag('fc:frame', 'vNext');
    addMetaTag('fc:frame:image', imageUrl);
    addMetaTag('fc:frame:button:1', buttonText);
    addMetaTag('fc:frame:post_url', postUrl);
    addMetaTag('fc:frame:state', state);
    addMetaTag('fc:frame:input:text', 'false');

    // Cleanup function to remove meta tags when component unmounts
    return () => {
      if (typeof window === 'undefined' || !document.head) {
        return;
      }

      const frameMetaTags = [
        'fc:frame',
        'fc:frame:image',
        'fc:frame:button:1',
        'fc:frame:post_url',
        'fc:frame:state',
        'fc:frame:input:text'
      ];
      
      frameMetaTags.forEach(name => {
        try {
          const metaElement = document.querySelector(`meta[name="${name}"]`);
          if (metaElement && metaElement.parentNode) {
            metaElement.parentNode.removeChild(metaElement);
          }
        } catch (error) {
          console.error(`Error removing meta tag ${name}:`, error);
        }
      });
    };
  }, [imageUrl, postUrl, buttonText, state]);

  // This component doesn't render anything visible
  return null;
}
