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
