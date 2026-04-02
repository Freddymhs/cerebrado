import type { AnalysisMode } from "@/lib/ai/types";

export const DEFAULT_ANALYSIS_INTERVAL_MS = 3000;

export function getAnalysisInterval(): number {
  if (typeof window === "undefined") {
    return DEFAULT_ANALYSIS_INTERVAL_MS;
  }

  const envInterval = process.env.NEXT_PUBLIC_ANALYSIS_INTERVAL_MS;
  if (envInterval) {
    const parsed = parseInt(envInterval, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return DEFAULT_ANALYSIS_INTERVAL_MS;
}

export const ANALYSIS_MODES: readonly AnalysisMode[] = [
  "video",
  "coding",
  "certification",
] as const;

export const MODE_PROMPTS: Record<AnalysisMode, string> = {
  video:
    "Estas viendo mi pantalla. Resume lo que explica el video y destaca los conceptos clave de software/arquitectura.",
  coding:
    "Analiza el codigo visible. Identifica patrones, posibles mejoras de arquitectura, y codigo que no sigue buenas practicas.",
  certification:
    "Veo que estoy estudiando para una certificacion. Explica los conceptos que aparecen en pantalla para que los entienda profundamente.",
};

export const MODE_LABELS: Record<AnalysisMode, string> = {
  video: "Video",
  coding: "Coding",
  certification: "Certificacion",
};
