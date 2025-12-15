import { NextRequest, NextResponse } from "next/server";
import { broadcastNotification } from "@/lib/push-notifications";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

if (!WEBHOOK_SECRET) {
    console.warn("WEBHOOK_SECRET is not set in environment variables");
}

export async function POST(req: NextRequest) {
    try {
        // 1. Verify Secret
        const secretKeys = [
            req.headers.get("x-webhook-secret"),
            req.nextUrl.searchParams.get("secret"),
        ];

        if (!WEBHOOK_SECRET || !secretKeys.includes(WEBHOOK_SECRET)) {
            console.warn("Unauthorized webhook attempt or WEBHOOK_SECRET not set");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 2. Parse Payload
        const body = await req.json();
        console.log("Webhook received:", JSON.stringify(body, null, 2));

        // Expected payload for placeBet:
        // We assume a structure, but will try to be flexible or check for specific fields.
        // Based on user: placeBet(uint256 marketId, string predictedTrack, uint256 amount)

        // Check if it is a placeBet event (flexible check)
        // Some providers wrap in `event` or `activity` array.
        // For now, let's assume the body IS the event data or contains it.

        // Adapt to common patterns or just look for the data fields directly if top level
        const data = body.data || body;
        const eventName = body.event || "unknown";

        if (eventName === "placeBet" || (data && data.predictedTrack)) {
            const marketId = data.marketId;
            const predictedTrack = data.predictedTrack;
            // Amount often comes as wei, might need formatting but for notification raw is okay or simplified
            // const amount = data.amount;

            if (predictedTrack) {
                const title = "New Bet Placed! 🎵";
                const message = `Someone just bet on "${predictedTrack}" in Market #${marketId}`;

                // Broadcast
                const result = await broadcastNotification(title, message, "/");

                return NextResponse.json({
                    success: true,
                    broadcast: result
                });
            }
        }

        return NextResponse.json({ message: "Event received but no notification triggered" });

    } catch (error) {
        console.error("Webhook processing error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
