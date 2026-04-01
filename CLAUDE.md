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

**Three modes** defined in `src/constants/analysis.ts`: `video`, `coding`, `certification` — each with its own system prompt.

**Server proxy:** `src/app/api/analyze/route.ts` protects API keys server-side.

## Environment

Copy `.env.example` to `.env.local`. Required: `GEMINI_API_KEY`. Optional: `AI_PROVIDER` (gemini|ollama), `OLLAMA_BASE_URL`, `ANALYSIS_INTERVAL_MS`.
