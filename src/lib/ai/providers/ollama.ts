import type { AIProvider, AnalysisResult, Tool, ToolCallRequest, ToolResult } from "@/lib/ai/types";

const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const VISION_MODEL = process.env.OLLAMA_MODEL ?? "moondream";
const TEXT_MODEL = process.env.OLLAMA_TEXT_MODEL ?? VISION_MODEL;
const TIMEOUT_MS = 30_000;

function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  );
}

/** Models known to support tool calling in Ollama */
const TOOL_CAPABLE_MODELS = ["llama3.1", "llama3.2", "qwen2.5", "mistral-nemo", "mistral", "command-r"];

function modelSupportsTools(model: string): boolean {
  return TOOL_CAPABLE_MODELS.some((m) => model.toLowerCase().includes(m));
}

export const ollamaProvider: AIProvider = {
  async analyzeScreen(
    imageBase64: string,
    context: string
  ): Promise<AnalysisResult> {
    const response = await fetchWithTimeout(`${OLLAMA_BASE_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: VISION_MODEL,
        prompt: context,
        images: [imageBase64],
        stream: false,
        options: { num_predict: 512 },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.statusText}`);
    }

    const data = (await response.json()) as { response: string };
    return parseResponse(data.response);
  },

  async analyzeText(text: string, context: string): Promise<AnalysisResult> {
    const response = await fetchWithTimeout(`${OLLAMA_BASE_URL}/api/generate`, {
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

  async analyzeWithTools(
    text: string,
    context: string,
    tools: Tool[]
  ): Promise<AnalysisResult | ToolCallRequest> {
    // Fallback: if model doesn't support tools, skip tool calling entirely
    if (!modelSupportsTools(TEXT_MODEL)) {
      return ollamaProvider.analyzeText(text, context);
    }

    const response = await fetchWithTimeout(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: TEXT_MODEL,
        messages: [
          { role: "system", content: context },
          { role: "user", content: text },
        ],
        tools: tools.map((t) => ({
          type: "function",
          function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          },
        })),
        stream: false,
      }),
    });

    if (!response.ok) throw new Error(`Ollama error: ${response.statusText}`);

    const data = (await response.json()) as {
      message?: {
        content?: string;
        tool_calls?: Array<{
          function: { name: string; arguments: Record<string, string> };
        }>;
      };
    };

    const toolCall = data.message?.tool_calls?.[0];
    if (toolCall) {
      return {
        toolCallId: toolCall.function.name,
        toolName: toolCall.function.name,
        args: toolCall.function.arguments,
      };
    }

    return parseResponse(data.message?.content ?? "{}");
  },

  async continueWithToolResult(
    text: string,
    context: string,
    tools: Tool[],
    toolResult: ToolResult
  ): Promise<AnalysisResult> {
    const response = await fetchWithTimeout(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: TEXT_MODEL,
        messages: [
          { role: "system", content: context },
          { role: "user", content: text },
          {
            role: "tool",
            content: toolResult.result,
          },
        ],
        stream: false,
      }),
    });

    if (!response.ok) throw new Error(`Ollama error: ${response.statusText}`);

    const data = (await response.json()) as { message?: { content?: string } };
    return parseResponse(data.message?.content ?? "{}");
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
