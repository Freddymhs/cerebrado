import type { AIProvider, AnalysisResult } from "@/lib/ai/types";

const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const VISION_MODEL = process.env.OLLAMA_MODEL ?? "moondream";
const TEXT_MODEL = process.env.OLLAMA_TEXT_MODEL ?? VISION_MODEL;

export const ollamaProvider: AIProvider = {
  async analyzeScreen(
    imageBase64: string,
    context: string
  ): Promise<AnalysisResult> {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: VISION_MODEL,
        prompt: context,
        images: [imageBase64],
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.statusText}`);
    }

    const data = (await response.json()) as { response: string };
    return parseResponse(data.response);
  },

  async analyzeText(text: string, context: string): Promise<AnalysisResult> {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: TEXT_MODEL,
        prompt: `${context}\n\nContent to analyze:\n${text}`,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.statusText}`);
    }

    const data = (await response.json()) as { response: string };
    return parseResponse(data.response);
  },
};

function parseResponse(rawText: string): AnalysisResult {
  try {
    const clean = rawText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return {
      summary: parsed.summary ?? "No summary",
      insights: Array.isArray(parsed.insights) ? parsed.insights : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      mode: "coding",
    };
  } catch {
    return {
      summary: rawText.substring(0, 200),
      insights: [],
      suggestions: [],
      mode: "coding",
    };
  }
}
