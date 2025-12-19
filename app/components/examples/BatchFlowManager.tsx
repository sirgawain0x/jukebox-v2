'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { useBatchCreateFlows } from '@/app/hooks/useSuperfluidBatch'

/**
 * Example component demonstrating batch flow creation using Host batchCall
 * Based on the Superfluid documentation pattern
 */
export function BatchFlowManager() {
  const { address, isConnected } = useAccount()
  const [tokenAddress, setTokenAddress] = useState('')
  const [receivers, setReceivers] = useState('')
  const [flowRates, setFlowRates] = useState('')
  const [message, setMessage] = useState('')

  const { execute, isLoading, error } = useBatchCreateFlows({
    onSuccess: (txHash) => {
      setMessage(`Batch flows created successfully! TX: ${txHash}`)
    },
    onError: (err) => {
      setMessage(`Error: ${err.message}`)
    },
  })

  const handleExecuteBatchFlows = async () => {
    if (!isConnected) {
      setMessage('Please connect wallet first')
      return
    }

    if (!tokenAddress || !receivers || !flowRates) {
      setMessage('Please fill in all fields')
      return
    }

    try {
      // Parse receivers and flow rates
      const receiverList = receivers.split(',').map((r) => r.trim())
      const flowRateList = flowRates.split(',').map((r) => r.trim())

      if (receiverList.length !== flowRateList.length) {
        setMessage('Number of receivers must match number of flow rates')
        return
      }

      // Validate addresses
      for (const receiver of receiverList) {
        if (!receiver.startsWith('0x') || receiver.length !== 42) {
          setMessage(`Invalid address: ${receiver}`)
          return
        }
      }

      // Build flows array
      const flows = receiverList.map((receiver, index) => ({
        receiver,
        flowRatePerDay: flowRateList[index],
      }))

      // Execute batch call
      await execute(tokenAddress, flows, 6) // USDC has 6 decimals
    } catch (err) {
      // Error handled by hook's onError callback
      console.error('Batch flow execution error:', err)
    }
  }

  return (
    <div className="p-5 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Batch Flow Manager</h2>

      {!isConnected ? (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-yellow-800">Please connect your wallet to continue</p>
        </div>
      ) : (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded">
          <p className="text-green-800">Connected: {address}</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="tokenAddress" className="block text-sm font-medium mb-1">
            Super Token Address
          </label>
          <input
            id="tokenAddress"
            type="text"
            placeholder="0x..."
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="receivers" className="block text-sm font-medium mb-1">
            Receiver Addresses (comma-separated)
          </label>
          <input
            id="receivers"
            type="text"
            placeholder="0x123..., 0x456..., 0x789..."
            value={receivers}
            onChange={(e) => setReceivers(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="flowRates" className="block text-sm font-medium mb-1">
            Flow Rates (comma-separated, tokens per day)
          </label>
          <input
            id="flowRates"
            type="text"
            placeholder="100, 200, 150"
            value={flowRates}
            onChange={(e) => setFlowRates(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-sm text-gray-500">
            Enter flow rates in tokens per day (e.g., &quot;100&quot; means 100 tokens/day)
          </p>
        </div>

        <button
          onClick={handleExecuteBatchFlows}
          disabled={isLoading || !isConnected}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors"
        >
          {isLoading ? 'Creating Batch Flows...' : 'Create Batch Flows'}
        </button>
      </div>

      {message && (
        <div
          className={`mt-4 p-4 rounded-md ${
            message.includes('Error')
              ? 'bg-red-50 border border-red-200 text-red-800'
              : 'bg-gray-50 border border-gray-200 text-gray-800'
          }`}
        >
          <p>{message}</p>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">Error: {error.message}</p>
        </div>
      )}
    </div>
  )
}

