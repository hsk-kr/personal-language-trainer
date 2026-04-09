import { getFriendById } from "@/lib/friends";
import { NextRequest, NextResponse } from "next/server";

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

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GOOGLE_API_KEY not set" },
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

    // Get friend's voice settings
    const friend = friendId ? getFriendById(friendId) : null;
    const voiceName = friend?.voice ?? "Puck";
    const voiceStyle = friend?.voiceStyle ?? "Speak in a natural, conversational tone.";

    console.log("[TTS] Gemini TTS, voice:", voiceName, "text length:", cleanText.length);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: cleanText }],
            },
          ],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: voiceName,
                },
              },
            },
          },
          systemInstruction: {
            parts: [{ text: voiceStyle }],
          },
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("[TTS] Gemini error:", response.status, errorBody);
      return NextResponse.json(
        { error: `TTS failed: ${response.status}` },
        { status: 502 }
      );
    }

    const result = await response.json();
    const audioData =
      result.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    const mimeType =
      result.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType ??
      "audio/wav";

    if (!audioData) {
      console.error("[TTS] No audio in response:", JSON.stringify(result).slice(0, 500));
      return NextResponse.json(
        { error: "No audio generated" },
        { status: 502 }
      );
    }

    const audioBuffer = Buffer.from(audioData, "base64");
    console.log("[TTS] Generated audio, size:", audioBuffer.length);

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": mimeType,
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
