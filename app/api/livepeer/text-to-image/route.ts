import { NextRequest, NextResponse } from "next/server";
import { withPayment } from "@/lib/payment-handler";

/**
 * Protected API route for Livepeer text-to-image generation
 * Payment is handled via the withPayment wrapper
 */
const handler = async (request: NextRequest) => {
  try {
    // Your Livepeer text-to-image logic here
    const body = await request.json();
    const { prompt } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // TODO: Implement Livepeer API call
    // Example:
    // const result = await livepeerClient.textToImage({ prompt });

    return NextResponse.json({
      message: "Image generation endpoint - implement Livepeer logic",
      prompt,
    });
  } catch (error) {
    console.error("Livepeer text-to-image error:", error);
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 }
    );
  }
};

// Wrap with payment handler
export const POST = withPayment("/api/livepeer/text-to-image", handler);

