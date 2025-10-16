"use client";
import { useAuthenticate } from '@coinbase/onchainkit/minikit';
import { useState } from 'react';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

export default function AuthButton() {
  const { signIn } = useAuthenticate();
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleAuth = async () => {
    setIsAuthenticating(true);
    try {
      const result = await signIn();
      if (result) {
        console.log('Authentication result:', result);
        // You can save this to your backend here
        // await saveUserSession(result);
      } else {
        console.log('Authentication completed but no result received');
      }
    } catch (error) {
      console.error('Authentication failed:', error);
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <Button 
      variant="outline"
      size="sm"
      onClick={handleAuth}
      disabled={isAuthenticating}
      className="text-xs"
    >
      {isAuthenticating ? (
        <>
          <div className="animate-spin w-3 h-3 border border-current rounded-full border-t-transparent mr-2" />
          Authenticating...
        </>
      ) : (
        <>
          <Icon name="check" size="sm" className="mr-1" />
          Sign In
        </>
      )}
    </Button>
  );
}
