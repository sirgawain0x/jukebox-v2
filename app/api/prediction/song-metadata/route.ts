import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCachedSongMetadata, saveSongMetadata } from "@/lib/prediction-cache";

const payloadSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  artist: z.string().min(1),
  cover: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = payloadSchema.parse(body);

    await saveSongMetadata(
      payload.id,
      {
        title: payload.title,
        artist: payload.artist,
        cover: payload.cover ?? "",
        source: "creator",
        isFallback: false,
      },
      { force: true },
    );

    const stored = await getCachedSongMetadata(payload.id);

    return NextResponse.json({
      success: true,
      metadata: stored,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid song metadata payload",
          details: error.issues,
        },
        { status: 400 },
      );
    }

    console.error("Failed to persist song metadata", error);

    return NextResponse.json(
      {
        error: "Failed to persist song metadata",
      },
      { status: 500 },
    );
  }
}

