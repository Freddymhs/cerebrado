export type AnalysisMode = "coding" | "certification" | "entrevista";

export interface AnalysisResult {
  summary: string;
  insights: string[];
  suggestions: string[];
  mode: AnalysisMode;
}

// ─── Tool calling (function calling) ────────────────────────────────────────

export interface ToolParameterSchema {
  type: "object";
  properties: Record<string, { type: string; description: string }>;
  required: readonly string[];
  [key: string]: unknown;
}

export interface Tool {
  name: string;
  description: string;
  parameters: ToolParameterSchema;
}

/** Returned by a provider when the model wants to call a tool instead of answering directly */
export interface ToolCallRequest {
  toolCallId: string;
  toolName: string;
  args: Record<string, string>;
}

/** Sent back to the provider after executing the tool */
export interface ToolResult {
  toolCallId: string;
  toolName: string;
  result: string;
}

// ─── Provider interface ──────────────────────────────────────────────────────

export interface AIProvider {
  analyzeScreen(imageBase64: string, context: string): Promise<AnalysisResult>;
  analyzeText(text: string, context: string): Promise<AnalysisResult>;
  /** Text analysis with optional tool calling support (interview mode) */
  analyzeWithTools?(
    text: string,
    context: string,
    tools: Tool[]
  ): Promise<AnalysisResult | ToolCallRequest>;
  /** Continue after tool execution — send tool result and get final AnalysisResult */
  continueWithToolResult?(
    text: string,
    context: string,
    tools: Tool[],
    toolResult: ToolResult
  ): Promise<AnalysisResult>;
}

export interface AIProviderRateLimit {
  /** Max requests per minute allowed by the provider */
  requestsPerMinute: number;
  /** Max requests per day (optional, not all providers have a daily cap) */
  requestsPerDay?: number;
  /** Tier label — useful for UI and debugging */
  tier: "free" | "paid" | "local";
  /** Human-readable description */
  description: string;
}
