export interface Friend {
  readonly id: string;
  readonly name: string;
  readonly emoji: string;
  readonly tagline: string;
  readonly description: string;
  readonly personality: string;
  readonly voice: string;
  readonly voiceStyle: string;
  readonly gradient: string;
  readonly bgColor: string;
}

export interface Message {
  readonly id: string;
  readonly role: "user" | "assistant";
  readonly content: string;
  readonly timestamp: number;
}

export type ConversationStatus =
  | "idle"
  | "listening"
  | "detecting-speech"
  | "speaking"
  | "processing"
  | "error";
