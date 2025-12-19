// Superfluid Host batchCall service
// Direct batching without custom macro contracts

import { ethers } from 'ethers';
import { convertFlowRateToWeiPerSecond, toInt96 } from './superfluid-flow-rate';

// Superfluid Host contract address (Base Sepolia)
export const SUPERFLUID_HOST_BASE_SEPOLIA = '0x109412E3C84f0539b43d39dB691B08c90f58dC7c';
// Superfluid Host contract address (Base Mainnet)
export const SUPERFLUID_HOST_BASE_MAINNET = '0x109412E3C84f0539b43d39dB691B08c90f58dC7c'; // Update with actual mainnet address

// CFA Forwarder addresses
export const CFA_FORWARDER_BASE_SEPOLIA = '0xcfA132E353cB4E398080B9700609bb008eceB125';
export const CFA_FORWARDER_BASE_MAINNET = '0xcfA132E353cB4E398080B9700609bb008eceB125'; // Update with actual mainnet address

// GDA Forwarder address (same on all chains)
export const GDA_FORWARDER_ADDRESS = '0x6DA13Bde224A05a288748d857b9e7DDEffd1dE08';

// Operation Types (from Superfluid Definitions.sol)
export const OPERATION_TYPE = {
  UNSUPPORTED: 0,
  ERC20_APPROVE: 1,
  ERC20_TRANSFER_FROM: 2,
  ERC20_INCREASE_ALLOWANCE: 4,
  ERC20_DECREASE_ALLOWANCE: 5,
  SUPERTOKEN_UPGRADE: 101,
  SUPERTOKEN_DOWNGRADE: 102,
  SUPERFLUID_CALL_AGREEMENT: 201,
  CALL_APP_ACTION: 202,
  SIMPLE_FORWARD_CALL: 301,
  ERC2771_FORWARD_CALL: 302,
} as const;

// Host ABI (minimal)
const HOST_ABI = [
  {
    inputs: [
      {
        components: [
          { internalType: 'uint32', name: 'operationType', type: 'uint32' },
          { internalType: 'address', name: 'target', type: 'address' },
          { internalType: 'bytes', name: 'data', type: 'bytes' },
        ],
        internalType: 'struct ISuperfluid.Operation[]',
        name: 'operations',
        type: 'tuple[]',
      },
    ],
    name: 'batchCall',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

// CFA Forwarder ABI (minimal)
const CFA_FORWARDER_ABI = [
  {
    inputs: [
      { internalType: 'contract ISuperToken', name: 'token', type: 'address' },
      { internalType: 'address', name: 'sender', type: 'address' },
      { internalType: 'address', name: 'receiver', type: 'address' },
      { internalType: 'int96', name: 'flowRate', type: 'int96' },
      { internalType: 'bytes', name: 'userData', type: 'bytes' },
    ],
    name: 'createFlow',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'contract ISuperToken', name: 'token', type: 'address' },
      { internalType: 'address', name: 'sender', type: 'address' },
      { internalType: 'address', name: 'receiver', type: 'address' },
      { internalType: 'int96', name: 'flowRate', type: 'int96' },
      { internalType: 'bytes', name: 'userData', type: 'bytes' },
    ],
    name: 'updateFlow',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'contract ISuperToken', name: 'token', type: 'address' },
      { internalType: 'address', name: 'sender', type: 'address' },
      { internalType: 'address', name: 'receiver', type: 'address' },
      { internalType: 'bytes', name: 'userData', type: 'bytes' },
    ],
    name: 'deleteFlow',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

// GDA Forwarder ABI (minimal)
const GDA_FORWARDER_ABI = [
  {
    inputs: [
      { internalType: 'contract ISuperToken', name: 'token', type: 'address' },
      { internalType: 'address', name: 'admin', type: 'address' },
      {
        components: [
          { internalType: 'bool', name: 'transferabilityForUnitsOwner', type: 'bool' },
          { internalType: 'bool', name: 'distributionFromAnyAddress', type: 'bool' },
        ],
        internalType: 'struct PoolConfig',
        name: 'config',
        type: 'tuple',
      },
    ],
    name: 'createPool',
    outputs: [
      { internalType: 'bool', name: 'success', type: 'bool' },
      { internalType: 'contract ISuperfluidPool', name: 'pool', type: 'address' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'contract ISuperfluidPool', name: 'pool', type: 'address' },
      { internalType: 'address[]', name: 'receivers', type: 'address[]' },
      { internalType: 'uint128[]', name: 'units', type: 'uint128[]' },
    ],
    name: 'updateMemberUnits',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'contract ISuperToken', name: 'token', type: 'address' },
      { internalType: 'address', name: 'from', type: 'address' },
      { internalType: 'contract ISuperfluidPool', name: 'pool', type: 'address' },
      { internalType: 'int96', name: 'requestedFlowRate', type: 'int96' },
      { internalType: 'bytes', name: 'userData', type: 'bytes' },
    ],
    name: 'distributeFlow',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

// Super Token ABI (minimal)
const SUPER_TOKEN_ABI = [
  {
    inputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }],
    name: 'upgrade',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }],
    name: 'downgrade',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

export interface BatchOperation {
  operationType: number;
  target: string;
  data: string;
}

export interface PoolBatchParams {
  poolAddress: string;
  recipients: Array<{ address: string; units: bigint }>;
  superTokenAddress: string;
  flowRatePerDay?: string;
  decimals?: number;
}

/**
 * Get Host address for chain
 */
export function getHostAddress(chainId: number): string {
  if (chainId === 84532) return SUPERFLUID_HOST_BASE_SEPOLIA; // Base Sepolia
  if (chainId === 8453) return SUPERFLUID_HOST_BASE_MAINNET; // Base Mainnet
  throw new Error(`Unsupported chain ID: ${chainId}`);
}

/**
 * Get CFA Forwarder address for chain
 */
export function getCFAForwarderAddress(chainId: number): string {
  if (chainId === 84532) return CFA_FORWARDER_BASE_SEPOLIA;
  if (chainId === 8453) return CFA_FORWARDER_BASE_MAINNET;
  throw new Error(`Unsupported chain ID: ${chainId}`);
}

/**
 * Get GDA Forwarder address (same on all chains)
 */
export function getGDAForwarderAddress(): string {
  return GDA_FORWARDER_ADDRESS;
}

/**
 * Create operation for upgrading tokens
 */
export function createUpgradeOperation(
  superTokenAddress: string,
  amount: bigint
): BatchOperation {
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  return {
    operationType: OPERATION_TYPE.SUPERTOKEN_UPGRADE,
    target: superTokenAddress,
    data: abiCoder.encode(['uint256'], [amount]),
  };
}

/**
 * Create operation for creating flow via CFA
 */
export function createFlowOperation(
  cfaForwarderAddress: string,
  superTokenAddress: string,
  senderAddress: string,
  receiverAddress: string,
  flowRate: bigint
): BatchOperation {
  // Encode CFA createFlow call
  const cfaInterface = new ethers.Interface(CFA_FORWARDER_ABI);
  const callData = cfaInterface.encodeFunctionData('createFlow', [
    superTokenAddress,
    senderAddress,
    receiverAddress,
    toInt96(flowRate),
    '0x',
  ]);

  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  return {
    operationType: OPERATION_TYPE.SUPERFLUID_CALL_AGREEMENT,
    target: cfaForwarderAddress,
    data: abiCoder.encode(
      ['bytes', 'bytes'],
      [callData, '0x']
    ),
  };
}

/**
 * Create operation for updating flow via CFA
 */
export function createUpdateFlowOperation(
  cfaForwarderAddress: string,
  superTokenAddress: string,
  senderAddress: string,
  receiverAddress: string,
  flowRate: bigint
): BatchOperation {
  const cfaInterface = new ethers.Interface(CFA_FORWARDER_ABI);
  const callData = cfaInterface.encodeFunctionData('updateFlow', [
    superTokenAddress,
    senderAddress,
    receiverAddress,
    toInt96(flowRate),
    '0x',
  ]);

  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  return {
    operationType: OPERATION_TYPE.SUPERFLUID_CALL_AGREEMENT,
    target: cfaForwarderAddress,
    data: abiCoder.encode(
      ['bytes', 'bytes'],
      [callData, '0x']
    ),
  };
}

/**
 * Create operation for deleting flow via CFA
 */
export function createDeleteFlowOperation(
  cfaForwarderAddress: string,
  superTokenAddress: string,
  senderAddress: string,
  receiverAddress: string
): BatchOperation {
  const cfaInterface = new ethers.Interface(CFA_FORWARDER_ABI);
  const callData = cfaInterface.encodeFunctionData('deleteFlow', [
    superTokenAddress,
    senderAddress,
    receiverAddress,
    '0x',
  ]);

  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  return {
    operationType: OPERATION_TYPE.SUPERFLUID_CALL_AGREEMENT,
    target: cfaForwarderAddress,
    data: abiCoder.encode(
      ['bytes', 'bytes'],
      [callData, '0x']
    ),
  };
}

/**
 * Create operation for downgrading tokens
 */
export function createDowngradeOperation(
  superTokenAddress: string,
  amount: bigint
): BatchOperation {
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  return {
    operationType: OPERATION_TYPE.SUPERTOKEN_DOWNGRADE,
    target: superTokenAddress,
    data: abiCoder.encode(['uint256'], [amount]),
  };
}

/**
 * Create operation for updating pool member units via GDA
 */
export function createUpdateMemberUnitsOperation(
  poolAddress: string,
  recipients: Array<{ address: string; units: bigint }>
): BatchOperation {
  const gdaInterface = new ethers.Interface(GDA_FORWARDER_ABI);
  const receivers = recipients.map((r) => r.address);
  const units = recipients.map((r) => BigInt(r.units));

  const callData = gdaInterface.encodeFunctionData('updateMemberUnits', [
    poolAddress,
    receivers,
    units,
  ]);

  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  return {
    operationType: OPERATION_TYPE.SUPERFLUID_CALL_AGREEMENT,
    target: GDA_FORWARDER_ADDRESS,
    data: abiCoder.encode(
      ['bytes', 'bytes'],
      [callData, '0x']
    ),
  };
}

/**
 * Create operation for distributing flow to pool via GDA
 */
export function createDistributeFlowOperation(
  superTokenAddress: string,
  senderAddress: string,
  poolAddress: string,
  flowRate: bigint
): BatchOperation {
  const gdaInterface = new ethers.Interface(GDA_FORWARDER_ABI);
  const callData = gdaInterface.encodeFunctionData('distributeFlow', [
    superTokenAddress,
    senderAddress,
    poolAddress,
    toInt96(flowRate),
    '0x',
  ]);

  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  return {
    operationType: OPERATION_TYPE.SUPERFLUID_CALL_AGREEMENT,
    target: GDA_FORWARDER_ADDRESS,
    data: abiCoder.encode(
      ['bytes', 'bytes'],
      [callData, '0x']
    ),
  };
}

/**
 * Create operation for creating pool via GDA
 */
export function createPoolOperation(
  superTokenAddress: string,
  adminAddress: string,
  config: {
    transferabilityForUnitsOwner: boolean;
    distributionFromAnyAddress: boolean;
  }
): BatchOperation {
  const gdaInterface = new ethers.Interface(GDA_FORWARDER_ABI);
  const callData = gdaInterface.encodeFunctionData('createPool', [
    superTokenAddress,
    adminAddress,
    [config.transferabilityForUnitsOwner, config.distributionFromAnyAddress],
  ]);

  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  return {
    operationType: OPERATION_TYPE.SUPERFLUID_CALL_AGREEMENT,
    target: GDA_FORWARDER_ADDRESS,
    data: abiCoder.encode(
      ['bytes', 'bytes'],
      [callData, '0x']
    ),
  };
}

/**
 * Create operation for distributing tokens to pool via GDA (one-time distribution)
 */
export function createDistributeOperation(
  superTokenAddress: string,
  senderAddress: string,
  poolAddress: string,
  amount: bigint
): BatchOperation {
  const gdaInterface = new ethers.Interface(GDA_FORWARDER_ABI);
  const callData = gdaInterface.encodeFunctionData('distribute', [
    superTokenAddress,
    senderAddress,
    poolAddress,
    amount,
    '0x',
  ]);

  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  return {
    operationType: OPERATION_TYPE.SUPERFLUID_CALL_AGREEMENT,
    target: GDA_FORWARDER_ADDRESS,
    data: abiCoder.encode(
      ['bytes', 'bytes'],
      [callData, '0x']
    ),
  };
}

/**
 * Execute batch call via Host contract
 */
export async function executeBatchCall(
  signer: ethers.Signer,
  operations: BatchOperation[],
  chainId: number
): Promise<ethers.ContractTransactionResponse> {
  const hostAddress = getHostAddress(chainId);
  const hostContract = new ethers.Contract(hostAddress, HOST_ABI, signer);

  // Convert operations to the format expected by batchCall
  const formattedOperations = operations.map((op) => ({
    operationType: op.operationType,
    target: op.target,
    data: op.data,
  }));

  return await hostContract.batchCall(formattedOperations);
}

/**
 * Batch operation: Upgrade tokens and create flow
 */
export async function batchUpgradeAndFlow(
  signer: ethers.Signer,
  superTokenAddress: string,
  receiverAddress: string,
  amount: string,
  flowRatePerDay: string,
  chainId: number,
  decimals: number = 6
): Promise<ethers.ContractTransactionResponse> {
  const senderAddress = await signer.getAddress();
  const cfaForwarderAddress = getCFAForwarderAddress(chainId);

  // Convert amounts
  const upgradeAmount = ethers.parseUnits(amount, decimals);
  const flowRate = convertFlowRateToWeiPerSecond(flowRatePerDay, decimals, 'day');
  const flowRateInt96 = toInt96(flowRate);

  const operations: BatchOperation[] = [
    // 1. Upgrade tokens
    createUpgradeOperation(superTokenAddress, upgradeAmount),
    // 2. Create flow
    createFlowOperation(
      cfaForwarderAddress,
      superTokenAddress,
      senderAddress,
      receiverAddress,
      flowRateInt96
    ),
  ];

  return await executeBatchCall(signer, operations, chainId);
}

/**
 * Batch operation: Update pool units and distribute flow
 */
export async function batchPoolUpdateAndFlow(
  signer: ethers.Signer,
  params: PoolBatchParams,
  chainId: number
): Promise<ethers.ContractTransactionResponse> {
  const senderAddress = await signer.getAddress();
  const operations: BatchOperation[] = [];

  // 1. Update member units
  operations.push(
    createUpdateMemberUnitsOperation(params.poolAddress, params.recipients)
  );

  // 2. Distribute flow to pool (if flowRate provided)
  if (params.flowRatePerDay) {
    const flowRate = convertFlowRateToWeiPerSecond(
      params.flowRatePerDay,
      params.decimals || 6,
      'day'
    );
    const flowRateInt96 = toInt96(flowRate);

    operations.push(
      createDistributeFlowOperation(
        params.superTokenAddress,
        senderAddress,
        params.poolAddress,
        flowRateInt96
      )
    );
  }

  return await executeBatchCall(signer, operations, chainId);
}

/**
 * Batch operation: Create multiple flows
 */
export async function batchCreateFlows(
  signer: ethers.Signer,
  superTokenAddress: string,
  flows: Array<{ receiver: string; flowRatePerDay: string }>,
  chainId: number,
  decimals: number = 6
): Promise<ethers.ContractTransactionResponse> {
  const senderAddress = await signer.getAddress();
  const cfaForwarderAddress = getCFAForwarderAddress(chainId);

  const operations: BatchOperation[] = flows.map((flow) => {
    const flowRate = convertFlowRateToWeiPerSecond(
      flow.flowRatePerDay,
      decimals,
      'day'
    );
    const flowRateInt96 = toInt96(flowRate);

    return createFlowOperation(
      cfaForwarderAddress,
      superTokenAddress,
      senderAddress,
      flow.receiver,
      flowRateInt96
    );
  });

  return await executeBatchCall(signer, operations, chainId);
}

/**
 * Estimate gas for batch call
 */
export async function estimateBatchCallGas(
  provider: ethers.Provider,
  operations: BatchOperation[],
  chainId: number,
  fromAddress: string
): Promise<bigint> {
  const hostAddress = getHostAddress(chainId);
  const hostContract = new ethers.Contract(hostAddress, HOST_ABI, provider);

  const formattedOperations = operations.map((op) => ({
    operationType: op.operationType,
    target: op.target,
    data: op.data,
  }));

  try {
    const gasEstimate = await hostContract.batchCall.estimateGas(
      formattedOperations,
      {
        from: fromAddress,
      }
    );
    return gasEstimate;
  } catch (error) {
    console.error('Gas estimation failed:', error);
    throw error;
  }
}

/**
 * Build conditional batch operations based on current state
 * Useful for building batches that depend on token balances or existing flows
 */
export interface ConditionalBatchOptions {
  superTokenAddress: string;
  userAddress: string;
  minBalance?: bigint;
  upgradeIfNeeded?: {
    amount: bigint;
  };
  flows?: Array<{
    receiver: string;
    flowRatePerDay: string;
    decimals?: number;
  }>;
  chainId: number;
}

/**
 * Build batch operations conditionally based on current state
 * Note: This is a helper function. You should check balances/flows separately
 * and build operations accordingly.
 */
export function buildConditionalBatch(
  options: ConditionalBatchOptions
): BatchOperation[] {
  const operations: BatchOperation[] = [];
  const cfaForwarderAddress = getCFAForwarderAddress(options.chainId);

  // Add upgrade operation if needed
  if (options.upgradeIfNeeded) {
    operations.push(
      createUpgradeOperation(
        options.superTokenAddress,
        options.upgradeIfNeeded.amount
      )
    );
  }

  // Add flow operations
  if (options.flows && options.flows.length > 0) {
    options.flows.forEach((flow) => {
      const flowRate = convertFlowRateToWeiPerSecond(
        flow.flowRatePerDay,
        flow.decimals || 6,
        'day'
      );
      const flowRateInt96 = toInt96(flowRate);

      operations.push(
        createFlowOperation(
          cfaForwarderAddress,
          options.superTokenAddress,
          options.userAddress,
          flow.receiver,
          flowRateInt96
        )
      );
    });
  }

  return operations;
}

/**
 * Batch operation: Update multiple flows in a single transaction
 */
export async function batchUpdateFlows(
  signer: ethers.Signer,
  superTokenAddress: string,
  flows: Array<{ receiver: string; flowRatePerDay: string }>,
  chainId: number,
  decimals: number = 6
): Promise<ethers.ContractTransactionResponse> {
  const senderAddress = await signer.getAddress();
  const cfaForwarderAddress = getCFAForwarderAddress(chainId);

  const operations: BatchOperation[] = flows.map((flow) => {
    const flowRate = convertFlowRateToWeiPerSecond(
      flow.flowRatePerDay,
      decimals,
      'day'
    );
    const flowRateInt96 = toInt96(flowRate);

    return createUpdateFlowOperation(
      cfaForwarderAddress,
      superTokenAddress,
      senderAddress,
      flow.receiver,
      flowRateInt96
    );
  });

  return await executeBatchCall(signer, operations, chainId);
}

/**
 * Batch operation: Delete multiple flows in a single transaction
 */
export async function batchDeleteFlows(
  signer: ethers.Signer,
  superTokenAddress: string,
  receivers: string[],
  chainId: number
): Promise<ethers.ContractTransactionResponse> {
  const senderAddress = await signer.getAddress();
  const cfaForwarderAddress = getCFAForwarderAddress(chainId);

  const operations: BatchOperation[] = receivers.map((receiver) =>
    createDeleteFlowOperation(
      cfaForwarderAddress,
      superTokenAddress,
      senderAddress,
      receiver
    )
  );

  return await executeBatchCall(signer, operations, chainId);
}

