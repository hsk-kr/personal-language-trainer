"use client";

import { ConversationStatus } from "@/types";

interface MicIndicatorProps {
  readonly status: ConversationStatus;
  readonly volume: number;
  readonly gradient: string;
}

const STATUS_LABELS: Record<ConversationStatus, string> = {
  idle: "Tap to start",
  listening: "Listening...",
  "detecting-speech": "Listening...",
  speaking: "Speaking...",
  processing: "Thinking...",
  error: "Something went wrong",
};

export function MicIndicator({ status, volume, gradient }: MicIndicatorProps) {
  const isActive = status === "listening" || status === "detecting-speech";
  const normalizedVolume = Math.min(volume / 50, 1);
  const scale = isActive ? 1 + normalizedVolume * 0.3 : 1;
  const ringScale = isActive ? 1 + normalizedVolume * 0.5 : 1;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative flex items-center justify-center">
        {/* Pulse rings */}
        {isActive && (
          <>
            <div
              className={`absolute h-24 w-24 rounded-full bg-gradient-to-r ${gradient} opacity-20 transition-transform duration-150`}
              style={{ transform: `scale(${ringScale})` }}
            />
            <div
              className={`absolute h-20 w-20 rounded-full bg-gradient-to-r ${gradient} opacity-10 transition-transform duration-200`}
              style={{ transform: `scale(${ringScale * 1.2})` }}
            />
          </>
        )}

        {/* Main circle */}
        <div
          className={`relative flex h-16 w-16 items-center justify-center rounded-full transition-all duration-150 ${
            status === "processing"
              ? "animate-pulse bg-neutral-700"
              : status === "speaking"
                ? `bg-gradient-to-r ${gradient} animate-pulse`
                : status === "error"
                  ? "bg-red-600"
                  : `bg-gradient-to-r ${gradient}`
          }`}
          style={{
            transform: `scale(${scale})`,
          }}
        >
          {status === "processing" ? (
            <svg
              className="h-6 w-6 animate-spin text-white"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : status === "speaking" ? (
            <SpeakingIcon />
          ) : (
            <MicIcon />
          )}
        </div>
      </div>

      <span className="text-xs font-medium text-neutral-400">
        {STATUS_LABELS[status] ?? STATUS_LABELS.idle}
      </span>
    </div>
  );
}

function MicIcon() {
  return (
    <svg
      className="h-6 w-6 text-white"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"
      />
    </svg>
  );
}

function SpeakingIcon() {
  return (
    <svg
      className="h-6 w-6 text-white"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M12 12h.01"
      />
    </svg>
  );
}
