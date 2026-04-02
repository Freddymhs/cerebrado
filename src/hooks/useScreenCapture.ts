"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export interface UseScreenCaptureReturn {
  stream: MediaStream | null;
  isCapturing: boolean;
  error: Error | null;
  startCapture: () => Promise<void>;
  stopCapture: () => void;
}

export function useScreenCapture(): UseScreenCaptureReturn {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const tracksRef = useRef<MediaStreamTrack[]>([]);

  const stopCapture = useCallback(() => {
    tracksRef.current.forEach((track) => track.stop());
    tracksRef.current = [];
    setStream(null);
    setIsCapturing(false);
  }, []);

  const startCapture = useCallback(async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "monitor",
        },
        audio: false,
      });

      const tracks = mediaStream.getVideoTracks();
      tracks.forEach((track) => {
        track.addEventListener("ended", () => {
          stopCapture();
        });
      });

      tracksRef.current = tracks;
      setStream(mediaStream);
      setIsCapturing(true);
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Screen capture failed");
      if (error.name !== "NotAllowedError") {
        setError(error);
      }
    }
  }, [stopCapture]);

  useEffect(() => {
    return () => {
      stopCapture();
    };
  }, [stopCapture]);

  return {
    stream,
    isCapturing,
    error,
    startCapture,
    stopCapture,
  };
}
