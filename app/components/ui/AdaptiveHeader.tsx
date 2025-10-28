"use client";
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
import { useFarcasterContext } from '@/app/utils/farcaster-context';

interface AdaptiveHeaderProps {
  onAddFrame?: () => void;
  frameAdded?: boolean;
}

export default function AdaptiveHeader({ onAddFrame, frameAdded }: AdaptiveHeaderProps) {
  const { isMiniapp } = useFarcasterContext();

  return (
    <header className="flex justify-between items-center mb-3 h-11">
      <div className="flex items-center space-x-3">
        <Wallet className="z-10">
            <ConnectWallet>
              <Avatar className="h-6 w-6" />
              <Name />
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

      {isMiniapp && (
        <div className="flex items-center space-x-2">
          {!frameAdded && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onAddFrame}
              className="text-(--app-accent) p-4"
              icon={<Icon name="plus" size="sm" />}
            >
              Save Frame
            </Button>
          )}
          {frameAdded && (
            <div className="flex items-center space-x-1 text-sm font-medium text-(--app-accent)">
              <Icon name="check" size="sm" className="text-(--app-accent)" />
              <span>Saved</span>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
