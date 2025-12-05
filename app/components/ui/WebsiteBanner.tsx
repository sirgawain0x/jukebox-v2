"use client";

import { useFarcasterContext } from "@/app/utils/farcaster-context";
import { Icon } from "./Icon";

export function WebsiteBanner() {
  const { isMiniapp } = useFarcasterContext();

  // Only show banner when NOT in mini-app mode
  if (isMiniapp) {
    return null;
  }

  // URLs to open the mini-app in Farcaster and Base app
  // For Farcaster: Link to the Farcaster mini-app directory page
  const farcasterUrl = "https://farcaster.xyz/miniapps/qmW3Ymy2yYM6/jukebox";
  // For Base app: Link to the Base app URL
  const baseAppUrl = "https://www.base.app/";

  // Shared button base classes matching Button component styles
  const buttonBaseClasses =
    "inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0052FF]";

  return (
    <div className="mb-4 p-4 bg-linear-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            🎵 Experience Jukebox Mini-App Features
          </h3>
          <p className="text-xs text-gray-600 mb-3">
            Get the full experience with share links, social features, and more by opening Jukebox in Farcaster or Base app.
          </p>
          <div className="flex flex-wrap gap-2 items-center">
            <a
              href={farcasterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${buttonBaseClasses} bg-blue-600 hover:bg-blue-700 text-white text-xs px-2.5 py-1.5 rounded-md`}
            >
              <span className="flex items-center mr-2">
                <Icon name="arrow-right" size="sm" />
              </span>
              Open in Farcaster
            </a>
            <a
              href={baseAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${buttonBaseClasses} border border-blue-600 text-blue-600 bg-white hover:bg-blue-50 text-xs px-2.5 py-1.5 rounded-md`}
            >
              <span className="flex items-center mr-2">
                <Icon name="arrow-right" size="sm" />
              </span>
              Open in Base App
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

