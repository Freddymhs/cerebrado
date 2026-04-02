"use client";

import type { AnalysisMode } from "@/lib/ai/types";
import { ANALYSIS_MODES, MODE_LABELS } from "@/constants/analysis";

interface ModeSelectorProps {
  selectedMode: AnalysisMode;
  onModeChange: (mode: AnalysisMode) => void;
}

export function ModeSelector({
  selectedMode,
  onModeChange,
}: ModeSelectorProps) {
  return (
    <div className="flex gap-2">
      {ANALYSIS_MODES.map((mode) => (
        <button
          key={mode}
          onClick={() => onModeChange(mode)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedMode === mode
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-800 hover:bg-gray-300"
          }`}
        >
          {MODE_LABELS[mode]}
        </button>
      ))}
    </div>
  );
}
