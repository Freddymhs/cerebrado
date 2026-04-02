export type AnalysisMode = "video" | "coding" | "certification";

export interface AnalysisResult {
  summary: string;
  insights: string[];
  suggestions: string[];
  mode: AnalysisMode;
}

export interface AIProvider {
  analyzeScreen(imageBase64: string, context: string): Promise<AnalysisResult>;
  analyzeText(text: string, context: string): Promise<AnalysisResult>;
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
