import { TTS_MODEL } from "@/lib/groq";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { text, voice } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: "No text provided" },
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

    console.log("[TTS] Generating speech, voice:", voice, "text length:", text.length);

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
          voice: voice || "Fritz-PlayAI",
          input: text,
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
    console.error("[TTS] Error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Failed to synthesize speech" },
      { status: 500 }
    );
  }
}
