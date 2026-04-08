# Personal Language Trainer

AI-powered voice conversation app for practicing English with AI friends.

## Architecture

```
Browser Mic → VAD (silence detection) → API /stt (Groq Whisper) → API /chat (Groq GPT-OSS-120B) → API /tts (Groq PlayAI TTS) → Browser Audio
```

All AI services run through **Groq API** (single provider, pay-per-use, no subscription).

## Tech Stack

- **Framework**: Next.js (App Router, TypeScript, Tailwind CSS)
- **STT**: Groq Whisper Large v3 Turbo
- **LLM**: Groq GPT-OSS 120B (`openai/gpt-oss-120b`)
- **TTS**: Groq PlayAI TTS (`playai-tts`)
- **Voice Detection**: Custom VAD using Web Audio API AnalyserNode

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Friend selection grid
│   ├── chat/[friendId]/page.tsx    # Voice conversation page
│   └── api/
│       ├── stt/route.ts            # Speech-to-text endpoint
│       ├── chat/route.ts           # LLM conversation endpoint
│       └── tts/route.ts            # Text-to-speech endpoint
├── components/
│   ├── FriendCard.tsx              # Friend selection card
│   ├── VoiceChat.tsx               # Main voice conversation component
│   ├── ChatBubble.tsx              # Message bubble
│   └── MicIndicator.tsx            # Mic status & volume visualization
├── hooks/
│   └── useVoiceRecorder.ts         # Custom VAD hook (silence detection)
├── lib/
│   ├── groq.ts                     # Groq client singleton & model constants
│   └── friends.ts                  # Friend personality definitions
└── types/
    └── index.ts                    # Shared TypeScript types
```

## Models & Voices

Models are configured in `src/lib/groq.ts`. Change constants to swap models.

Friend personalities and voice assignments are in `src/lib/friends.ts`. Each friend maps to a PlayAI voice ID.

**PlayAI voices**: Fritz, Celeste, Atlas, Indigo, Chip, Gail (all with `-PlayAI` suffix)

## Conversation Flow

1. User picks a friend → enters chat page
2. Clicks "Start Conversation" → mic activates
3. Custom VAD monitors audio volume via AnalyserNode
4. When speech detected followed by 1.5s silence → audio blob sent to /api/stt
5. Transcribed text → /api/chat with friend's personality prompt + conversation history
6. Response text → /api/tts with friend's voice
7. Audio plays → mic resumes when playback ends

## Key Decisions

- **Groq-only stack**: Cheapest option (~$5/mo personal use). All API calls go to Groq.
- **PlayAI TTS over Orpheus**: PlayAI has more voices, no character limit, and is the recommended model on Groq.
- **Custom VAD over @ricky0123/vad-web**: Avoids ONNX runtime dependency. Simple volume threshold + silence timer. Good enough for v1.
- **No conversation persistence**: Messages live in React state only. Reset on page refresh. Add localStorage or DB later if needed.
- **Short responses (max 200 tokens)**: Friends respond in 1-3 sentences to keep conversation natural and TTS fast.
- **20-message context window**: Only last 20 messages sent to LLM to manage token costs.

## Environment Variables

```
GROQ_API_KEY=   # Required. Get from https://console.groq.com/keys
```

## Commands

```bash
npm run dev     # Start development server
npm run build   # Production build
npm run lint    # Run ESLint
```

## Security Notes

- GROQ_API_KEY is server-side only (used in API routes, never exposed to browser)
- No user data is stored or transmitted beyond the Groq API calls
- Audio is processed in-memory and not persisted
- .env files are gitignored

## Future Improvements

- [ ] Conversation history persistence (localStorage)
- [ ] Voice Activity Detection upgrade (Silero VAD for better accuracy)
- [ ] Streaming TTS for lower latency
- [ ] Multiple language support
- [ ] Friend personality customization
- [ ] Usage tracking / cost dashboard
