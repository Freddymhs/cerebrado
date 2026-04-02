"use client";

import { useEffect, useRef } from "react";
import type { AnalysisResult } from "@/lib/ai/types";
import { MODE_LABELS } from "@/constants/analysis";

interface AnalysisPanelProps {
  results: AnalysisResult[];
  latestResult: AnalysisResult | null;
}

export function AnalysisPanel({
  results,
  latestResult,
}: AnalysisPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (panelRef.current && results.length > 0) {
      panelRef.current.scrollTop = panelRef.current.scrollHeight;
    }
  }, [results]);

  if (!latestResult) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p className="text-lg">Start capture to see analysis results</p>
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      className="space-y-6 max-h-96 overflow-y-auto pr-4"
    >
      {/* Latest Result Card */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">Latest Analysis</h3>
          <span className="inline-block px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">
            {MODE_LABELS[latestResult.mode]}
          </span>
        </div>

        {/* Summary */}
        <div className="mb-4">
          <p className="text-gray-700 leading-relaxed">{latestResult.summary}</p>
        </div>

        {/* Insights */}
        {latestResult.insights.length > 0 && (
          <div className="mb-4">
            <h4 className="font-semibold text-gray-800 mb-2">Insights</h4>
            <ul className="space-y-1">
              {latestResult.insights.map((insight, idx) => (
                <li
                  key={idx}
                  className="text-sm text-gray-700 flex items-start gap-2"
                >
                  <span className="text-blue-600 font-bold mt-0.5">•</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggestions */}
        {latestResult.suggestions.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Suggestions</h4>
            <ul className="space-y-1">
              {latestResult.suggestions.map((suggestion, idx) => (
                <li
                  key={idx}
                  className="text-sm text-gray-700 flex items-start gap-2"
                >
                  <span className="text-green-600 font-bold mt-0.5">✓</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* History count */}
      {results.length > 1 && (
        <div className="text-xs text-gray-500 text-center py-2">
          {results.length} analyses so far
        </div>
      )}
    </div>
  );
}
