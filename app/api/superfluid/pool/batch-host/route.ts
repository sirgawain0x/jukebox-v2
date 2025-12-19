import { NextRequest, NextResponse } from 'next/server';
import { storePool, getPool } from '@/lib/superfluid-pool';

/**
 * POST /api/superfluid/pool/batch-host
 * Prepare batch operation using Host batchCall (no macro contract needed)
 * Returns operation parameters for frontend execution
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      marketId,
      poolAddress,
      recipients,
      superTokenAddress,
      flowRatePerDay,
      chainId,
    } = body;

    // Validate required fields
    if (!marketId || !poolAddress || !recipients || !superTokenAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: marketId, poolAddress, recipients, superTokenAddress' },
        { status: 400 }
      );
    }

    // Validate recipients format
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { error: 'Recipients must be a non-empty array' },
        { status: 400 }
      );
    }

    // Validate each recipient
    for (const recipient of recipients) {
      if (!recipient.address || !recipient.units) {
        return NextResponse.json(
          { error: 'Each recipient must have address and units' },
          { status: 400 }
        );
      }
    }

    // Store pool information (if not exists)
    const existingPool = await getPool(parseInt(marketId));
    if (!existingPool) {
      await storePool({
        marketId: parseInt(marketId),
        poolAddress,
        tokenAddress: superTokenAddress,
        createdAt: Date.now(),
        totalFlowRate: BigInt(0),
        totalMembers: recipients.length,
        isActive: true,
      });
    }

    // Return batch call parameters for frontend execution
    return NextResponse.json({
      success: true,
      batchParams: {
        poolAddress,
        recipients: recipients.map((r: { address: string; units: string | number }) => ({
          address: r.address,
          units: r.units.toString(),
        })),
        superTokenAddress,
        flowRatePerDay: flowRatePerDay || null,
        decimals: 6, // USDC
        chainId: chainId || 8453, // Default to Base Mainnet
      },
      message: 'Use batchPoolUpdateAndFlow with these parameters to execute on-chain',
    });
  } catch (error) {
    console.error('Error preparing batch operation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

