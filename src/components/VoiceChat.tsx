"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Friend, Message, ConversationStatus } from "@/types";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { ChatBubble } from "./ChatBubble";
import { MicIndicator } from "./MicIndicator";

interface VoiceChatProps {
  readonly friend: Friend;
}

export function VoiceChat({ friend }: VoiceChatProps) {
  const [messages, setMessages] = useState<readonly Message[]>([]);
  const [status, setStatus] = useState<ConversationStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesRef = useRef<readonly Message[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }, 100);
  }, []);

  const addMessage = useCallback(
    (role: "user" | "assistant", content: string): Message => {
      const msg: Message = {
        id: crypto.randomUUID(),
        role,
        content,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, msg]);
      scrollToBottom();
      return msg;
    },
    [scrollToBottom]
  );

  const processConversation = useCallback(
    async (audioBlob: Blob) => {
      recorder.stop();
      setStatus("processing");
      setError(null);

      try {
        // Step 1: Speech-to-Text
        const sttFormData = new FormData();
        sttFormData.append(
          "audio",
          audioBlob,
          "recording.webm"
        );

        const sttRes = await fetch("/api/stt", {
          method: "POST",
          body: sttFormData,
        });

        if (!sttRes.ok) {
          const sttErr = await sttRes.json();
          throw new Error(sttErr.error || "STT failed");
        }

        const { text: userText } = await sttRes.json();
        addMessage("user", userText);

        // Step 2: Chat
        const chatRes = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            friendId: friend.id,
            messages: messagesRef.current,
            userMessage: userText,
          }),
        });

        if (!chatRes.ok) {
          const chatErr = await chatRes.json();
          throw new Error(chatErr.error || "Chat failed");
        }

        const { text: responseText } = await chatRes.json();
        addMessage("assistant", responseText);

        // Step 3: Text-to-Speech
        setStatus("speaking");
        const ttsRes = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: responseText,
            voice: friend.voice,
          }),
        });

        if (!ttsRes.ok) {
          throw new Error("TTS failed");
        }

        const audioBuffer = await ttsRes.arrayBuffer();
        const audioBlob2 = new Blob([audioBuffer], { type: "audio/wav" });
        const audioUrl = URL.createObjectURL(audioBlob2);

        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        await new Promise<void>((resolve, reject) => {
          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            resolve();
          };
          audio.onerror = () => {
            URL.revokeObjectURL(audioUrl);
            reject(new Error("Audio playback failed"));
          };
          audio.play().catch(reject);
        });

        // Resume listening
        setStatus("listening");
        recorder.start();
      } catch (err) {
        console.error("Conversation error:", err);
        setError(err instanceof Error ? err.message : "Something went wrong");
        setStatus("error");

        // Auto-recover after 2 seconds
        setTimeout(() => {
          setStatus("listening");
          setError(null);
          recorder.start();
        }, 2000);
      }
    },
    [friend.id, friend.voice, addMessage]
  );

  const recorder = useVoiceRecorder({
    onSpeechEnd: processConversation,
    silenceThreshold: 12,
    silenceTimeout: 1500,
  });

  const handleStartChat = useCallback(() => {
    setStatus("listening");
    recorder.start();
  }, [recorder]);

  const handleStopChat = useCallback(() => {
    recorder.stop();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setStatus("idle");
  }, [recorder]);

  useEffect(() => {
    return () => {
      recorder.stop();
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [recorder]);

  const displayStatus: ConversationStatus =
    status === "listening" || status === "idle" || status === "error"
      ? status
      : status === "processing"
        ? "processing"
        : status === "speaking"
          ? "speaking"
          : recorder.status === "detecting-speech"
            ? "detecting-speech"
            : status;

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
      >
        {messages.length === 0 && status === "idle" && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mb-4 text-6xl">{friend.emoji}</div>
              <h2 className="mb-2 text-xl font-bold text-white">
                {friend.name}
              </h2>
              <p className="mb-6 text-sm text-neutral-400">
                {friend.description}
              </p>
              <button
                onClick={handleStartChat}
                className={`rounded-full bg-gradient-to-r ${friend.gradient} px-8 py-3 text-sm font-semibold text-white transition-transform hover:scale-105`}
              >
                Start Conversation
              </button>
            </div>
          </div>
        )}

        {messages.length === 0 && status !== "idle" && (
          <div className="flex h-32 items-center justify-center">
            <p className="text-sm text-neutral-500">
              Say something to {friend.name}!
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <ChatBubble
            key={msg.id}
            message={msg}
            friendName={friend.name}
            friendEmoji={friend.emoji}
          />
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-4 mb-2 rounded-lg bg-red-900/30 px-4 py-2 text-center text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Mic indicator */}
      {status !== "idle" && (
        <div className="border-t border-white/5 bg-neutral-900/50 px-4 py-6">
          <div className="flex items-center justify-center gap-6">
            <MicIndicator
              status={displayStatus}
              volume={recorder.volume}
              gradient={friend.gradient}
            />
            <button
              onClick={handleStopChat}
              className="rounded-full bg-neutral-800 p-3 text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-white"
              title="End conversation"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
