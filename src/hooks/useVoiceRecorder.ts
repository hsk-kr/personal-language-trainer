"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface VoiceRecorderOptions {
  readonly onSpeechEnd: (audioBlob: Blob) => void;
  readonly silenceThreshold?: number;
  readonly silenceTimeout?: number;
}

interface VoiceRecorderState {
  readonly status: "idle" | "listening" | "detecting-speech";
  readonly volume: number;
  readonly start: () => Promise<void>;
  readonly stop: () => void;
}

export function useVoiceRecorder(
  options: VoiceRecorderOptions
): VoiceRecorderState {
  const {
    onSpeechEnd,
    silenceThreshold = 12,
    silenceTimeout = 1500,
  } = options;

  const [status, setStatus] = useState<"idle" | "listening" | "detecting-speech">("idle");
  const [volume, setVolume] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasSpeechRef = useRef(false);
  const rafRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const onSpeechEndRef = useRef(onSpeechEnd);

  useEffect(() => {
    onSpeechEndRef.current = onSpeechEnd;
  }, [onSpeechEnd]);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    clearSilenceTimer();

    if (recorderRef.current?.state !== "inactive") {
      recorderRef.current?.stop();
    }
    if (contextRef.current?.state !== "closed") {
      contextRef.current?.close().catch(() => {});
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());

    recorderRef.current = null;
    contextRef.current = null;
    analyserRef.current = null;
    streamRef.current = null;
    chunksRef.current = [];
    hasSpeechRef.current = false;

    setStatus("idle");
    setVolume(0);
  }, [clearSilenceTimer]);

  const start = useCallback(async () => {
    stop();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;

      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.85;
      ctx.createMediaStreamSource(stream).connect(analyser);
      contextRef.current = ctx;
      analyserRef.current = analyser;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start(200);
      setStatus("listening");

      const buf = new Uint8Array(analyser.frequencyBinCount);

      let lastLogTime = 0;

      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(buf);
        const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
        setVolume(avg);

        // Debug log every 2 seconds
        const now = Date.now();
        if (now - lastLogTime > 2000) {
          console.log(`[VAD] volume: ${avg.toFixed(1)}, threshold: ${silenceThreshold}, speaking: ${hasSpeechRef.current}, chunks: ${chunksRef.current.length}`);
          lastLogTime = now;
        }

        if (avg > silenceThreshold) {
          if (!hasSpeechRef.current) {
            console.log("[VAD] Speech detected! volume:", avg.toFixed(1));
          }
          hasSpeechRef.current = true;
          setStatus("detecting-speech");
          clearSilenceTimer();
        } else if (hasSpeechRef.current && !silenceTimerRef.current) {
          console.log("[VAD] Silence detected, starting timer...");
          silenceTimerRef.current = setTimeout(() => {
            hasSpeechRef.current = false;
            setStatus("listening");
            silenceTimerRef.current = null;

            const blob = new Blob(chunksRef.current, { type: mimeType });
            chunksRef.current = [];

            console.log("[VAD] Speech ended, blob size:", blob.size);
            if (blob.size > 1000) {
              onSpeechEndRef.current(blob);
            } else {
              console.log("[VAD] Blob too small, ignoring");
            }
          }, silenceTimeout);
        }

        rafRef.current = requestAnimationFrame(tick);
      };

      console.log("[VAD] Started, threshold:", silenceThreshold);
      tick();
    } catch (err) {
      console.error("Microphone access denied:", err);
      setStatus("idle");
    }
  }, [stop, silenceThreshold, silenceTimeout, clearSilenceTimer]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      clearSilenceTimer();
      if (recorderRef.current?.state !== "inactive") {
        recorderRef.current?.stop();
      }
      if (contextRef.current?.state !== "closed") {
      contextRef.current?.close().catch(() => {});
    }
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [clearSilenceTimer]);

  return { status, volume, start, stop };
}
