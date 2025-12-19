// Flow rate conversion utilities for Superfluid
// Handles conversion between different time periods and formats

import { ethers } from 'ethers';

/**
 * Convert flow rate from tokens/day to wei/second
 * @param tokensPerDay Amount of tokens per day (as string, e.g., "100")
 * @param decimals Token decimals (default 6 for USDC)
 * @returns Flow rate in wei per second
 */
export function convertDailyToPerSecond(
  tokensPerDay: string,
  decimals: number = 6 // USDC has 6 decimals
): bigint {
  // Use BigInt arithmetic to avoid precision loss
  // Parse the input as a string to handle decimals, then convert to BigInt
  const tokensPerDayBigInt = parseToBigInt(tokensPerDay, decimals);
  const secondsPerDay = 86400n;
  // Calculate: (tokensPerDay * 10^decimals) / secondsPerDay
  return tokensPerDayBigInt / secondsPerDay;
}

/**
 * Convert flow rate from tokens/hour to wei/second
 */
export function convertHourlyToPerSecond(
  tokensPerHour: string,
  decimals: number = 6
): bigint {
  // Use BigInt arithmetic to avoid precision loss
  const tokensPerHourBigInt = parseToBigInt(tokensPerHour, decimals);
  const secondsPerHour = 3600n;
  return tokensPerHourBigInt / secondsPerHour;
}

/**
 * Convert flow rate from tokens/minute to wei/second
 */
export function convertMinuteToPerSecond(
  tokensPerMinute: string,
  decimals: number = 6
): bigint {
  // Use BigInt arithmetic to avoid precision loss
  const tokensPerMinuteBigInt = parseToBigInt(tokensPerMinute, decimals);
  const secondsPerMinute = 60n;
  return tokensPerMinuteBigInt / secondsPerMinute;
}

/**
 * Convert flow rate from various formats to wei/second
 */
export function convertFlowRateToWeiPerSecond(
  amount: string,
  decimals: number = 6,
  period: 'day' | 'hour' | 'minute' | 'second' = 'day'
): bigint {
  const periodSeconds: Record<string, bigint> = {
    day: 86400n,
    hour: 3600n,
    minute: 60n,
    second: 1n,
  };

  // Use BigInt arithmetic to avoid precision loss
  const amountBigInt = parseToBigInt(amount, decimals);
  const periodBigInt = periodSeconds[period];
  return amountBigInt / periodBigInt;
}

/**
 * Parse a decimal string to BigInt with specified decimals
 * Handles decimal numbers like "100.5" -> 100500000n (with 6 decimals)
 */
function parseToBigInt(value: string, decimals: number): bigint {
  // Split into integer and decimal parts
  const parts = value.split('.');
  const integerPart = parts[0] || '0';
  const decimalPart = parts[1] || '';

  // Pad or truncate decimal part to match decimals
  let paddedDecimal = decimalPart.padEnd(decimals, '0').slice(0, decimals);

  // Combine: integerPart + paddedDecimal
  const fullValue = integerPart + paddedDecimal;

  return BigInt(fullValue);
}

/**
 * Convert wei/second to tokens/day
 */
export function convertPerSecondToDaily(
  weiPerSecond: bigint,
  decimals: number = 6
): string {
  const tokensPerSecond = Number(weiPerSecond) / (10 ** decimals);
  const tokensPerDay = tokensPerSecond * 86400;
  return tokensPerDay.toFixed(decimals);
}

/**
 * Format flow rate for display
 */
export function formatFlowRate(
  flowRateWeiPerSecond: bigint,
  decimals: number = 6
): {
  perSecond: string;
  perMinute: string;
  perHour: string;
  perDay: string;
  formatted: string;
} {
  const tokensPerSecond = Number(flowRateWeiPerSecond) / (10 ** decimals);
  const tokensPerMinute = tokensPerSecond * 60;
  const tokensPerHour = tokensPerSecond * 3600;
  const tokensPerDay = tokensPerSecond * 86400;

  // Choose best format for display
  let formatted: string;
  if (tokensPerDay >= 1) {
    formatted = `$${tokensPerDay.toFixed(2)}/day`;
  } else if (tokensPerHour >= 0.01) {
    formatted = `$${tokensPerHour.toFixed(4)}/hour`;
  } else if (tokensPerMinute >= 0.0001) {
    formatted = `$${tokensPerMinute.toFixed(6)}/min`;
  } else {
    formatted = `$${tokensPerSecond.toFixed(8)}/sec`;
  }

  return {
    perSecond: tokensPerSecond.toFixed(decimals),
    perMinute: tokensPerMinute.toFixed(decimals),
    perHour: tokensPerHour.toFixed(decimals),
    perDay: tokensPerDay.toFixed(decimals),
    formatted,
  };
}

/**
 * Convert ethers.js format to int96 (Superfluid flow rate format)
 * Note: int96 can handle values from -2^95 to 2^95 - 1
 */
export function toInt96(value: bigint): bigint {
  const MAX_INT96 = BigInt('39614081257132168796771975168'); // 2^95
  const MIN_INT96 = BigInt('-39614081257132168796771975168'); // -2^95

  if (value > MAX_INT96) {
    throw new Error('Value exceeds int96 maximum');
  }
  if (value < MIN_INT96) {
    throw new Error('Value below int96 minimum');
  }

  return value;
}

