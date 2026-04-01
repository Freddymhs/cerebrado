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
