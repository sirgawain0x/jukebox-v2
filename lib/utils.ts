import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { TransactionError } from "@/types/transactions";

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

/**
 * Extracts a user-friendly error message from transaction error data
 * @param errorData - The error data from a transaction
 * @param fallbackMessage - Default message if no specific error is found
 * @returns A user-friendly error message
 */
export const extractTransactionErrorMessage = (
  errorData: TransactionError | null | undefined,
  fallbackMessage: string = "Transaction failed. Please try again."
): string => {
  if (!errorData) {
    return fallbackMessage;
  }

  // Handle error object with name property
  if (errorData.error && typeof errorData.error === 'object') {
    const errorObj = errorData.error as Record<string, unknown>;
    if (errorObj.name === 'InvalidAddressError') {
      return "Invalid contract address. Please contact support.";
    } else if (errorObj.name === 'UserRejectedRequestError') {
      return "Transaction was cancelled by user.";
    } else if (errorObj.name === 'InsufficientFundsError') {
      return "Insufficient funds for transaction.";
    } else if (errorObj.name === 'TransactionRejectedError') {
      return "Transaction was rejected. Please try again.";
    } else if (errorObj.name === 'NetworkError') {
      return "Network error. Please check your connection and try again.";
    } else if (typeof errorObj.message === 'string') {
      return errorObj.message;
    }
  }

  // Handle string error
  if (typeof errorData.error === 'string') {
    return errorData.error;
  }

  // Handle message property
  if (errorData.message && typeof errorData.message === 'string') {
    return errorData.message;
  }

  // Handle error codes
  if (errorData.code && typeof errorData.code === 'string') {
    if (errorData.code === 'USER_REJECTED') {
      return "Transaction was cancelled by user.";
    } else if (errorData.code === 'INSUFFICIENT_FUNDS') {
      return "Insufficient funds for transaction.";
    } else if (errorData.code === 'NETWORK_ERROR') {
      return "Network error. Please check your connection and try again.";
    } else {
      return `Transaction failed with error code: ${errorData.code}`;
    }
  }

  // Check if error data is empty
  if (Object.keys(errorData).length === 0) {
    return "Transaction failed due to an unknown error. Please try again or contact support if the issue persists.";
  }

  return fallbackMessage;
};

