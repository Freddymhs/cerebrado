import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AIProvider, AnalysisResult } from "@/lib/ai/types";

let client: GoogleGenerativeAI | null = null;

function getClient() {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }
    client = new GoogleGenerativeAI(apiKey);
  }
  return client;
}

function getModel() {
  return getClient().getGenerativeModel({
    model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
  });
}

export const geminiProvider: AIProvider = {
  async analyzeScreen(
    imageBase64: string,
    context: string
  ): Promise<AnalysisResult> {
    const model = getModel();

    const response = await model.generateContent([
      {
        inlineData: {
          data: imageBase64,
          mimeType: "image/png",
        },
      },
      context,
    ]);

    return parseResponse(response.response.text());
  },

  async analyzeText(text: string, context: string): Promise<AnalysisResult> {
    const model = getModel();

    const response = await model.generateContent([
      `${context}\n\nContent to analyze:\n${text}`,
    ]);

    return parseResponse(response.response.text());
  },
};

function parseResponse(rawText: string): AnalysisResult {
  const lines = rawText.split("\n").filter((line) => line.trim());

  const summaryMatch = rawText.match(
    /(?:summary|resumen|summary)[:\s]+([\s\S]*?)(?=insights|suggestion|$)/i
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
    .filter((line) => line.trim() && line.match(/^[-•*]/))
    .map((line) => line.replace(/^[-•*]\s*/, "").trim());

  return {
    summary,
    insights: insights.length > 0 ? insights : [lines[1] || "Analyzed"],
    suggestions:
      suggestions.length > 0 ? suggestions : ["Review the analysis above"],
    mode: "coding",
  };
}
