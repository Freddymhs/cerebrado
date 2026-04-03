"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { AnalysisMode, AnalysisResult } from "@/lib/ai/types";
import { extractFrame } from "@/lib/frameExtractor";
import { getAnalysisInterval } from "@/constants/analysis";

export interface UseFrameAnalysisReturn {
  results: AnalysisResult[];
  isAnalyzing: boolean;
  latestResult: AnalysisResult | null;
  error: Error | null;
  triggerNow: (contextOverride?: string) => void;
  resetResults: () => void;
}

export function useFrameAnalysis(
  stream: MediaStream | null,
  mode: AnalysisMode,
  provider: string,
  intervalMs: number = getAnalysisInterval(),
  context?: string
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
          setResults((prev) => [...prev, result].slice(-10));
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
    streamRef.current = stream;
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
    videoRef.current.play().catch(() => {});

    const analyzeFrame = async () => {
      try {
        const video = videoRef.current;
        if (!video || video.readyState < 4 || video.videoWidth === 0) {
          return;
        }

        const imageBase64 = extractFrame(video);
        if (!imageBase64) return; // black frame, skip

        setIsAnalyzing(true);
        if (workerRef.current) {
          workerRef.current.postMessage({ imageBase64, mode, provider, ...(context ? { context } : {}) });
        }
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Frame extraction failed");
        setError(error);
        setIsAnalyzing(false);
      }
    };

    if (intervalMs > 0) {
      intervalRef.current = setInterval(analyzeFrame, intervalMs);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [stream, mode, provider, intervalMs, context]);

  const latestResult = results.length > 0 ? results[results.length - 1] : null;
  const displayError = stream ? error : null;

  // Expose manual trigger for modes like coding where auto-interval is slow
  // contextOverride: use when context changes in the same render as the trigger call
  const streamRef2 = useRef(stream);
  const modeRef = useRef(mode);
  const providerRef = useRef(provider);
  const contextRef = useRef(context);
  useEffect(() => { streamRef2.current = stream; }, [stream]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { providerRef.current = provider; }, [provider]);
  useEffect(() => { contextRef.current = context; }, [context]);

  const triggerNow = useCallback((contextOverride?: string) => {
    const video = videoRef.current;
    if (!streamRef2.current || !video || video.readyState < 4 || video.videoWidth === 0) return;
    const imageBase64 = extractFrame(video);
    if (!imageBase64) return;
    const effectiveContext = contextOverride ?? contextRef.current;
    setIsAnalyzing(true);
    workerRef.current?.postMessage({
      imageBase64,
      mode: modeRef.current,
      provider: providerRef.current,
      ...(effectiveContext ? { context: effectiveContext } : {}),
    });
  }, []);

  const resetResults = useCallback(() => setResults([]), []);

  return {
    results,
    isAnalyzing,
    latestResult,
    error: displayError,
    triggerNow,
    resetResults,
  };
}
