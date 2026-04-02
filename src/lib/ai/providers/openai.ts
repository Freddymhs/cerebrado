import OpenAI from "openai";
import type { AIProvider, AnalysisResult } from "@/lib/ai/types";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    client = new OpenAI({ apiKey });
  }
  return client;
}

const MODEL = "gpt-4o-mini";

export const openaiProvider: AIProvider = {
  async analyzeScreen(
    imageBase64: string,
    context: string
  ): Promise<AnalysisResult> {
    const client = getClient();

    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
            },
            { type: "text", text: context },
          ],
        },
      ],
      max_tokens: 1024,
    });

    const rawText = response.choices[0]?.message?.content ?? "";
    return parseResponse(rawText);
  },

  async analyzeText(text: string, context: string): Promise<AnalysisResult> {
    const client = getClient();

    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "user",
          content: `${context}\n\nContent to analyze:\n${text}`,
        },
      ],
      max_tokens: 1024,
    });

    const rawText = response.choices[0]?.message?.content ?? "";
    return parseResponse(rawText);
  },
};

function parseResponse(rawText: string): AnalysisResult {
  const lines = rawText.split("\n").filter((line) => line.trim());

  const summaryMatch = rawText.match(
    /(?:summary|resumen)[:\s]+([\s\S]*?)(?=insights|suggestion|$)/i
  );
  const insightsMatch = rawText.match(
    /insights[:\s]+([\s\S]*?)(?=suggestion|$)/i
  );
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
