"use client";

import { useState, useEffect } from "react";

interface CaptureControlsProps {
  isCapturing: boolean;
  isAnalyzing: boolean;
  onStart: () => Promise<void>;
  onStop: () => void;
  error: Error | null;
  frameCount?: number;
  lastAnalysisTime?: Date | null;
}

export function CaptureControls({
  isCapturing,
  isAnalyzing,
  onStart,
  onStop,
  error,
  frameCount = 0,
  lastAnalysisTime = null,
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
            className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
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
            <span className="text-gray-700 font-medium">{frameCount} frames</span>
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
        <div className="p-4 bg-red-100 text-red-700 rounded-lg border border-red-300">
          <p className="font-semibold mb-1">Error</p>
          <p className="text-sm">{error.message}</p>
          {error.message.includes("getDisplayMedia") && (
            <p className="text-xs mt-2 text-red-600">
              💡 Tip: This browser may not support screen capture. Try Chrome, Edge, or Firefox.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
