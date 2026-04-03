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

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

export const openaiProvider: AIProvider = {
  async analyzeScreen(
    imageBase64: string,
    context: string
  ): Promise<AnalysisResult> {
    const client = getClient();

    const response = await client.chat.completions.create({
      model: MODEL,
      response_format: { type: "json_object" },
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

    const rawText = response.choices[0]?.message?.content ?? "{}";
    return parseResponse(rawText);
  },

  async analyzeText(text: string, context: string): Promise<AnalysisResult> {
    const client = getClient();

    const response = await client.chat.completions.create({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: `${context}\n\nContent to analyze:\n${text}`,
        },
      ],
      max_tokens: 1024,
    });

    const rawText = response.choices[0]?.message?.content ?? "{}";
    return parseResponse(rawText);
  },
};

function parseResponse(rawText: string): AnalysisResult {
  try {
    const parsed = JSON.parse(rawText);
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
