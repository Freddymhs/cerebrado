import type { AIProvider, AnalysisResult } from "@/lib/ai/types";

const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const VISION_MODEL = "llava"; // or bakllava for larger context

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
        model: "mistral",
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
  const lines = rawText.split("\n").filter((line) => line.trim());

  const summaryMatch = rawText.match(
    /(?:summary|resumen)[:\s]+([\s\S]*?)(?=insights|suggestion|$)/i
  );
  const insightsMatch = rawText.match(/insights[:\s]+([\s\S]*?)(?=suggestion|$)/i);
  const suggestionsMatch = rawText.match(/suggestion[:\s]+([\s\S]*?)$/i);

  const summary =
    summaryMatch?.[1]?.trim() ||
    lines.slice(0, 2).join(" ") ||
    "Analysis completed";
  const insightsText = insightsMatch?.[1] || "";
  const suggestionsText = suggestionsMatch?.[1] || "";

  const insights = insightsText
    .split("\n")
    .filter((line) => line.trim() && line.match(/^[-•*]/))
    .map((line) => line.replace(/^[-•*]\s*/, "").trim());

  const suggestions = suggestionsText
    .split("\n")
    .filter((line) => line.trim() && line.match(/^[-•*]\s*/))
    .map((line) => line.replace(/^[-•*]\s*/, "").trim());

  return {
    summary,
    insights: insights.length > 0 ? insights : [lines[1] || "Analyzed"],
    suggestions:
      suggestions.length > 0 ? suggestions : ["Review the analysis above"],
    mode: "coding",
  };
}
