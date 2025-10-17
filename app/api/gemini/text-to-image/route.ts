import { NextRequest, NextResponse } from "next/server";
import { withPayment } from "@/lib/payment-handler";
import { GoogleGenAI } from "@google/genai";

/**
 * Protected API route for Gemini text-to-image generation
 * Payment is handled via the withPayment wrapper
 */
const handler = async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { prompt } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
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

    // Generate image using the correct model
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: prompt,
    });

    // Process the response to extract image data
    const candidate = response.candidates?.[0];
    if (!candidate?.content?.parts) {
      throw new Error("No content parts received from Gemini");
    }

    let imageUrl: string | null = null;
    let textResponse: string | null = null;

    // Process each part of the response
    for (const part of candidate.content.parts) {
      if (part.text) {
        textResponse = part.text;
      } else if (part.inlineData) {
        // Convert base64 to data URL for frontend
        const imageData = part.inlineData.data;
        const mimeType = part.inlineData.mimeType || "image/png";
        imageUrl = `data:${mimeType};base64,${imageData}`;
      }
    }

    if (!imageUrl) {
      throw new Error("No image data received from Gemini");
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      textResponse: textResponse || "Image generated successfully",
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
};

// Wrap with payment handler
export const POST = withPayment("/api/gemini/text-to-image", handler);

