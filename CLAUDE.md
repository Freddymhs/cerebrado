# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Cerebrado — Personal AI Learning Companion. Observes the user's screen via browser APIs and provides real-time AI feedback for learning (technical videos, live coding, certification study). See CONCEPTO.md for full architecture research and rationale.

## Commands

```bash
pnpm dev        # Start dev server (Turbopack)
pnpm build      # Production build
pnpm start      # Serve production build
pnpm lint       # ESLint (Next.js core-web-vitals + TypeScript)
```

No test runner configured yet.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript 5 (strict)
- Tailwind CSS 4 via @tailwindcss/postcss
- Gemini 2.5 Flash as primary AI provider (vision-native)
- Import alias: `@/*` → `./src/*`

## Architecture

**AI Provider Abstraction (Strategy Pattern):**
- `src/lib/ai/types.ts` — `AIProvider` interface, `AnalysisResult`, `AnalysisMode`
- `src/lib/ai/providers/` — one file per provider (gemini, ollama)
- `src/lib/ai/factory.ts` — selects provider via `AI_PROVIDER` env var
- Provider swap must require zero changes outside factory

**Analysis Pipeline:**
- Screen capture via `getDisplayMedia()` → Canvas frame extraction → base64 → AI provider
- Web Worker (`src/workers/`) handles analysis off main thread
- Configurable interval (default 3s)

**Four modes** defined in `src/constants/analysis.ts`: `video`, `coding`, `certification`, `entrevista` — each with its own system prompt and interval (`MODE_INTERVALS_MS`). Coding uses manual trigger (`triggerNow`) + slow auto-interval.

**Audio pipeline (Entrevista mode):**
- `src/lib/audio/` — same Strategy Pattern as AI (types → factory → providers)
- Providers: `openai` (Whisper API), `local` (configurable endpoint), `webspeech` (browser mic only)
- `src/hooks/useAudioCapture.ts` — MediaRecorder chunks → `/api/transcribe` → transcript entries
- Transcript compresses to summary at 10 entries to control token growth
- `getDisplayMedia({ audio: true, video: { width:1, height:1 } })` — minimal video required by Chrome to capture system audio

**Server proxy:** `src/app/api/analyze/route.ts` protects API keys server-side. Always injects the real `mode` into the result — providers never set `mode` themselves.

## Rules (learned from corrections)

- **`mode` in `AnalysisResult` comes from the API route, not the provider.** Providers don't know which mode they're running in. The route does `{ ...result, mode: analysisMode }` before returning.
- **When switching `ondataavailable` from accumulate→transcribe-directly, remove all buffer refs** (`chunksRef`, `micChunksRef`) including any `onstop` and cleanup references — dead refs cause build failures.
- **Hooks that fetch APIs must receive the provider as a parameter**, never hardcode it. Even with a default, the caller must be able to override.
- **`setState` inside `useEffect` body is blocked by the linter** (`react-hooks/set-state-in-effect`). Derive state instead (e.g. `const displayError = stream ? error : null`) or move the setState into a callback/event handler.
- **Module-level throws break SSG build** — lazy-init any client that reads env vars (wrap in a getter function that throws at call time, not module load time).

## Environment

Copy `.env.example` to `.env.local`. Required: `GEMINI_API_KEY`. Optional: `OPENAI_API_KEY`, `OPENAI_WHISPER_MODEL`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `LOCAL_TRANSCRIBE_URL`, `NEXT_PUBLIC_ANALYSIS_INTERVAL_MS`.
