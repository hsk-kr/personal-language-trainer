"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Friend, Message, ConversationStatus } from "@/types";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { ChatBubble } from "./ChatBubble";
import { MicIndicator } from "./MicIndicator";
import { playBeep } from "@/lib/beep";

interface VoiceChatProps {
  readonly friend: Friend;
}

export function VoiceChat({ friend }: VoiceChatProps) {
  const [messages, setMessages] = useState<readonly Message[]>([]);
  const [status, setStatus] = useState<ConversationStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const audioEnabledRef = useRef(false);
  const [manualMode, setManualMode] = useState(false);
  const manualModeRef = useRef(false);
  const manualChunksRef = useRef<Blob[]>([]);
  const manualRecorderRef = useRef<MediaRecorder | null>(null);
  const manualStreamRef = useRef<MediaStream | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesRef = useRef<readonly Message[]>([]);
  const recorderRef = useRef<{
    start: () => Promise<void>;
    stop: () => void;
  }>({ start: async () => {}, stop: () => {} });

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    audioEnabledRef.current = audioEnabled;
  }, [audioEnabled]);

  useEffect(() => {
    manualModeRef.current = manualMode;
  }, [manualMode]);

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

  const playAudio = useCallback(async (audioBuffer: ArrayBuffer) => {
    const blob = new Blob([audioBuffer], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audioRef.current = audio;

    await new Promise<void>((resolve, reject) => {
      audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
      audio.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Audio playback failed")); };
      audio.play().catch(reject);
    });
  }, []);

  const processConversation = useCallback(
    async (audioBlob: Blob) => {
      console.log("[VoiceChat] onSpeechEnd fired, blob size:", audioBlob.size);
      recorderRef.current.stop();
      setStatus("processing");
      setError(null);

      try {
        // Step 1: Speech-to-Text
        const sttFormData = new FormData();
        sttFormData.append("audio", audioBlob, "recording.webm");

        console.log("[VoiceChat] Sending to STT...");
        const sttRes = await fetch("/api/stt", {
          method: "POST",
          body: sttFormData,
        });

        if (!sttRes.ok) {
          const sttErr = await sttRes.json();
          throw new Error(sttErr.error || "STT failed");
        }

        const { text: userText } = await sttRes.json();
        console.log("[VoiceChat] STT result:", userText);
        addMessage("user", userText);

        // Step 2: Chat
        console.log("[VoiceChat] Sending to Chat...");
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
        console.log("[VoiceChat] Chat response:", responseText);
        addMessage("assistant", responseText);

        // Step 3: Text-to-Speech (only if audio enabled)
        if (audioEnabledRef.current) {
          setStatus("speaking");
          console.log("[VoiceChat] Sending to TTS...");
          try {
            const ttsRes = await fetch("/api/tts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                text: responseText,
                friendId: friend.id,
              }),
            });

            if (ttsRes.ok) {
              await playAudio(await ttsRes.arrayBuffer());
            } else {
              console.warn("[VoiceChat] TTS failed:", ttsRes.status, await ttsRes.text());
            }
          } catch (ttsErr) {
            console.warn("[VoiceChat] TTS error (skipping audio):", ttsErr);
          }
          await new Promise((r) => setTimeout(r, 500));
        }
        playBeep();
        console.log("[VoiceChat] Resuming mic...");
        setStatus("listening");
        if (!manualModeRef.current) {
          recorderRef.current.start();
        } else {
          startManualRecording();
        }
      } catch (err) {
        console.error("[VoiceChat] Error:", err);
        setError(err instanceof Error ? err.message : "Something went wrong");
        setStatus("error");

        setTimeout(() => {
          setStatus("listening");
          setError(null);
          if (!manualModeRef.current) {
            recorderRef.current.start();
          } else {
            startManualRecording();
          }
        }, 2000);
      }
    },
    [friend.id, friend.voice, addMessage, playAudio]
  );

  const recorder = useVoiceRecorder({
    onSpeechEnd: processConversation,
    silenceThreshold: 10,
    silenceTimeout: 1500,
  });

  // Keep ref in sync — breaks circular dependency
  recorderRef.current = { start: recorder.start, stop: recorder.stop };

  const startManualRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      manualStreamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const mr = new MediaRecorder(stream, { mimeType });
      manualRecorderRef.current = mr;
      manualChunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) manualChunksRef.current.push(e.data);
      };

      mr.start(200);
    } catch (err) {
      console.error("Manual mic failed:", err);
    }
  }, []);

  const stopManualRecording = useCallback(() => {
    if (!manualRecorderRef.current || manualRecorderRef.current.state === "inactive") return;

    manualRecorderRef.current.onstop = () => {
      const blob = new Blob(manualChunksRef.current, { type: "audio/webm" });
      manualChunksRef.current = [];
      manualStreamRef.current?.getTracks().forEach((t) => t.stop());
      manualStreamRef.current = null;
      manualRecorderRef.current = null;

      if (blob.size > 1000) {
        processConversation(blob);
      }
    };

    manualRecorderRef.current.stop();
  }, [processConversation]);

  const stopManualRecordingSilently = useCallback(() => {
    if (manualRecorderRef.current && manualRecorderRef.current.state !== "inactive") {
      manualRecorderRef.current.onstop = null;
      manualRecorderRef.current.stop();
    }
    manualStreamRef.current?.getTracks().forEach((t) => t.stop());
    manualStreamRef.current = null;
    manualRecorderRef.current = null;
    manualChunksRef.current = [];
  }, []);

  // Spacebar to stop recording in manual mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && manualModeRef.current && status === "listening") {
        e.preventDefault();
        stopManualRecording();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [status, stopManualRecording]);

  const handleStartChat = useCallback(async () => {
    setStatus("processing");
    setError(null);

    try {
      // Friend greets first — like a real human
      const chatRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          friendId: friend.id,
          messages: [],
          userMessage: "[The user just joined. Greet them naturally — short and casual, like a friend who's happy to see them.]",
        }),
      });

      if (!chatRes.ok) throw new Error("Greeting failed");
      const { text: greeting } = await chatRes.json();
      addMessage("assistant", greeting);

      // Speak the greeting (only if audio enabled)
      if (audioEnabledRef.current) {
        setStatus("speaking");
        const ttsRes = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: greeting, friendId: friend.id }),
        });

        if (ttsRes.ok) {
          await playAudio(await ttsRes.arrayBuffer());
        }
      }

      // Now start listening
      setStatus("listening");
      if (manualModeRef.current) {
        startManualRecording();
      } else {
        recorderRef.current.start();
      }
    } catch (err) {
      console.error("[VoiceChat] Greeting error:", err);
      setStatus("listening");
      if (manualModeRef.current) {
        startManualRecording();
      } else {
        recorderRef.current.start();
      }
    }
  }, [friend.id, friend.voice, addMessage, playAudio, startManualRecording]);

  const handleStopChat = useCallback(() => {
    recorderRef.current.stop();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setStatus("idle");
  }, []);

  useEffect(() => {
    return () => {
      recorderRef.current.stop();
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const displayStatus: ConversationStatus =
    status === "listening" && recorder.status === "detecting-speech"
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

      {/* Controls */}
      {status !== "idle" && (
        <div className="border-t border-white/5 bg-neutral-900/50 px-4 py-6">
          <div className="flex items-center justify-center gap-4">
            {/* Manual mode: send button */}
            {manualMode && status === "listening" && (
              <button
                onClick={stopManualRecording}
                className={`rounded-full bg-gradient-to-r ${friend.gradient} p-4 text-white transition-transform hover:scale-105`}
                title="Send (or press Space)"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            )}

            {/* Auto mode: mic indicator */}
            {!manualMode && (
              <MicIndicator
                status={displayStatus}
                volume={recorder.volume}
                gradient={friend.gradient}
              />
            )}

            {/* Manual mode indicator */}
            {manualMode && status === "listening" && (
              <div className="flex flex-col items-center gap-1">
                <div className={`h-3 w-3 rounded-full bg-red-500 animate-pulse`} />
                <span className="text-xs text-neutral-400">Recording... press Space to send</span>
              </div>
            )}

            {/* Mode toggle: auto/manual */}
            <button
              onClick={() => {
                const next = !manualMode;
                setManualMode(next);
                if (status === "listening") {
                  if (next) {
                    recorderRef.current.stop();
                    startManualRecording();
                  } else {
                    stopManualRecordingSilently();
                    recorderRef.current.start();
                  }
                }
              }}
              className={`rounded-full p-3 transition-colors ${
                manualMode
                  ? "bg-amber-600 text-white"
                  : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white"
              }`}
              title={manualMode ? "Manual mode (press Space to send)" : "Auto mode (auto-detect speech)"}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {manualMode ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4M16 17H4m0 0l4 4m-4-4l4-4" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                )}
              </svg>
            </button>

            {/* Audio toggle */}
            <button
              onClick={() => setAudioEnabled((v) => !v)}
              className={`rounded-full p-3 transition-colors ${
                audioEnabled
                  ? "bg-blue-600 text-white"
                  : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white"
              }`}
              title={audioEnabled ? "Disable voice" : "Enable voice"}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {audioEnabled ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M11 5L6 9H2v6h4l5 4V5z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707A1 1 0 0112 5v14a1 1 0 01-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                )}
              </svg>
            </button>

            {/* End conversation */}
            <button
              onClick={handleStopChat}
              className="rounded-full bg-neutral-800 p-3 text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-white"
              title="End conversation"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {/* Debug: show volume level (dev only) */}
          {process.env.NODE_ENV === "development" && (
            <div className="mt-2 text-center text-xs text-neutral-600">
              vol: {Math.round(recorder.volume)} | mode: {manualMode ? "manual" : "auto"} | status: {recorder.status}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
