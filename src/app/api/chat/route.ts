import { getGroqClient, CHAT_MODEL } from "@/lib/groq";
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

    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        {
          role: "system",
          content: friend.personality,
        },
        ...messages.slice(-20).map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user", content: userMessage },
      ],
      temperature: 0.85,
      max_completion_tokens: 200,
    });

    const text = completion.choices[0]?.message?.content?.trim() ?? "";

    return NextResponse.json({ text });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
