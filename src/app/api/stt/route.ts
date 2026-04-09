import { STT_MODEL } from "@/lib/groq";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio");

    if (!audioFile || !(audioFile instanceof File)) {
      return NextResponse.json(
        { error: "No audio file provided" },
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

    if (audioFile.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Audio file too large" },
        { status: 413 }
      );
    }

    console.log("[STT] Sending to Groq, file size:", audioFile.size);

    // Use fetch directly instead of SDK — matches working curl
    const groqFormData = new FormData();
    groqFormData.append("file", audioFile, "recording.webm");
    groqFormData.append("model", STT_MODEL);
    groqFormData.append("language", "en");
    groqFormData.append("response_format", "json");

    const response = await fetch(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: groqFormData,
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("[STT] Groq error:", response.status, errorBody);
      return NextResponse.json(
        { error: `Groq STT error: ${response.status}` },
        { status: 502 }
      );
    }

    const result = await response.json();
    const text = result.text?.trim();

    if (!text) {
      return NextResponse.json(
        { error: "No speech detected" },
        { status: 422 }
      );
    }

    // Whisper hallucinates these phrases on silence/noise — filter them out
    const HALLUCINATIONS = [
      "thank you", "thanks for watching", "thanks for listening",
      "subscribe", "like and subscribe", "see you next time",
      "bye", "goodbye", "thank you for watching",
      "thanks", "you", ".", "..", "...",
    ];

    if (HALLUCINATIONS.includes(text.toLowerCase().replace(/[.!?,]/g, "").trim())) {
      console.log("[STT] Filtered hallucination:", text);
      return NextResponse.json(
        { error: "No speech detected" },
        { status: 422 }
      );
    }

    console.log("[STT] Transcribed:", text);
    return NextResponse.json({ text });
  } catch (error) {
    console.error("[STT] Error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Failed to transcribe audio" },
      { status: 500 }
    );
  }
}
