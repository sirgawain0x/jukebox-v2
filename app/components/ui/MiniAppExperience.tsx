"use client";
import { useIsInMiniApp, useOpenUrl } from '@coinbase/onchainkit/minikit';
import { Button } from './Button';
import { Icon } from './Icon';

interface MiniAppExperienceProps {
  onAddFrame?: () => void;
  frameAdded?: boolean;
}

export default function MiniAppExperience({ frameAdded }: MiniAppExperienceProps) {
  const openUrl = useOpenUrl();
  const isInMiniApp = useIsInMiniApp();

  // More accurate Mini App detection - check for actual Farcaster environment
  const isActuallyInMiniApp = isInMiniApp && 
    (typeof window !== 'undefined' && 
     (window.location.href.includes('farcaster.xyz') ||
      window.location.href.includes('warpcast.com') ||
      window.navigator.userAgent.includes('Farcaster') ||
      window.navigator.userAgent.includes('Warpcast') ||
      // Check for MiniKit specific environment variables or properties
      (window as any).farcaster ||
      (window as any).minikit));

  if (isActuallyInMiniApp) {
    // Mini App version - enhanced features
    return (
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Icon name="star" size="sm" className="text-purple-600" />
            <h3 className="font-semibold text-purple-800">🎉 Mini App Active</h3>
          </div>
          {frameAdded && (
            <div className="flex items-center space-x-1 text-sm font-medium text-purple-600">
              <Icon name="check" size="sm" />
              <span>Saved</span>
            </div>
          )}
        </div>
        <div className="mt-3 space-y-2">
          <p className="text-purple-700 text-sm font-medium">
            ✨ You&apos;re experiencing Jukebox with exclusive Mini App features!
          </p>
          <div className="grid grid-cols-1 gap-2 text-xs text-purple-600">
            <div className="flex items-center space-x-2">
              <Icon name="check" size="xs" />
              <span>Auto wallet connection</span>
            </div>
            <div className="flex items-center space-x-2">
              <Icon name="check" size="xs" />
              <span>Share tracks directly to Farcaster</span>
            </div>
            <div className="flex items-center space-x-2">
              <Icon name="check" size="xs" />
              <span>Enhanced playlist features</span>
            </div>
            <div className="flex items-center space-x-2">
              <Icon name="check" size="xs" />
              <span>Farcaster authentication</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Web version - encourage users to try the Mini App
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-center space-x-2 mb-2">
        <Icon name="star" size="sm" className="text-blue-600" />
        <h3 className="font-semibold text-blue-800">Mini App Experience Available</h3>
      </div>
      <p className="text-blue-700 text-sm mb-3">
        Get the full Jukebox experience with automatic wallet connection and exclusive features in Farcaster!
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={() => openUrl('https://warpcast.com')}
        className="text-blue-600 border-blue-300 hover:bg-blue-100"
      >
        <Icon name="arrow-right" size="sm" className="mr-1" />
        Get Farcaster
      </Button>
    </div>
  );
}
