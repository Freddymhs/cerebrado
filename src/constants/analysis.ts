import type { AnalysisMode, AIProviderRateLimit } from "@/lib/ai/types";

export const DEFAULT_ANALYSIS_INTERVAL_MS = 3000;

// ─────────────────────────────────────────────────────────────────────────────
// AI PROVIDER RATE LIMITS
// Add a new entry here when integrating a new provider.
// The key matches the AI_PROVIDER env var + optional tier suffix.
// ─────────────────────────────────────────────────────────────────────────────
export const PROVIDER_RATE_LIMITS: Record<string, AIProviderRateLimit> = {
  gemini_free: {
    requestsPerMinute: 5,
    requestsPerDay: 1500,
    tier: "free",
    description: "Gemini 2.5 Flash — Free Tier (Google AI Studio)",
  },
  gemini_paid: {
    requestsPerMinute: 60,
    tier: "paid",
    description: "Gemini 2.5 Flash — Pay-as-you-go (Google Cloud)",
  },
  ollama: {
    requestsPerMinute: Infinity,
    tier: "local",
    description: "Ollama — Local model, no external rate limit",
  },
  openai_tier1: {
    requestsPerMinute: 500,
    requestsPerDay: 10_000,
    tier: "paid",
    description: "OpenAI gpt-4o-mini — Tier 1",
  },
  openai_tier2: {
    requestsPerMinute: 5000,
    tier: "paid",
    description: "OpenAI gpt-4o-mini — Tier 2+",
  },
  // ── Add future providers below ──────────────────────────────────────────
  // anthropic: { requestsPerMinute: 50, tier: "paid", description: "..." },
};

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVE RATE LIMIT — set via NEXT_PUBLIC_AI_PROVIDER_TIER in .env.local
// e.g. NEXT_PUBLIC_AI_PROVIDER_TIER=gemini_free
// ─────────────────────────────────────────────────────────────────────────────
const ACTIVE_TIER_KEY =
  process.env.NEXT_PUBLIC_AI_PROVIDER_TIER ?? "gemini_free";

export const ACTIVE_RATE_LIMIT: AIProviderRateLimit =
  PROVIDER_RATE_LIMITS[ACTIVE_TIER_KEY] ?? PROVIDER_RATE_LIMITS.gemini_free;

/** Minimum safe interval in ms derived from the active provider's rate limit */
export const MIN_SAFE_INTERVAL_MS =
  ACTIVE_RATE_LIMIT.requestsPerMinute === Infinity
    ? DEFAULT_ANALYSIS_INTERVAL_MS
    : Math.ceil(60_000 / ACTIVE_RATE_LIMIT.requestsPerMinute);

/** Effective interval: respects both user config and provider rate limit */
export function getAnalysisInterval(): number {
  const envInterval = process.env.NEXT_PUBLIC_ANALYSIS_INTERVAL_MS;
  const userInterval = envInterval ? parseInt(envInterval, 10) : NaN;
  const requested = isNaN(userInterval) ? DEFAULT_ANALYSIS_INTERVAL_MS : userInterval;
  return Math.max(requested, MIN_SAFE_INTERVAL_MS);
}

export const ANALYSIS_MODES: readonly AnalysisMode[] = [
  "video",
  "coding",
  "certification",
] as const;

export const MODE_PROMPTS: Record<AnalysisMode, string> = {
  video:
    "Estas viendo mi pantalla. Resume lo que explica el video y destaca los conceptos clave de software/arquitectura.",
  coding:
    "Analiza el codigo visible. Identifica patrones, posibles mejoras de arquitectura, y codigo que no sigue buenas practicas.",
  certification:
    "Veo que estoy estudiando para una certificacion. Explica los conceptos que aparecen en pantalla para que los entienda profundamente.",
};

export const MODE_LABELS: Record<AnalysisMode, string> = {
  video: "Video",
  coding: "Coding",
  certification: "Certificacion",
};
