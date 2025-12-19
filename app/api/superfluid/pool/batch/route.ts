import { NextRequest, NextResponse } from 'next/server';
import { validatePoolAndBalance } from '@/lib/superfluid-pool-validation';
import { storePool, getPool } from '@/lib/superfluid-pool';
import type { MacroRecipient } from '@/lib/superfluid-macro';

/**
 * POST /api/superfluid/pool/batch
 * Batch create/update pool with recipients and flow rate using macro
 * This endpoint prepares the macro execution but doesn't execute on-chain
 * The frontend should call executeRewardsMacro with the returned parameters
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      marketId,
      poolAddress,
      recipients,
      flowRatePerDay,
      userAddress,
      network,
    } = body;

    // Validate required fields
    if (!marketId || !poolAddress || !recipients || !flowRatePerDay) {
      return NextResponse.json(
        { error: 'Missing required fields: marketId, poolAddress, recipients, flowRatePerDay' },
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

    // Convert recipients to MacroRecipient format
    const macroRecipients: MacroRecipient[] = recipients.map((r: any) => ({
      address: r.address,
      units: BigInt(r.units),
    }));

    // Store pool information (if not exists)
    const existingPool = await getPool(parseInt(marketId));
    if (!existingPool) {
      await storePool({
        marketId: parseInt(marketId),
        poolAddress,
        tokenAddress: '', // Will be set after validation
        createdAt: Date.now(),
        totalFlowRate: 0n,
        totalMembers: recipients.length,
        isActive: true,
      });
    }

    // Return macro parameters for frontend execution
    return NextResponse.json({
      success: true,
      macroParams: {
        poolAddress,
        recipients: macroRecipients.map((r) => ({
          address: r.address,
          units: r.units.toString(),
        })),
        flowRatePerDay,
        decimals: 6, // USDC
      },
      message: 'Use executeRewardsMacro with these parameters to execute on-chain',
    });
  } catch (error) {
    console.error('Error preparing batch operation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/superfluid/pool/batch
 * Validate pool and check balance before batch operation
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const poolAddress = searchParams.get('poolAddress');
    const userAddress = searchParams.get('userAddress');
    const rpcUrl = searchParams.get('rpcUrl');

    if (!poolAddress || !userAddress) {
      return NextResponse.json(
        { error: 'Missing poolAddress or userAddress' },
        { status: 400 }
      );
    }

    // Note: This would need a provider instance
    // For now, return validation structure
    return NextResponse.json({
      message: 'Pool validation should be done client-side with provider',
      poolAddress,
      userAddress,
    });
  } catch (error) {
    console.error('Error validating pool:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

