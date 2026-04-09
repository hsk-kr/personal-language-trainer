import { NextRequest, NextResponse } from "next/server";

const TTS_MODEL = "canopylabs/orpheus-v1-english";

const VOICE_MAP: Record<string, string> = {
  ryan: "daniel",
  marcus: "troy",
  tyler: "austin",
  professor: "daniel",
  "coach-jay": "troy",
  "dev-sensei": "daniel",
  monica: "autumn",
};

export async function POST(request: NextRequest) {
  try {
    const { text, friendId } = await request.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "No text provided" },
        { status: 400 }
      );
    }

    if (text.length > 2000) {
      return NextResponse.json(
        { error: "Text too long" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY not set" },
        { status: 500 }
      );
    }

    // Strip markdown for clean TTS
    const cleanText = text
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/__/g, "")
      .replace(/#{1,6}\s/g, "")
      .replace(/[`~]/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .trim();

    const voice = VOICE_MAP[friendId ?? ""] ?? "daniel";

    console.log("[TTS] Groq Orpheus, voice:", voice, "text length:", cleanText.length);

    const response = await fetch(
      "https://api.groq.com/openai/v1/audio/speech",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: TTS_MODEL,
          voice,
          input: cleanText,
          response_format: "wav",
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("[TTS] Groq error:", response.status, errorBody);
      return NextResponse.json(
        { error: `TTS failed: ${response.status}` },
        { status: 502 }
      );
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    console.log("[TTS] Generated audio, size:", audioBuffer.length);

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": audioBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error(
      "[TTS] Error:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      { error: "Failed to synthesize speech" },
      { status: 500 }
    );
  }
}
