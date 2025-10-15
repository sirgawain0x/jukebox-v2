import { NextRequest, NextResponse } from "next/server";
import { withPayment } from "@/lib/payment-handler";

/**
 * Protected API route for Gemini text-to-image generation
 * Payment is handled via the withPayment wrapper
 */
const handler = async (request: NextRequest) => {
  try {
    // Your Gemini text-to-image logic here
    const body = await request.json();
    const { prompt } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // TODO: Implement Gemini API call
    // Example:
    // const result = await geminiClient.generateImage({ prompt });

    return NextResponse.json({
      message: "Cover art generation endpoint - implement Gemini logic",
      prompt,
    });
  } catch (error) {
    console.error("Gemini text-to-image error:", error);
    return NextResponse.json(
      { error: "Failed to generate cover art" },
      { status: 500 }
    );
  }
};

// Wrap with payment handler
export const POST = withPayment("/api/gemini/text-to-image", handler);

