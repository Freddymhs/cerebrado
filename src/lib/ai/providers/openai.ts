import OpenAI from "openai";
import type { AIProvider, AnalysisResult, Tool, ToolCallRequest, ToolResult } from "@/lib/ai/types";

let client: OpenAI | null = null;

/** OpenAI requires the word "json" somewhere in messages when using response_format: json_object */
function withJsonInstruction(context: string): string {
  return context.toLowerCase().includes("json") ? context : `${context}\nResponde en JSON.`;
}

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
            { type: "text", text: withJsonInstruction(context) },
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
          content: `${withJsonInstruction(context)}\n\nContent to analyze:\n${text}`,
        },
      ],
      max_tokens: 1024,
    });

    const rawText = response.choices[0]?.message?.content ?? "{}";
    return parseResponse(rawText);
  },

  async analyzeWithTools(
    text: string,
    context: string,
    tools: Tool[]
  ): Promise<AnalysisResult | ToolCallRequest> {
    const client = getClient();

    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: context },
        { role: "user", content: text },
      ],
      tools: tools.map((t) => ({
        type: "function" as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      })),
      tool_choice: "auto",
      max_tokens: 1024,
    });

    const message = response.choices[0]?.message;
    const toolCall = message?.tool_calls?.[0];

    if (toolCall && "function" in toolCall) {
      return {
        toolCallId: toolCall.id,
        toolName: toolCall.function.name,
        args: JSON.parse(toolCall.function.arguments) as Record<string, string>,
      };
    }

    return parseResponse(message?.content ?? "{}");
  },

  async continueWithToolResult(
    text: string,
    context: string,
    tools: Tool[],
    toolResult: ToolResult
  ): Promise<AnalysisResult> {
    const client = getClient();

    const response = await client.chat.completions.create({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: withJsonInstruction(context) },
        { role: "user", content: text },
        {
          role: "assistant",
          tool_calls: [
            {
              id: toolResult.toolCallId,
              type: "function" as const,
              function: { name: toolResult.toolName, arguments: "{}" },
            },
          ],
        },
        {
          role: "tool",
          tool_call_id: toolResult.toolCallId,
          content: toolResult.result,
        },
      ],
      tools: tools.map((t) => ({
        type: "function" as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      })),
      max_tokens: 1024,
    });

    return parseResponse(response.choices[0]?.message?.content ?? "{}");
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
