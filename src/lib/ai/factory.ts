import type { AIProvider } from "@/lib/ai/types";
import { geminiProvider } from "@/lib/ai/providers/gemini";
import { ollamaProvider } from "@/lib/ai/providers/ollama";

const AI_PROVIDER = (process.env.AI_PROVIDER || "gemini").toLowerCase();

export function getAIProvider(): AIProvider {
  if (AI_PROVIDER === "ollama") {
    return ollamaProvider;
  }
  return geminiProvider;
}
