import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getPaymentStatus } from "@base-org/account";

/**
 * API route for Gemini text-to-image generation
 * Payment is verified via Base Pay payment ID
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, paymentId } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Verify payment using Base Pay
    if (!paymentId) {
      return NextResponse.json(
        { error: "Payment required. Please complete payment first." },
        { status: 402 }
      );
    }

    console.log("[Gemini API] Verifying Base Pay payment:", paymentId);

    try {
      const paymentStatus = await getPaymentStatus({
        id: paymentId,
        testnet: false
      });

      // Verify payment completed successfully
      if (paymentStatus.status !== 'completed') {
        console.error("[Gemini API] Payment not completed:", paymentStatus.status);
        return NextResponse.json(
          { error: `Payment verification failed: ${paymentStatus.message}` },
          { status: 402 }
        );
      }

      // Verify recipient matches (optional additional check)
      const expectedRecipient = process.env.WALLET_ADDRESS || process.env.NEXT_PUBLIC_WALLET_ADDRESS;
      if (expectedRecipient && paymentStatus.recipient && 
          paymentStatus.recipient.toLowerCase() !== expectedRecipient.toLowerCase()) {
        console.error("[Gemini API] Payment recipient mismatch");
        return NextResponse.json(
          { error: "Payment verification failed: Recipient mismatch" },
          { status: 402 }
        );
      }

      console.log("[Gemini API] Base Pay payment verified successfully");

    } catch (error) {
      console.error("[Gemini API] Payment verification error:", error);
      return NextResponse.json(
        { error: "Payment verification failed. Invalid payment ID." },
        { status: 402 }
      );
    }

    // Check if API key is configured
    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY environment variable is not set");
      return NextResponse.json(
        { error: "Gemini API key not configured" },
        { status: 500 }
      );
    }

    // Initialize Gemini AI with API key
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    // Generate image using Gemini 2.5 Flash Image
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: prompt,
    });

    // Extract image from response
    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) {
      throw new Error("No content parts received");
    }

    let imageUrl: string | null = null;
    for (const part of parts) {
      if (part.inlineData) {
        const imageData = part.inlineData.data;
        const mimeType = part.inlineData.mimeType || "image/png";
        imageUrl = `data:${mimeType};base64,${imageData}`;
        break;
      }
    }

    if (!imageUrl) {
      throw new Error("No image data received");
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      textResponse: "Image generated successfully",
    });
  } catch (error) {
    console.error("Gemini text-to-image error:", error);
    return NextResponse.json(
      { 
        error: "Failed to generate cover art", 
        details: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}
