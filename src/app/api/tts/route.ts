import { getFriendById } from "@/lib/friends";
import { NextRequest, NextResponse } from "next/server";

function pcmToWav(pcmData: Buffer, sampleRate: number = 24000): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcmData.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcmData.length, 40);

  return Buffer.concat([header, pcmData]);
}

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

    const friend = friendId ? getFriendById(friendId) : null;
    const voiceName = friend?.voice ?? "Puck";

    console.log("[TTS] Gemini TTS, voice:", voiceName, "text length:", cleanText.length);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: friend?.voiceStyle
                ? `${friend.voiceStyle}: ${cleanText}`
                : cleanText }],
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
      result.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType ?? "";

    if (!audioData) {
      console.error("[TTS] No audio in response");
      return NextResponse.json(
        { error: "No audio generated" },
        { status: 502 }
      );
    }

    let audioBuffer = Buffer.from(audioData, "base64");

    // Gemini returns raw PCM — convert to WAV for browser playback
    if (mimeType.includes("pcm") || mimeType.includes("L16")) {
      const rateMatch = mimeType.match(/rate=(\d+)/);
      const sampleRate = rateMatch ? parseInt(rateMatch[1]) : 24000;
      audioBuffer = pcmToWav(audioBuffer, sampleRate);
    }

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
