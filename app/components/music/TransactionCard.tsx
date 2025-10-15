"use client";
import { Card } from "../ui/Card";
import { useCallback } from "react";
import {
  Transaction,
  TransactionButton,
  TransactionSponsor,
  TransactionStatus,
  TransactionStatusAction,
  TransactionStatusLabel,
  TransactionToast,
  TransactionToastIcon,
  TransactionToastLabel,
  TransactionToastAction,
  type LifecycleStatus,
  type TransactionError,
} from "@coinbase/onchainkit/transaction";
import type { ContractFunctionParameters } from "viem";

type TransactionCardProps = {
  title: string;
  description?: string;
  buttonText: string;
  isSponsored?: boolean;
  chainId: number;
  calls: () => Promise<ContractFunctionParameters[]>;
  onStatus?: (status: LifecycleStatus) => void;
  onSuccess?: () => void;
  onError?: (error: TransactionError) => void;
};

export function TransactionCard({
  title,
  description,
  buttonText,
  isSponsored = true,
  chainId,
  calls,
  onStatus,
  onSuccess,
  onError,
}: TransactionCardProps) {
  const handleOnStatus = useCallback(
    (status: LifecycleStatus) => {
      console.log("Transaction status:", status);
      onStatus?.(status);
    },
    [onStatus]
  );

  return (
    <Card title={title}>
      {description && (
        <div className="mb-4 text-[var(--app-foreground-muted)]">
          {description}
        </div>
      )}

      <Transaction
        isSponsored={isSponsored}
        chainId={chainId}
        calls={calls}
        onStatus={handleOnStatus}
        onSuccess={onSuccess}
        onError={onError}
      >
        <TransactionButton text={buttonText} />
        {isSponsored && <TransactionSponsor />}
        <TransactionStatus>
          <TransactionStatusLabel />
          <TransactionStatusAction />
        </TransactionStatus>
        <TransactionToast position="bottom-right">
          <TransactionToastIcon />
          <TransactionToastLabel />
          <TransactionToastAction />
        </TransactionToast>
      </Transaction>
    </Card>
  );
}
