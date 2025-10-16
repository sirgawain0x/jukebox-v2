"use client";
import { useIsInMiniApp } from '@coinbase/onchainkit/minikit';
import { useMemo } from 'react';

export default function MiniAppDebug() {
  const isInMiniApp = useIsInMiniApp();

  // Memoize the debug info to prevent unnecessary re-renders
  const debugInfo = useMemo(() => {
    if (typeof window === 'undefined') return null;
    
    return {
      isInMiniApp,
      userAgent: window.navigator.userAgent,
      href: window.location.href,
      hasFarcaster: !!(window as unknown as { farcaster?: unknown }).farcaster,
      hasMinikit: !!(window as unknown as { minikit?: unknown }).minikit,
    };
  }, [isInMiniApp]);

  // Only show in development or when explicitly enabled
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div className="bg-gray-100 border border-gray-300 rounded-lg p-3 mb-4 text-xs">
      <h4 className="font-semibold text-gray-800 mb-2">Mini App Debug Info</h4>
      {debugInfo ? (
        <div className="space-y-1 text-gray-600">
          <div><strong>isInMiniApp:</strong> {debugInfo.isInMiniApp.toString()}</div>
          <div><strong>URL:</strong> {debugInfo.href}</div>
          <div><strong>User Agent:</strong> {debugInfo.userAgent}</div>
          <div><strong>Has Farcaster:</strong> {debugInfo.hasFarcaster.toString()}</div>
          <div><strong>Has MiniKit:</strong> {debugInfo.hasMinikit.toString()}</div>
          <div><strong>Contains farcaster.xyz:</strong> {debugInfo.href.includes('farcaster.xyz').toString()}</div>
          <div><strong>Contains warpcast.com:</strong> {debugInfo.href.includes('warpcast.com').toString()}</div>
          <div><strong>UA contains Farcaster:</strong> {debugInfo.userAgent.includes('Farcaster').toString()}</div>
          <div><strong>UA contains Warpcast:</strong> {debugInfo.userAgent.includes('Warpcast').toString()}</div>
        </div>
      ) : (
        <div>Loading debug info...</div>
      )}
    </div>
  );
}
