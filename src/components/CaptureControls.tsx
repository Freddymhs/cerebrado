"use client";

import { useState, useEffect } from "react";

interface CaptureControlsProps {
  isCapturing: boolean;
  isAnalyzing: boolean;
  onStart: () => Promise<void>;
  onStop: () => void;
  error: Error | null;
  frameCount?: number;
  frameLabel?: string;
  lastAnalysisTime?: Date | null;
  disabled?: boolean;
  disabledReason?: string;
}

export function CaptureControls({
  isCapturing,
  isAnalyzing,
  onStart,
  onStop,
  error,
  frameCount = 0,
  frameLabel = "frames",
  lastAnalysisTime = null,
  disabled = false,
  disabledReason,
}: CaptureControlsProps) {
  const [timeElapsed, setTimeElapsed] = useState<string>("");

  useEffect(() => {
    if (!lastAnalysisTime) return;

    const updateTime = () => {
      const now = new Date();
      const diff = now.getTime() - lastAnalysisTime.getTime();
      const seconds = Math.floor(diff / 1000);

      if (seconds < 60) {
        setTimeElapsed(`${seconds}s ago`);
      } else {
        const minutes = Math.floor(seconds / 60);
        setTimeElapsed(`${minutes}m ago`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [lastAnalysisTime]);

  const handleStart = async () => {
    try {
      await onStart();
    } catch (err) {
      console.error("Capture error:", err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        {!isCapturing ? (
          <button
            onClick={handleStart}
            disabled={disabled}
            title={disabledReason}
            className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Start Capture
          </button>
        ) : (
          <button
            onClick={onStop}
            className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
          >
            Stop Capture
          </button>
        )}

        {isAnalyzing && (
          <div className="flex items-center gap-2 px-4 py-3 bg-blue-100 text-blue-700 rounded-lg">
            <div className="w-4 h-4 bg-blue-600 rounded-full animate-pulse" />
            <span className="font-medium">Analyzing...</span>
          </div>
        )}

        {isCapturing && (
          <div className="flex items-center gap-4 px-4 py-3 bg-green-100 text-green-700 rounded-lg text-sm">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
              Capturing
            </span>
            <span className="text-gray-600">•</span>
            <span className="text-gray-700 font-medium">{frameCount} {frameLabel}</span>
            {lastAnalysisTime && (
              <>
                <span className="text-gray-600">•</span>
                <span className="text-gray-700">{timeElapsed}</span>
              </>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className={`p-4 rounded-lg border text-sm ${
          error.message.includes("Sin audio del sistema")
            ? "bg-amber-50 border-amber-200 text-amber-700"
            : "bg-red-100 border-red-300 text-red-700"
        }`}>
          <p className="font-semibold mb-1">
            {error.message.includes("Sin audio del sistema") ? "Aviso" : "Error"}
          </p>
          <p>{error.message}</p>
        </div>
      )}
    </div>
  );
}
