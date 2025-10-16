"use client";
import { useState } from 'react';
import { useAuthenticate, useIsInMiniApp } from '@coinbase/onchainkit/minikit';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

interface ProtectedFeatureProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function ProtectedFeature({ children, fallback }: ProtectedFeatureProps) {
  const { signIn } = useAuthenticate();
  const isInMiniApp = useIsInMiniApp();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleAuth = async () => {
    try {
      const result = await signIn();
      if (result) {
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Authentication failed:', error);
    }
  };

  // Only show authentication in Mini App mode
  if (!isInMiniApp) {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return fallback || (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
        <Icon name="star" size="md" className="mx-auto mb-2 text-yellow-600" />
        <h3 className="font-semibold text-yellow-800 mb-2">Authentication Required</h3>
        <p className="text-yellow-700 text-sm mb-3">
          Sign in with Farcaster to access this feature
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAuth}
          className="text-yellow-600 border-yellow-300 hover:bg-yellow-100"
        >
          <Icon name="check" size="sm" className="mr-1" />
          Sign In with Farcaster
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
