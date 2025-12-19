import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/superfluid/pool/claim
 * Connect, disconnect, or claim from a pool
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, poolAddress, memberAddress, userAddress } = body;

    if (!action || !poolAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: action, poolAddress' },
        { status: 400 }
      );
    }

    // Note: This endpoint prepares the transaction
    // Actual execution should happen on the frontend with user's wallet
    // For security, we don't execute transactions server-side

    return NextResponse.json({
      success: true,
      message: 'Use frontend to execute transaction with user wallet',
      action,
      poolAddress,
      memberAddress: memberAddress || userAddress,
    });
  } catch (error) {
    console.error('Error preparing pool claim:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/superfluid/pool/claim
 * Get claimable amount and connection status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const poolAddress = searchParams.get('poolAddress');
    const memberAddress = searchParams.get('memberAddress');

    if (!poolAddress || !memberAddress) {
      return NextResponse.json(
        { error: 'Missing poolAddress or memberAddress' },
        { status: 400 }
      );
    }

    // Note: This would need a provider instance
    // For now, return structure
    return NextResponse.json({
      message: 'Query pool contract directly from frontend',
      poolAddress,
      memberAddress,
    });
  } catch (error) {
    console.error('Error getting claim info:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

