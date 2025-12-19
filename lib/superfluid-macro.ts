// Superfluid Macro execution service
// Handles batching operations using RewardsMacro contract
// NOTE: Consider using Host batchCall instead (see superfluid-batch-call.ts)
// for better gas efficiency and no deployment needed

import { ethers } from 'ethers';
import { convertFlowRateToWeiPerSecond, toInt96 } from './superfluid-flow-rate';

const REWARDS_MACRO_ADDRESS = process.env.NEXT_PUBLIC_SUPERFLUID_REWARDS_MACRO_ADDRESS;
const MACRO_FORWARDER_ADDRESS = process.env.NEXT_PUBLIC_SUPERFLUID_MACRO_FORWARDER_ADDRESS;

export interface MacroRecipient {
  address: string;
  units: bigint;
}

export interface MacroParams {
  poolAddress: string;
  recipients: MacroRecipient[];
  flowRatePerDay: string; // e.g., "100" for 100 tokens/day
  decimals?: number;
}

/**
 * Execute rewards macro to batch pool operations
 * @param signer Ethers signer (wallet)
 * @param params Macro parameters
 * @returns Transaction response
 */
export async function executeRewardsMacro(
  signer: ethers.Signer,
  params: MacroParams
): Promise<ethers.ContractTransaction> {
  if (!REWARDS_MACRO_ADDRESS) {
    throw new Error('REWARDS_MACRO_ADDRESS not configured');
  }

  const rewardsMacro = new ethers.Contract(
    REWARDS_MACRO_ADDRESS,
    [
      'function getParams(address poolAddress, address[] receivers, uint128[] units, int96 flowRate) view returns (bytes)',
      'function execute(bytes params) external',
    ],
    signer
  );

  // Prepare data
  const receivers = params.recipients.map((r) => r.address);
  const units = params.recipients.map((r) => BigInt(r.units));

  // Convert flow rate: tokens/day -> wei/second -> int96
  const flowRateWeiPerSecond = convertFlowRateToWeiPerSecond(
    params.flowRatePerDay,
    params.decimals || 6,
    'day'
  );
  const flowRateInt96 = toInt96(flowRateWeiPerSecond);

  // Get macro parameters
  const macroParams = await rewardsMacro.getParams(
    params.poolAddress,
    receivers,
    units,
    flowRateInt96
  );

  // Execute macro directly (or through MacroForwarder if available)
  if (MACRO_FORWARDER_ADDRESS) {
    const macroForwarder = new ethers.Contract(
      MACRO_FORWARDER_ADDRESS,
      ['function runMacro(address macro, bytes params) external'],
      signer
    );

    return await macroForwarder.runMacro(REWARDS_MACRO_ADDRESS, macroParams);
  } else {
    // Execute directly on macro contract
    return await rewardsMacro.execute(macroParams);
  }
}

/**
 * Execute macro with direct flow creation (alternative method)
 */
export async function executeRewardsMacroWithFlow(
  signer: ethers.Signer,
  poolAddress: string,
  recipients: MacroRecipient[],
  superTokenAddress: string,
  flowRatePerDay: string,
  decimals: number = 6
): Promise<ethers.ContractTransaction> {
  if (!REWARDS_MACRO_ADDRESS) {
    throw new Error('REWARDS_MACRO_ADDRESS not configured');
  }

  const rewardsMacro = new ethers.Contract(
    REWARDS_MACRO_ADDRESS,
    [
      'function executeWithFlow(address poolAddress, address[] receivers, uint128[] units, address superToken, int96 flowRate) external',
    ],
    signer
  );

  const receivers = recipients.map((r) => r.address);
  const units = recipients.map((r) => BigInt(r.units));

  const flowRateWeiPerSecond = convertFlowRateToWeiPerSecond(
    flowRatePerDay,
    decimals,
    'day'
  );
  const flowRateInt96 = toInt96(flowRateWeiPerSecond);

  return await rewardsMacro.executeWithFlow(
    poolAddress,
    receivers,
    units,
    superTokenAddress,
    flowRateInt96
  );
}

/**
 * Estimate gas for macro execution
 */
export async function estimateMacroGas(
  provider: ethers.providers.Provider,
  params: MacroParams,
  fromAddress: string
): Promise<bigint> {
  if (!REWARDS_MACRO_ADDRESS) {
    throw new Error('REWARDS_MACRO_ADDRESS not configured');
  }

  const rewardsMacro = new ethers.Contract(
    REWARDS_MACRO_ADDRESS,
    [
      'function getParams(address poolAddress, address[] receivers, uint128[] units, int96 flowRate) view returns (bytes)',
      'function execute(bytes params) external',
    ],
    provider
  );

  const receivers = params.recipients.map((r) => r.address);
  const units = params.recipients.map((r) => BigInt(r.units));

  const flowRateWeiPerSecond = convertFlowRateToWeiPerSecond(
    params.flowRatePerDay,
    params.decimals || 6,
    'day'
  );
  const flowRateInt96 = toInt96(flowRateWeiPerSecond);

  const macroParams = await rewardsMacro.getParams(
    params.poolAddress,
    receivers,
    units,
    flowRateInt96
  );

  try {
    const gasEstimate = await rewardsMacro.execute.estimateGas(macroParams, {
      from: fromAddress,
    });
    return gasEstimate;
  } catch (error) {
    console.error('Gas estimation failed:', error);
    throw error;
  }
}

