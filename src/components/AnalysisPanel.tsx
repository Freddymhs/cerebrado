"use client";

import { useState, useCallback } from "react";
import type { AnalysisResult } from "@/lib/ai/types";
import { MODE_LABELS } from "@/constants/analysis";

interface AnalysisPanelProps {
  results: AnalysisResult[];
  latestResult: AnalysisResult | null;
}

function formatResultsAsText(results: AnalysisResult[]): string {
  return results.map((r, i) => {
    const lines = [
      `--- [${i + 1}] ${MODE_LABELS[r.mode]} ---`,
      r.summary,
    ];
    if (r.insights.length > 0) lines.push("Insights:", ...r.insights.map((x) => `• ${x}`));
    if (r.suggestions.length > 0) lines.push("Suggestions:", ...r.suggestions.map((x) => `✓ ${x}`));
    return lines.join("\n");
  }).join("\n\n");
}

export function AnalysisPanel({ results, latestResult }: AnalysisPanelProps) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState(false);
  const history = results.slice(0, -1).reverse();

  const copyAll = useCallback(() => {
    const text = formatResultsAsText(results);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [results]);

  const toggleExpand = (idx: number) =>
    setExpanded((prev) => ({ ...prev, [idx]: !prev[idx] }));

  if (!latestResult) {
    return (
      <div className="py-8 text-center text-gray-400">
        Start capture to see analysis results
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Latest — no sticky */}
      <div className="rounded-lg p-5 border-2 border-blue-200 bg-blue-50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-800">Latest</h3>
          <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-semibold rounded-full">
            {MODE_LABELS[latestResult.mode]}
          </span>
        </div>

        <p className="text-gray-700 text-sm leading-relaxed mb-3">
          {latestResult.summary}
        </p>

        {latestResult.insights.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-semibold text-gray-600 mb-1">Insights</p>
            <ul className="space-y-1">
              {latestResult.insights.map((insight, i) => (
                <li key={i} className="text-sm text-gray-700 flex gap-2">
                  <span className="text-blue-500 shrink-0">•</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {latestResult.suggestions.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">
              {latestResult.mode === "entrevista" ? "Di esto" : "Suggestions"}
            </p>
            <ul className={latestResult.mode === "entrevista" ? "space-y-2" : "space-y-1"}>
              {latestResult.suggestions.map((s, i) => (
                <li
                  key={i}
                  className={
                    latestResult.mode === "entrevista"
                      ? "flex gap-3 bg-green-50 border border-green-200 rounded-lg px-3 py-2"
                      : "text-sm text-gray-700 flex gap-2"
                  }
                >
                  <span className="text-green-500 shrink-0 font-bold">→</span>
                  <span className={latestResult.mode === "entrevista" ? "text-gray-800 font-medium leading-snug" : "text-sm text-gray-700"}>
                    {s}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* History — independent scroll */}
      {history.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500">
              Análisis anteriores ({history.length})
            </p>
            <button
              onClick={copyAll}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-2 py-0.5 rounded border border-gray-200 hover:border-gray-400"
            >
              {copied ? "Copiado ✓" : "Copiar todo"}
            </button>
          </div>
          <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
            {history.map((result, i) => (
              <button
                key={i}
                onClick={() => toggleExpand(i)}
                className="w-full text-left px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs">
                    {expanded[i] ? "▼" : "▶"}
                  </span>
                  <span className="text-xs font-medium text-gray-500">
                    {MODE_LABELS[result.mode]}
                  </span>
                  <span className="text-gray-600 truncate">
                    {result.summary.substring(0, 60)}...
                  </span>
                </div>
                {expanded[i] && (
                  <div className="mt-2 pl-4 border-l-2 border-gray-300 space-y-1">
                    <p className="text-xs text-gray-600">{result.summary}</p>
                    {result.insights.slice(0, 3).map((ins, j) => (
                      <p key={j} className="text-xs text-gray-500">• {ins}</p>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
