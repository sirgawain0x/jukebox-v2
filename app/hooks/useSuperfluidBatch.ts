'use client'

import { useState } from 'react'
import { useAccount, useChainId, useWalletClient } from 'wagmi'
import { BrowserProvider } from 'ethers'
import {
  executeBatchCall,
  batchUpgradeAndFlow,
  batchCreateFlows,
  batchUpdateFlows,
  batchDeleteFlows,
  batchPoolUpdateAndFlow,
  type BatchOperation,
  type PoolBatchParams,
  estimateBatchCallGas,
} from '@/lib/superfluid-batch-call'

interface UseBatchCallOptions {
  onSuccess?: (txHash: string) => void
  onError?: (error: Error) => void
}

/**
 * Hook for executing custom batch operations
 */
export function useBatchCall(options?: UseBatchCallOptions) {
  const { address } = useAccount()
  const chainId = useChainId()
  const { data: walletClient } = useWalletClient()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const execute = async (operations: BatchOperation[]) => {
    if (!walletClient || !address) {
      throw new Error('Wallet not connected')
    }

    setIsLoading(true)
    setError(null)

    try {
      const provider = new BrowserProvider(walletClient as any)
      const signer = await provider.getSigner()

      const tx = await executeBatchCall(signer, operations, chainId)
      const receipt = await tx.wait()

      options?.onSuccess?.(receipt?.hash || '')
      return receipt
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Batch call failed')
      setError(error)
      options?.onError?.(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return {
    execute,
    isLoading,
    error,
  }
}

/**
 * Hook for upgrading tokens and creating a flow in one transaction
 */
export function useUpgradeAndFlow(options?: UseBatchCallOptions) {
  const { address } = useAccount()
  const chainId = useChainId()
  const { data: walletClient } = useWalletClient()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const execute = async (
    superTokenAddress: string,
    receiverAddress: string,
    amount: string,
    flowRatePerDay: string,
    decimals: number = 6
  ) => {
    if (!walletClient || !address) {
      throw new Error('Wallet not connected')
    }

    setIsLoading(true)
    setError(null)

    try {
      const provider = new BrowserProvider(walletClient as any)
      const signer = await provider.getSigner()

      const tx = await batchUpgradeAndFlow(
        signer,
        superTokenAddress,
        receiverAddress,
        amount,
        flowRatePerDay,
        chainId,
        decimals
      )
      const receipt = await tx.wait()

      options?.onSuccess?.(receipt?.hash || '')
      return receipt
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Upgrade and flow failed')
      setError(error)
      options?.onError?.(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return {
    execute,
    isLoading,
    error,
  }
}

/**
 * Hook for creating multiple flows in one transaction
 */
export function useBatchCreateFlows(options?: UseBatchCallOptions) {
  const { address } = useAccount()
  const chainId = useChainId()
  const { data: walletClient } = useWalletClient()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const execute = async (
    superTokenAddress: string,
    flows: Array<{ receiver: string; flowRatePerDay: string }>,
    decimals: number = 6
  ) => {
    if (!walletClient || !address) {
      throw new Error('Wallet not connected')
    }

    setIsLoading(true)
    setError(null)

    try {
      const provider = new BrowserProvider(walletClient as any)
      const signer = await provider.getSigner()

      const tx = await batchCreateFlows(signer, superTokenAddress, flows, chainId, decimals)
      const receipt = await tx.wait()

      options?.onSuccess?.(receipt?.hash || '')
      return receipt
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Batch create flows failed')
      setError(error)
      options?.onError?.(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return {
    execute,
    isLoading,
    error,
  }
}

/**
 * Hook for updating multiple flows in one transaction
 */
export function useBatchUpdateFlows(options?: UseBatchCallOptions) {
  const { address } = useAccount()
  const chainId = useChainId()
  const { data: walletClient } = useWalletClient()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const execute = async (
    superTokenAddress: string,
    flows: Array<{ receiver: string; flowRatePerDay: string }>,
    decimals: number = 6
  ) => {
    if (!walletClient || !address) {
      throw new Error('Wallet not connected')
    }

    setIsLoading(true)
    setError(null)

    try {
      const provider = new BrowserProvider(walletClient as any)
      const signer = await provider.getSigner()

      const tx = await batchUpdateFlows(signer, superTokenAddress, flows, chainId, decimals)
      const receipt = await tx.wait()

      options?.onSuccess?.(receipt?.hash || '')
      return receipt
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Batch update flows failed')
      setError(error)
      options?.onError?.(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return {
    execute,
    isLoading,
    error,
  }
}

/**
 * Hook for deleting multiple flows in one transaction
 */
export function useBatchDeleteFlows(options?: UseBatchCallOptions) {
  const { address } = useAccount()
  const chainId = useChainId()
  const { data: walletClient } = useWalletClient()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const execute = async (superTokenAddress: string, receivers: string[]) => {
    if (!walletClient || !address) {
      throw new Error('Wallet not connected')
    }

    setIsLoading(true)
    setError(null)

    try {
      const provider = new BrowserProvider(walletClient as any)
      const signer = await provider.getSigner()

      const tx = await batchDeleteFlows(signer, superTokenAddress, receivers, chainId)
      const receipt = await tx.wait()

      options?.onSuccess?.(receipt?.hash || '')
      return receipt
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Batch delete flows failed')
      setError(error)
      options?.onError?.(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return {
    execute,
    isLoading,
    error,
  }
}

/**
 * Hook for pool batch operations (update units + distribute flow)
 */
export function useBatchPoolUpdate(options?: UseBatchCallOptions) {
  const { address } = useAccount()
  const chainId = useChainId()
  const { data: walletClient } = useWalletClient()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const execute = async (params: PoolBatchParams) => {
    if (!walletClient || !address) {
      throw new Error('Wallet not connected')
    }

    setIsLoading(true)
    setError(null)

    try {
      const provider = new BrowserProvider(walletClient as any)
      const signer = await provider.getSigner()

      const tx = await batchPoolUpdateAndFlow(signer, params, chainId)
      const receipt = await tx.wait()

      options?.onSuccess?.(receipt?.hash || '')
      return receipt
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Pool batch update failed')
      setError(error)
      options?.onError?.(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return {
    execute,
    isLoading,
    error,
  }
}

/**
 * Hook for estimating gas for batch operations
 */
export function useEstimateBatchGas() {
  const { address } = useAccount()
  const chainId = useChainId()
  const { data: walletClient } = useWalletClient()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const estimate = async (operations: BatchOperation[]) => {
    if (!walletClient || !address) {
      throw new Error('Wallet not connected')
    }

    setIsLoading(true)
    setError(null)

    try {
      const provider = new BrowserProvider(walletClient as any)
      const gasEstimate = await estimateBatchCallGas(provider, operations, chainId, address)
      return gasEstimate
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Gas estimation failed')
      setError(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return {
    estimate,
    isLoading,
    error,
  }
}

