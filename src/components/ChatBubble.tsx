"use client";

import { Message } from "@/types";

interface ChatBubbleProps {
  readonly message: Message;
  readonly friendName?: string;
  readonly friendEmoji?: string;
}

export function ChatBubble({ message, friendName, friendEmoji }: ChatBubbleProps) {
  const isUser = message.role === "user";
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div className="mt-1 flex-shrink-0 text-lg">
        {isUser ? "🎤" : friendEmoji ?? "🤖"}
      </div>
      <div className={`max-w-[75%] ${isUser ? "items-end" : "items-start"}`}>
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xs font-medium text-neutral-400">
            {isUser ? "You" : friendName ?? "Friend"}
          </span>
          <span className="text-xs text-neutral-600">{time}</span>
        </div>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? "bg-blue-600 text-white"
              : "bg-neutral-800 text-neutral-200"
          }`}
        >
          {message.content}
        </div>
      </div>
    </div>
  );
}
