# Cerebrado

Personal AI Learning Companion. Observes your screen via browser APIs and provides real-time AI feedback for learning — technical videos, live coding, and certification study.

## Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19
- **Language**: TypeScript 5 (strict)
- **Styling**: Tailwind CSS 4
- **AI Provider**: Gemini 2.5 Flash (vision-native), Ollama as alternative
- **Package Manager**: pnpm

## Setup

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local
# Required: GEMINI_API_KEY
# Optional: AI_PROVIDER (gemini|ollama), OLLAMA_BASE_URL, ANALYSIS_INTERVAL_MS

# Start dev server
pnpm dev
```

## Commands

```bash
pnpm dev        # Dev server (Turbopack)
pnpm build      # Production build
pnpm start      # Serve production build
pnpm lint       # ESLint
```

## Structure

```
src/
├── app/          # App Router pages + API routes
│   └── api/analyze/
├── components/   # React components
├── constants/    # Domain constants (analysis modes)
├── hooks/        # Custom React hooks
├── lib/ai/       # AI provider abstraction (Strategy Pattern)
│   ├── types.ts
│   ├── factory.ts
│   └── providers/
└── workers/      # Web Workers (off-thread analysis)
```

## Architecture

- **AI Provider Abstraction**: Strategy Pattern — swap providers via `AI_PROVIDER` env var, zero changes outside factory
- **Analysis Pipeline**: Screen capture (getDisplayMedia) → Canvas frame extraction → base64 → AI provider
- **Three Modes**: `video`, `coding`, `certification` — each with its own system prompt
- **Server Proxy**: API route protects keys server-side

## Status

- Status: En desarrollo
