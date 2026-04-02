import type { AIProvider } from "@/lib/ai/types";
import { geminiProvider } from "@/lib/ai/providers/gemini";
import { ollamaProvider } from "@/lib/ai/providers/ollama";
import { openaiProvider } from "@/lib/ai/providers/openai";

export function getAIProvider(provider: string): AIProvider {
  const selected = provider.toLowerCase();
  if (selected === "ollama") return ollamaProvider;
  if (selected === "openai") return openaiProvider;
  if (selected === "gemini") return geminiProvider;
  throw new Error(`Unknown AI provider: "${provider}"`);
}
