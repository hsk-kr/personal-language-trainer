import { getGroqClient, STT_MODEL } from "@/lib/groq";
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

    const groq = getGroqClient();
    const transcription = await groq.audio.transcriptions.create({
      model: STT_MODEL,
      file: audioFile,
      language: "en",
      response_format: "json",
    });

    const text = transcription.text?.trim();
    if (!text) {
      return NextResponse.json(
        { error: "No speech detected" },
        { status: 422 }
      );
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error("STT error:", error);
    return NextResponse.json(
      { error: "Failed to transcribe audio" },
      { status: 500 }
    );
  }
}
