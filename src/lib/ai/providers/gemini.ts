import { GoogleGenerativeAI, type FunctionDeclaration, SchemaType } from "@google/generative-ai";
import type { AIProvider, AnalysisResult, Tool, ToolCallRequest, ToolResult } from "@/lib/ai/types";

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

  async analyzeWithTools(
    text: string,
    context: string,
    tools: Tool[]
  ): Promise<AnalysisResult | ToolCallRequest> {
    const functionDeclarations: FunctionDeclaration[] = tools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: {
        type: SchemaType.OBJECT,
        properties: Object.fromEntries(
          Object.entries(t.parameters.properties).map(([k, v]) => [
            k,
            { type: SchemaType.STRING, description: v.description },
          ])
        ),
        required: [...t.parameters.required],
      },
    }));

    const model = getClient().getGenerativeModel({
      model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
      tools: [{ functionDeclarations }],
    });

    const chat = model.startChat({ history: [] });
    const response = await chat.sendMessage(`${context}\n\n${text}`);
    const candidate = response.response.candidates?.[0];
    const part = candidate?.content?.parts?.[0];

    if (part?.functionCall) {
      return {
        toolCallId: part.functionCall.name,
        toolName: part.functionCall.name,
        args: part.functionCall.args as Record<string, string>,
      };
    }

    return parseResponse(response.response.text());
  },

  async continueWithToolResult(
    text: string,
    context: string,
    tools: Tool[],
    toolResult: ToolResult
  ): Promise<AnalysisResult> {
    const functionDeclarations: FunctionDeclaration[] = tools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: {
        type: SchemaType.OBJECT,
        properties: Object.fromEntries(
          Object.entries(t.parameters.properties).map(([k, v]) => [
            k,
            { type: SchemaType.STRING, description: v.description },
          ])
        ),
        required: [...t.parameters.required],
      },
    }));

    const model = getClient().getGenerativeModel({
      model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
      tools: [{ functionDeclarations }],
    });

    const chat = model.startChat({ history: [] });
    // Send original message
    await chat.sendMessage(`${context}\n\n${text}`);
    // Send tool result and get final answer
    const response = await chat.sendMessage([
      {
        functionResponse: {
          name: toolResult.toolName,
          response: { result: toolResult.result },
        },
      },
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
