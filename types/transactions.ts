import { Address, Hex, TransactionReceipt } from "viem";
import { ReactNode } from "react";
import { ContractFunctionParameters } from "viem";

export type Call = { to: Hex; data?: Hex; value?: bigint };
export type Calls = Call[] | Promise<Call[]> | (() => Promise<Call[]>);
export type Contracts =
  | ContractFunctionParameters[]
  | Promise<ContractFunctionParameters[]>
  | (() => Promise<ContractFunctionParameters[]>);

export type TransactionError = {
  code: string;
  error: string;
  message: string;
};

export type LifecycleStatus =
  | {
      statusName: "init";
      statusData: null;
    }
  | {
      statusName: "error";
      statusData: TransactionError;
    }
  | {
      statusName: "transactionIdle";
      statusData: null;
    }
  | {
      statusName: "buildingTransaction";
      statusData: null;
    }
  | {
      statusName: "transactionPending";
      statusData: null;
    }
  | {
      statusName: "transactionLegacyExecuted";
      statusData: {
        transactionHashList: Address[];
      };
    }
  | {
      statusName: "success";
      statusData: {
        transactionReceipts: TransactionReceipt[];
      };
    };

export type TransactionResponse = {
  transactionReceipts: TransactionReceipt[];
};

export type TransactionReact = {
  calls?: Calls | Contracts | (Call | ContractFunctionParameters)[];
  isSponsored?: boolean;
  chainId?: number;
  className?: string;
  onError?: (e: TransactionError) => void;
  onStatus?: (lifecycleStatus: LifecycleStatus) => void;
  onSuccess?: (response: TransactionResponse) => void;
} & (
  | {
      children: ReactNode;
      disabled?: never;
    }
  | {
      children?: never;
      disabled?: boolean;
    }
);

export type TransactionButtonReact = {
  className?: string;
  disabled?: boolean;
  text?: string;
};

export type TransactionSponsorReact = {
  className?: string;
};

export type TransactionStatusReact = {
  children?: ReactNode;
  className?: string;
};

export type TransactionStatusActionReact = {
  className?: string;
};

export type TransactionStatusLabelReact = {
  className?: string;
};

export type TransactionToastReact = {
  children?: ReactNode;
  className?: string;
  durationMs?: number;
  position?: "top-center" | "top-right" | "bottom-center" | "bottom-right";
};

export type TransactionToastActionReact = {
  className?: string;
};

export type TransactionToastIconReact = {
  className?: string;
};

export type TransactionToastLabelReact = {
  className?: string;
};
