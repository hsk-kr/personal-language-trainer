import { CHAT_MODEL } from "@/lib/groq";
import { getFriendById } from "@/lib/friends";
import { NextRequest, NextResponse } from "next/server";

interface ChatMessage {
  readonly role: "user" | "assistant";
  readonly content: string;
}

interface ChatRequestBody {
  readonly friendId: string;
  readonly messages: readonly ChatMessage[];
  readonly userMessage: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequestBody = await request.json();
    const { friendId, messages, userMessage } = body;

    if (!friendId || typeof friendId !== "string" || friendId.length > 50) {
      return NextResponse.json(
        { error: "Invalid friendId" },
        { status: 400 }
      );
    }

    if (!userMessage || typeof userMessage !== "string" || userMessage.length > 2000) {
      return NextResponse.json(
        { error: "Invalid or missing userMessage" },
        { status: 400 }
      );
    }

    const friend = getFriendById(friendId);
    if (!friend) {
      return NextResponse.json(
        { error: "Friend not found" },
        { status: 404 }
      );
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY not set" },
        { status: 500 }
      );
    }

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: CHAT_MODEL,
          messages: [
            { role: "system", content: friend.personality + "\n\nIMPORTANT RULES:\n1. Your response will be read aloud by a text-to-speech engine. NEVER use markdown, asterisks, bullet points, emojis, or any special formatting. Write plain conversational text only. Use quotation marks for quoting words.\n2. Speak naturally and conversationally — like a real human talking, not writing. Use contractions (I'm, don't, can't, gonna, wanna). Use filler words occasionally (like, well, I mean, you know). React naturally with expressions (oh, wow, huh, hmm, right). Sound like a real person, not an AI.\n3. ALWAYS respond in English. Even if the user speaks in another language, reply in English only. If their message seems like a non-English transcription error, just say something like 'Hey, I didn't quite catch that, could you say it again in English?'" },
            ...messages.slice(-20).map((m) => ({
              role: m.role,
              content: m.content,
            })),
            { role: "user", content: userMessage },
          ],
          temperature: 0.85,
          max_completion_tokens: 512,
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("[Chat] Groq error:", response.status, errorBody);
      return NextResponse.json(
        { error: `Chat failed: ${response.status}` },
        { status: 502 }
      );
    }

    const result = await response.json();
    let text = result.choices?.[0]?.message?.content?.trim() ?? "";

    // If response was cut off mid-sentence, add ellipsis
    const finishReason = result.choices?.[0]?.finish_reason;
    if (finishReason === "length" && text && !/[.!?]$/.test(text)) {
      // Trim to last complete sentence
      const lastSentenceEnd = Math.max(
        text.lastIndexOf(". "),
        text.lastIndexOf("! "),
        text.lastIndexOf("? ")
      );
      if (lastSentenceEnd > text.length * 0.3) {
        text = text.substring(0, lastSentenceEnd + 1);
      }
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error("[Chat] Error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
