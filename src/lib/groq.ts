import Groq from "groq-sdk";

let client: Groq | null = null;

export function getGroqClient(): Groq {
  if (client) return client;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY is not set. Add it to your .env.local file."
    );
  }

  client = new Groq({ apiKey });
  return client;
}

export const TTS_MODEL = "playai-tts";
export const STT_MODEL = "whisper-large-v3-turbo";
export const CHAT_MODEL = "openai/gpt-oss-120b";
