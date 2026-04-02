import type { AIProvider } from "@/lib/ai/types";
import { geminiProvider } from "@/lib/ai/providers/gemini";
import { ollamaProvider } from "@/lib/ai/providers/ollama";
import { openaiProvider } from "@/lib/ai/providers/openai";

const DEFAULT_AI_PROVIDER = (process.env.AI_PROVIDER || "gemini").toLowerCase();

export function getAIProvider(overrideProvider?: string): AIProvider {
  const selected = (overrideProvider ?? DEFAULT_AI_PROVIDER).toLowerCase();
  if (selected === "ollama") return ollamaProvider;
  if (selected === "openai") return openaiProvider;
  return geminiProvider;
}
