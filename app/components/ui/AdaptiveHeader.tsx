"use client";
import { useIsInMiniApp } from '@coinbase/onchainkit/minikit';
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
import {
  Name,
  Identity,
  Address,
  Avatar,
  EthBalance,
} from "@coinbase/onchainkit/identity";
import { Button } from './Button';
import { Icon } from './Icon';

interface AdaptiveHeaderProps {
  onAddFrame?: () => void;
  frameAdded?: boolean;
}

export default function AdaptiveHeader({ onAddFrame, frameAdded }: AdaptiveHeaderProps) {
  const isInMiniApp = useIsInMiniApp();

  // More accurate Mini App detection - check for actual Farcaster environment
  const isActuallyInMiniApp = isInMiniApp && 
    (typeof window !== 'undefined' && 
     (window.location.href.includes('farcaster.xyz') ||
      window.location.href.includes('warpcast.com') ||
      window.navigator.userAgent.includes('Farcaster') ||
      window.navigator.userAgent.includes('Warpcast') ||
      // Check for MiniKit specific environment variables or properties
      !!(window as unknown as { farcaster?: unknown }).farcaster ||
      !!(window as unknown as { minikit?: unknown }).minikit));

  return (
    <header className="flex justify-between items-center mb-3 h-11">
      <div className="flex items-center space-x-3">
        {isActuallyInMiniApp ? (
          // Mini App version - auto-connected wallet + auth
          <div className="flex items-center space-x-3">
            <Wallet className="z-10">
              <ConnectWallet>
                <Name className="text-inherit" />
              </ConnectWallet>
              <WalletDropdown>
                <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                  <Avatar />
                  <Name />
                  <Address />
                  <EthBalance />
                </Identity>
                <WalletDropdownDisconnect />
              </WalletDropdown>
            </Wallet>
          </div>
        ) : (
          // Web version - standard wallet connection
          <Wallet className="z-10">
            <ConnectWallet>
              <Name className="text-inherit" />
            </ConnectWallet>
            <WalletDropdown>
              <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                <Avatar />
                <Name />
                <Address />
                <EthBalance />
              </Identity>
              <WalletDropdownDisconnect />
            </WalletDropdown>
          </Wallet>
        )}
      </div>

      <div className="flex items-center space-x-2">
        {isActuallyInMiniApp ? (
          // Mini App version - show frame save button
          <>
            {!frameAdded && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onAddFrame}
                className="text-[var(--app-accent)] p-4"
                icon={<Icon name="plus" size="sm" />}
              >
                Save Frame
              </Button>
            )}
            {frameAdded && (
              <div className="flex items-center space-x-1 text-sm font-medium text-[#0052FF]">
                <Icon name="check" size="sm" className="text-[#0052FF]" />
                <span>Saved</span>
              </div>
            )}
          </>
        ) : (
          // Web version - no auth button needed
          null
        )}
      </div>
    </header>
  );
}
