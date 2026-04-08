# Personal Language Trainer

Practice English naturally by chatting with AI friends who have unique personalities and voices. No subscriptions — just pay-per-use API costs (~$5/mo for daily use).

## How It Works

Pick a friend, start talking. Your mic stays on, and when you pause, your speech gets transcribed, your friend thinks of a response, and speaks it back to you. Like a real conversation.

```
You speak → Whisper STT → GPT-OSS-120B → PlayAI TTS → Friend speaks back
```

## Friends

| Friend | Personality | Vibe |
|--------|------------|------|
| Jake | Gaming buddy & tech bro | Chill, slang, memes |
| Mia | World traveler & storyteller | Energetic, curious |
| Sam | Deep thinker & debater | Calm, thought-provoking |
| Luna | Creative soul & dreamer | Warm, empathetic |
| Alex | Class clown & roast master | Sarcastic, hilarious |
| Emma | Supportive bestie & hype woman | Encouraging, positive |

## Setup

1. Get a Groq API key from [console.groq.com](https://console.groq.com/keys)

2. Create `.env.local`:
   ```
   GROQ_API_KEY=your_key_here
   ```

3. Install and run:
   ```bash
   npm install
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

## Tech Stack

- **Next.js** (App Router, TypeScript, Tailwind CSS)
- **Groq API** — all AI services through one provider:
  - STT: Whisper Large v3 Turbo
  - LLM: GPT-OSS 120B
  - TTS: PlayAI TTS

## Cost

All Groq, pay-per-use. No subscriptions.

| Service | Rate | ~Monthly (10 min/day) |
|---------|------|----------------------|
| STT (Whisper) | $0.04/hr | ~$0.20 |
| LLM (GPT-OSS-120B) | $0.15-0.60/M tokens | ~$1.20 |
| TTS (PlayAI) | $22/M chars | ~$3.30 |
| **Total** | | **~$4.70** |

