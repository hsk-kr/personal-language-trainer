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

    if (!friendId || !userMessage) {
      return NextResponse.json(
        { error: "Missing friendId or userMessage" },
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
            { role: "system", content: friend.personality + "\n\nIMPORTANT: Your response will be read aloud by a text-to-speech engine. NEVER use markdown, asterisks, bullet points, emojis, or any special formatting. Write plain conversational text only. Use quotation marks for quoting words." },
            ...messages.slice(-20).map((m) => ({
              role: m.role,
              content: m.content,
            })),
            { role: "user", content: userMessage },
          ],
          temperature: 0.85,
          max_completion_tokens: 200,
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
    const text = result.choices?.[0]?.message?.content?.trim() ?? "";

    return NextResponse.json({ text });
  } catch (error) {
    console.error("[Chat] Error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
