"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { AudioProviderKey } from "@/lib/audio/types";
import { AUDIO_CHUNK_INTERVAL_MS } from "@/constants/audio";

// Web Speech API — minimal type declarations (not in standard TS lib)
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  start(): void;
  stop(): void;
}
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

export interface TranscriptEntry {
  speaker: "system" | "mic";
  text: string;
  timestamp: number;
}

export interface UseAudioCaptureReturn {
  transcript: TranscriptEntry[];
  sessionChunkCount: number; // total chunks transcribed in this session
  isCapturing: boolean;
  isMicActive: boolean;
  startAudio: (stream: MediaStream) => void;
  stopAudio: () => void;
  toggleMic: () => void;
  exportSession: () => void;
  error: Error | null;
}

export function useAudioCapture(
  audioProvider: AudioProviderKey,
  aiProvider = "gemini"
): UseAudioCaptureReturn {
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [sessionChunkCount, setSessionChunkCount] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const micRecorderRef = useRef<MediaRecorder | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const sessionLogRef = useRef<TranscriptEntry[]>([]); // full uncompressed log, never discarded

  const COMPRESS_AT = 10;

  const compressTranscript = useCallback(async (entries: TranscriptEntry[]): Promise<TranscriptEntry> => {
    const text = entries
      .map((e) => `${e.speaker === "mic" ? "Yo" : "Entrevistador"}: ${e.text}`)
      .join("\n");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "entrevista",
          provider: aiProvider,
          text,
          context: `Resume esta conversación en 2-3 oraciones preservando los puntos clave. Responde ÚNICAMENTE con este JSON: {"summary":"resumen","insights":[],"suggestions":[]}`,
        }),
      });
      const data = (await res.json()) as { summary?: string };
      return { speaker: "system", text: `[Resumen]: ${data.summary ?? text.substring(0, 200)}`, timestamp: Date.now() };
    } catch {
      return { speaker: "system", text: `[Resumen]: ${text.substring(0, 200)}`, timestamp: Date.now() };
    }
  }, [aiProvider]);

  const addEntry = useCallback((speaker: "system" | "mic", text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const entry: TranscriptEntry = { speaker, text: trimmed, timestamp: Date.now() };
    sessionLogRef.current.push(entry);
    setSessionChunkCount((n) => n + 1);
    setTranscript((prev) => {
      const next = [...prev, entry];
      if (next.length >= COMPRESS_AT) {
        compressTranscript(next).then((summary) => {
          setTranscript([summary]); // only the AI context window is compressed
        });
      }
      return next;
    });
  }, [compressTranscript]);

  const transcribeChunk = useCallback(
    async (chunks: Blob[], mimeType: string, speaker: "system" | "mic") => {
      if (chunks.length === 0) return;
      const blob = new Blob(chunks, { type: mimeType });
      // Whisper rejects very small blobs (silence/empty chunks) — skip under 10KB
      if (blob.size < 10_000) return;

      const formData = new FormData();
      formData.append("file", new File([blob], "audio.webm", { type: mimeType }));
      formData.append("provider", audioProvider);

      try {
        const response = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        });
        if (!response.ok) throw new Error(`Transcription error: ${response.statusText}`);
        const data = (await response.json()) as { text: string };
        addEntry(speaker, data.text);
        fetch("/api/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: audioProvider, mode: "transcribe", summary: `[${speaker}] ${data.text.substring(0, 120)}`, success: true }),
        }).catch(() => {});
      } catch (err) {
        const message = err instanceof Error ? err.message : "Transcription failed";
        setError(new Error(message));
        fetch("/api/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: audioProvider, mode: "transcribe", summary: null, success: false, error: message }),
        }).catch(() => {});
      }
    },
    [audioProvider, addEntry]
  );

  const startWebSpeechMic = useCallback(() => {
    const SpeechRecognitionAPI =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setError(new Error("Web Speech API not supported in this browser"));
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "es-ES";

    recognition.onresult = (event) => {
      const last = event.results[event.results.length - 1];
      if (last.isFinal) addEntry("mic", last[0].transcript);
    };

    recognition.onerror = (event) => {
      if (event.error !== "no-speech") {
        setError(new Error(`Speech recognition error: ${event.error}`));
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
  }, [addEntry]);

  const stopWebSpeechMic = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }, []);

  const startMic = useCallback(async () => {
    if (isMicActive) return;

    if (audioProvider === "webspeech") {
      startWebSpeechMic();
      setIsMicActive(true);
      return;
    }

    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = micStream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg";

      const startMicCycle = () => {
        const recorder = new MediaRecorder(micStream, { mimeType });
        micRecorderRef.current = recorder;
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
          transcribeChunk(chunks, mimeType, "mic");
          const tracksAlive = micStream.getTracks().some((t) => t.readyState === "live");
          if (micRecorderRef.current !== null && tracksAlive) startMicCycle();
        };

        recorder.start();
        setTimeout(() => {
          if (recorder.state === "recording") recorder.stop();
        }, AUDIO_CHUNK_INTERVAL_MS);
      };

      startMicCycle();
      setIsMicActive(true);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Microphone access denied"));
    }
  }, [audioProvider, isMicActive, startWebSpeechMic, transcribeChunk]);

  const stopMic = useCallback(() => {
    if (audioProvider === "webspeech") {
      stopWebSpeechMic();
    } else {
      const rec = micRecorderRef.current;
      micRecorderRef.current = null; // nullify first so onstop doesn't restart cycle
      rec?.stop();
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    setIsMicActive(false);
  }, [audioProvider, stopWebSpeechMic]);

  const toggleMic = useCallback(() => {
    if (isMicActive) stopMic();
    else startMic();
  }, [isMicActive, startMic, stopMic]);

  const startAudio = useCallback(
    (stream: MediaStream) => {
      // Reset session state on every new capture
      sessionLogRef.current = [];
      setSessionChunkCount(0);
      setTranscript([]);

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        // No system audio — set capturing anyway so mic button is available
        setIsCapturing(true);
        setError(new Error("Sin audio del sistema. Selecciona una pestaña (Chrome Tab) y activa 'Share tab audio'. Puedes usar el Mic igualmente."));
        return;
      }

      const audioStream = new MediaStream(audioTracks);
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg";

      // Each recording cycle produces a self-contained file with headers.
      // Using stop()+start() instead of timeslice avoids WebM delta-chunks that Whisper can't parse.
      const startCycle = () => {
        const recorder = new MediaRecorder(audioStream, { mimeType });
        recorderRef.current = recorder;
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
          transcribeChunk(chunks, mimeType, "system");
          // Start next cycle only if not stopped externally and stream tracks are still live
          const tracksAlive = audioStream.getTracks().some((t) => t.readyState === "live");
          if (recorderRef.current !== null && tracksAlive) startCycle();
        };

        recorder.start();
        setTimeout(() => {
          if (recorder.state === "recording") recorder.stop();
        }, AUDIO_CHUNK_INTERVAL_MS);
      };

      startCycle();
      setIsCapturing(true);
      setError(null);
    },
    [transcribeChunk]
  );

  const stopAudio = useCallback(() => {
    const rec = recorderRef.current;
    recorderRef.current = null; // nullify first so onstop doesn't restart cycle
    rec?.stop();
    stopMic();
    setIsCapturing(false);
  }, [stopMic]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recorderRef.current?.stop();
      micRecorderRef.current?.stop();
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      recognitionRef.current?.stop();
    };
  }, []);

  const exportSession = useCallback(() => {
    const log = sessionLogRef.current;
    if (log.length === 0) return;
    const lines = log.map((e) => {
      const time = new Date(e.timestamp).toLocaleTimeString();
      const speaker = e.speaker === "mic" ? "Yo" : "Entrevistador";
      return `[${time}] ${speaker}: ${e.text}`;
    });
    const content = lines.join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cerebrado-sesion-${new Date().toISOString().slice(0, 16).replace("T", "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return {
    transcript,
    sessionChunkCount,
    isCapturing,
    isMicActive,
    startAudio,
    stopAudio,
    toggleMic,
    exportSession,
    error,
  };
}
