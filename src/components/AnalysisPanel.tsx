"use client";

import { useEffect, useRef, useState } from "react";
import type { AnalysisResult } from "@/lib/ai/types";
import { MODE_LABELS } from "@/constants/analysis";

interface AnalysisPanelProps {
  results: AnalysisResult[];
  latestResult: AnalysisResult | null;
}

interface ExpandedState {
  [key: number]: boolean;
}

export function AnalysisPanel({
  results,
  latestResult,
}: AnalysisPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const MAX_HISTORY = 50;
  const limitedResults = results.slice(-MAX_HISTORY);

  useEffect(() => {
    if (panelRef.current && results.length > 0) {
      panelRef.current.scrollTop = panelRef.current.scrollHeight;
    }
  }, [results]);

  const toggleExpand = (idx: number) => {
    setExpanded((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  if (!latestResult) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p className="text-lg">Start capture to see analysis results</p>
      </div>
    );
  }

  return (
    <div ref={panelRef} className="space-y-4 max-h-96 overflow-y-auto pr-4">
      {/* Latest Result Card */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border-2 border-blue-300 sticky top-0">
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

      {/* History */}
      {limitedResults.length > 1 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-600 px-2">
            History ({limitedResults.length})
          </h4>
          {limitedResults
            .slice(0, -1)
            .reverse()
            .map((result, historyIdx) => {
              const actualIdx = limitedResults.length - historyIdx - 2;
              const isExpanded = expanded[actualIdx];

              return (
                <button
                  key={actualIdx}
                  onClick={() => toggleExpand(actualIdx)}
                  className="w-full text-left p-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`transform ${isExpanded ? "rotate-90" : ""}`}>
                        ▶
                      </span>
                      <span className="font-medium text-gray-800">
                        {MODE_LABELS[result.mode]}
                      </span>
                      <span className="text-xs text-gray-500">
                        {result.summary.substring(0, 40)}...
                      </span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pl-6 space-y-2 border-l-2 border-gray-300">
                      <p className="text-xs text-gray-600 leading-relaxed">
                        {result.summary}
                      </p>
                      {result.insights.length > 0 && (
                        <ul className="text-xs space-y-1">
                          {result.insights.slice(0, 2).map((insight, idx) => (
                            <li key={idx} className="text-gray-600">
                              • {insight}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}
