"use client";

import { useState } from "react";
import type { AnalysisMode } from "@/lib/ai/types";
import { useScreenCapture } from "@/hooks/useScreenCapture";
import { useFrameAnalysis } from "@/hooks/useFrameAnalysis";
import { ModeSelector } from "@/components/ModeSelector";
import { CaptureControls } from "@/components/CaptureControls";
import { AnalysisPanel } from "@/components/AnalysisPanel";
import {
  ProviderSelector,
  type AIProviderKey,
} from "@/components/ProviderSelector";

const STORAGE_KEY = "cerebrado_provider";

export default function Home() {
  const [mode, setMode] = useState<AnalysisMode>("video");
  const [panelOpen, setPanelOpen] = useState(true);
  const [provider, setProvider] = useState<AIProviderKey>(() => {
    if (typeof window === "undefined") return "gemini";
    return (localStorage.getItem(STORAGE_KEY) as AIProviderKey) ?? "gemini";
  });

  const handleProviderChange = (next: AIProviderKey) => {
    setProvider(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  const { stream, isCapturing, error: captureError, startCapture, stopCapture } = useScreenCapture();
  const { results, isAnalyzing, latestResult, error: analysisError } = useFrameAnalysis(stream, mode, provider);

  const error = captureError || analysisError;
  const frameCount = results.length;
  const lastAnalysisTime = latestResult ? new Date() : null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Cerebrado</h1>
            <p className="text-gray-600">
              Real-time AI feedback for learning. Analyze videos, code, and certification study.
            </p>
          </div>
          <ProviderSelector
            selectedProvider={provider}
            onProviderChange={handleProviderChange}
          />
        </div>

        {/* Control Panel */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6 space-y-6">
          {/* Mode Selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Analysis Mode
            </label>
            <ModeSelector selectedMode={mode} onModeChange={setMode} />
          </div>

          {/* Capture Controls */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Screen Capture
            </label>
            <CaptureControls
              isCapturing={isCapturing}
              isAnalyzing={isAnalyzing}
              onStart={startCapture}
              onStop={stopCapture}
              error={error}
              frameCount={frameCount}
              lastAnalysisTime={lastAnalysisTime}
            />
          </div>
        </div>

        {/* Results Panel */}
        <div className="bg-white rounded-lg shadow-lg">
          <button
            onClick={() => setPanelOpen((prev) => !prev)}
            className="w-full flex items-center justify-between px-6 py-4 text-left"
          >
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900">Analysis Results</h2>
              {latestResult && !panelOpen && (
                <span className="text-sm text-gray-500 truncate max-w-xs">
                  {latestResult.summary.substring(0, 60)}...
                </span>
              )}
            </div>
            <span className="text-gray-400 text-xl">{panelOpen ? "▼" : "▲"}</span>
          </button>

          {panelOpen && (
            <div className="px-6 pb-6">
              <AnalysisPanel results={results} latestResult={latestResult} />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
