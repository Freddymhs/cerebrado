"use client";

import { useState, useRef, useEffect, startTransition } from "react";
import type { AnalysisMode, AnalysisResult } from "@/lib/ai/types";
import { extractFrame } from "@/lib/frameExtractor";
import { getAnalysisInterval } from "@/constants/analysis";

export interface UseFrameAnalysisReturn {
  results: AnalysisResult[];
  isAnalyzing: boolean;
  latestResult: AnalysisResult | null;
  error: Error | null;
}

export function useFrameAnalysis(
  stream: MediaStream | null,
  mode: AnalysisMode,
  provider: string,
  intervalMs: number = getAnalysisInterval()
): UseFrameAnalysisReturn {
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL("../workers/analysisWorker.ts", import.meta.url),
        { type: "module" }
      );

      workerRef.current.onmessage = (
        event: MessageEvent<{ type: string; data: AnalysisResult | string }>
      ) => {
        if (event.data.type === "result") {
          const result = event.data.data as AnalysisResult;
          setResults((prev) => [...prev, result]);
          setIsAnalyzing(false);
        } else if (event.data.type === "error") {
          const errorMessage = event.data.data as string;
          setError(new Error(errorMessage));
          setIsAnalyzing(false);
        }
      };

      workerRef.current.onerror = (err) => {
        const errorMessage =
          err.error instanceof Error
            ? err.error.message
            : "Worker error: Analysis failed";
        setError(
          new Error(errorMessage.includes("401") || errorMessage.includes("API")
            ? "API configuration error. Check your API key."
            : errorMessage
          )
        );
        setIsAnalyzing(false);
      };
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const hadStream = streamRef.current !== null;
    streamRef.current = stream;

    if (hadStream && !stream) {
      startTransition(() => {
        setResults([]);
        setError(null);
      });
    }
  }, [stream]);

  useEffect(() => {
    if (!stream) {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    if (!videoRef.current) {
      const video = document.createElement("video");
      video.style.display = "none";
      document.body.appendChild(video);
      videoRef.current = video;
    }

    videoRef.current.srcObject = stream;

    const analyzeFrame = async () => {
      try {
        if (!videoRef.current || videoRef.current.readyState < 2) {
          return;
        }

        setIsAnalyzing(true);
        const imageBase64 = extractFrame(videoRef.current);
        if (workerRef.current) {
          workerRef.current.postMessage({ imageBase64, mode, provider });
        }
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Frame extraction failed");
        setError(error);
        setIsAnalyzing(false);
      }
    };

    intervalRef.current = setInterval(analyzeFrame, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [stream, mode, provider, intervalMs]);

  const latestResult = results.length > 0 ? results[results.length - 1] : null;

  return {
    results,
    isAnalyzing,
    latestResult,
    error,
  };
}
