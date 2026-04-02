"use client";

interface CaptureControlsProps {
  isCapturing: boolean;
  isAnalyzing: boolean;
  onStart: () => Promise<void>;
  onStop: () => void;
  error: Error | null;
}

export function CaptureControls({
  isCapturing,
  isAnalyzing,
  onStart,
  onStop,
  error,
}: CaptureControlsProps) {
  const handleStart = async () => {
    try {
      await onStart();
    } catch (err) {
      console.error("Capture error:", err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
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
      </div>

      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-lg">
          <p className="font-semibold">Error</p>
          <p className="text-sm">{error.message}</p>
        </div>
      )}

      {isCapturing && (
        <div className="p-3 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
          ✓ Screen capture active
        </div>
      )}
    </div>
  );
}
