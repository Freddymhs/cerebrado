"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { AnalysisMode, AnalysisResult } from "@/lib/ai/types";
import type { AudioProviderKey } from "@/lib/audio/types";
import { useScreenCapture } from "@/hooks/useScreenCapture";
import { useFrameAnalysis } from "@/hooks/useFrameAnalysis";
import { useAudioCapture } from "@/hooks/useAudioCapture";
import { ModeSelector } from "@/components/ModeSelector";
import { CaptureControls } from "@/components/CaptureControls";
import { AnalysisPanel } from "@/components/AnalysisPanel";
import { ProviderSelector, type AIProviderKey } from "@/components/ProviderSelector";
import { AudioProviderSelector } from "@/components/AudioProviderSelector";
import { MODE_INTERVALS_MS, MODE_DESCRIPTIONS, STUDY_DEFAULT_INTERVAL_MS, CODING_DEFAULT_INTERVAL_MS, STUDY_BASE_PROMPT, buildInterviewPrompt } from "@/constants/analysis";

const STORAGE_KEY_AI = "cerebrado_provider";
const STORAGE_KEY_AUDIO = "cerebrado_audio_provider";
const STORAGE_KEY_INTERVIEW_ROLE = "cerebrado_interview_role";
const STORAGE_KEY_INTERVIEW_CV = "cerebrado_interview_cv";
const STORAGE_KEY_STUDY_INTERVAL = "cerebrado_study_interval_ms";
const STORAGE_KEY_CODING_INTERVAL = "cerebrado_coding_interval_ms";

const INTERVIEW_MODE: AnalysisMode = "entrevista";

const MODE_BADGES: Record<AnalysisMode, Array<{ label: string; active: boolean }>> = {
  coding:      [{ label: "📹 Video", active: true },  { label: "🔊 Audio", active: false }, { label: "🎙 Mic", active: true }],
  certification:[{ label: "📹 Video", active: true }, { label: "🔊 Audio", active: true },  { label: "🎙 Mic", active: true }],
  entrevista:  [{ label: "📹 Video", active: false }, { label: "🔊 Audio", active: true },  { label: "🎙 Mic", active: true }],
};

const STOP_WORDS = new Set(["el","la","los","las","un","una","de","del","en","que","y","a","se","por","con","su","al","es","para","como","me","te","le","lo","hay","fue","ha","han","pero","si","sobre","también","más"]);

function summaryOverlap(a: string, b: string): number {
  const words = (s: string) => new Set(s.toLowerCase().split(/\s+/).filter((w) => w.length > 3 && !STOP_WORDS.has(w)));
  const wa = words(a);
  const wb = words(b);
  const shared = [...wa].filter((w) => wb.has(w)).length;
  return shared / Math.max(wa.size, wb.size, 1);
}

export default function Home() {
  const [mode, setMode] = useState<AnalysisMode>("coding");
  const [panelOpen, setPanelOpen] = useState(true);

  const [provider, setProvider] = useState<AIProviderKey>(() =>
    typeof window === "undefined" ? "gemini" : ((localStorage.getItem(STORAGE_KEY_AI) as AIProviderKey) ?? "gemini")
  );
  const [audioProvider, setAudioProvider] = useState<AudioProviderKey>(() =>
    typeof window === "undefined" ? "openai" : ((localStorage.getItem(STORAGE_KEY_AUDIO) as AudioProviderKey) ?? "openai")
  );
  const [interviewRole, setInterviewRole] = useState(() =>
    typeof window === "undefined" ? "" : (localStorage.getItem(STORAGE_KEY_INTERVIEW_ROLE) ?? "")
  );
  const [interviewCV, setInterviewCV] = useState(() =>
    typeof window === "undefined" ? "" : (localStorage.getItem(STORAGE_KEY_INTERVIEW_CV) ?? "")
  );
  const [studyIntervalMs, setStudyIntervalMs] = useState(() => {
    if (typeof window === "undefined") return STUDY_DEFAULT_INTERVAL_MS;
    const saved = parseInt(localStorage.getItem(STORAGE_KEY_STUDY_INTERVAL) ?? "", 10);
    return isNaN(saved) ? STUDY_DEFAULT_INTERVAL_MS : saved;
  });
  const [codingIntervalMs, setCodingIntervalMs] = useState(() => {
    if (typeof window === "undefined") return CODING_DEFAULT_INTERVAL_MS;
    const saved = parseInt(localStorage.getItem(STORAGE_KEY_CODING_INTERVAL) ?? "", 10);
    return isNaN(saved) ? CODING_DEFAULT_INTERVAL_MS : saved;
  });

  const handleProviderChange = (next: AIProviderKey) => {
    setProvider(next);
    localStorage.setItem(STORAGE_KEY_AI, next);
  };

  const handleAudioProviderChange = (next: AudioProviderKey) => {
    setAudioProvider(next);
    localStorage.setItem(STORAGE_KEY_AUDIO, next);
  };

  const handleRoleChange = (value: string) => {
    setInterviewRole(value);
    localStorage.setItem(STORAGE_KEY_INTERVIEW_ROLE, value);
  };

  const handleCVChange = (value: string) => {
    setInterviewCV(value);
    localStorage.setItem(STORAGE_KEY_INTERVIEW_CV, value);
  };

  const handleStudyIntervalChange = (ms: number) => {
    setStudyIntervalMs(ms);
    localStorage.setItem(STORAGE_KEY_STUDY_INTERVAL, String(ms));
  };

  const handleCodingIntervalChange = (ms: number) => {
    setCodingIntervalMs(ms);
    localStorage.setItem(STORAGE_KEY_CODING_INTERVAL, String(ms));
  };

  const isInterviewMode = mode === INTERVIEW_MODE;
  const isStudyMode = mode === "certification";
  const isCodingMode = mode === "coding";

  const { stream, isCapturing, error: captureError, startCapture, stopCapture } = useScreenCapture();

  const {
    transcript,
    sessionChunkCount,
    isMicActive,
    startAudio,
    stopAudio,
    toggleMic,
    exportSession,
    resetTranscript,
    error: audioError,
  } = useAudioCapture(audioProvider, provider, isStudyMode || isCodingMode ? Infinity : 10);

  const [interviewResults, setInterviewResults] = useState<AnalysisResult[]>([]);

  // Build derived values needed before hooks that depend on them
  const transcriptContext = transcript
    .slice(-10)
    .map((e) => `${e.speaker === "mic" ? "Yo" : "Entrevistador"}: ${e.text}`)
    .join("\n");

  const studyAudioContext = transcript
    .filter((e) => e.speaker === "system" || e.speaker === "mic")
    .slice(-8)
    .map((e) => e.speaker === "mic" ? `[Yo, instrucción]: ${e.text}` : `[Video/clase]: ${e.text}`)
    .join("\n");

  const codingMicContext = transcript
    .filter((e) => e.speaker === "mic")
    .slice(-5)
    .map((e) => e.text)
    .join("\n");

  const interviewProfile = [
    interviewRole.trim() ? `Rol buscado: ${interviewRole.trim()}` : "",
    interviewCV.trim() ? `CV / experiencia:\n${interviewCV.trim()}` : "",
  ].filter(Boolean).join("\n\n");

  const interviewPrompt = buildInterviewPrompt(interviewProfile, transcriptContext);

  const effectiveMode = isInterviewMode ? "entrevista" : mode;

  const effectiveIntervalMs = mode === "certification" ? studyIntervalMs
    : mode === "coding" ? codingIntervalMs
    : MODE_INTERVALS_MS[mode];

  const studyContext = isStudyMode && studyAudioContext.trim()
    ? `${STUDY_BASE_PROMPT}\n\nContexto de audio (lo que se escucha en el video, úsalo como enriquecimiento):\n${studyAudioContext}`
    : undefined;

  const codingContext = isCodingMode && codingMicContext.trim()
    ? `El usuario tiene una duda o comentario sobre el problema:\n[Pregunta del usuario]: ${codingMicContext}\n\nResponde DIRECTAMENTE a esa pregunta en el contexto del problema visible. Luego complementa con el análisis del código si es relevante.`
    : undefined;

  const { results, isAnalyzing, error: analysisError, triggerNow, resetResults } = useFrameAnalysis(
    isInterviewMode ? null : stream,
    effectiveMode,
    provider,
    effectiveIntervalMs,
    studyContext ?? codingContext
  );

  // Interview mode: use openai if audio provider is openai (key already configured), else gemini
  const interviewAIProvider = audioProvider === "openai" ? "openai" : "gemini";

  const lastAnalyzedChunkRef = useRef<string>("");
  const micTriggerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Study/Coding: when user speaks via mic → trigger frame analysis after a short pause
  // Debounced to avoid firing on every WebSpeech interim result
  useEffect(() => {
    if ((!isStudyMode && !isCodingMode) || transcript.length === 0) return;
    const last = transcript[transcript.length - 1];
    if (!last || last.speaker !== "mic") return;
    if (isCodingMode && last.text.length < 20) return;

    if (micTriggerTimerRef.current) clearTimeout(micTriggerTimerRef.current);
    micTriggerTimerRef.current = setTimeout(() => {
      if (isCodingMode) {
        const micText = transcript.filter((e) => e.speaker === "mic").slice(-5).map((e) => e.text).join("\n");
        const override = `El usuario tiene una duda o comentario sobre el problema:\n[Pregunta del usuario]: ${micText}\n\nResponde DIRECTAMENTE a esa pregunta en el contexto del problema visible. Luego complementa con el análisis del código si es relevante.`;
        triggerNow(override);
      } else {
        triggerNow();
      }
    }, 3000);
  }, [transcript, isStudyMode, isCodingMode, triggerNow]);

  // In interview mode, trigger analysis on new transcript entries
  useEffect(() => {
    if (!isInterviewMode || transcript.length === 0) return;
    const last = transcript[transcript.length - 1];
    if (!last) return;

    // Only analyze on system audio (what the interviewer says)
    if (last.speaker !== "system") return;

    // Skip if this chunk is too similar to the last one that produced suggestions — save tokens
    if (summaryOverlap(last.text, lastAnalyzedChunkRef.current) > 0.5) return;

    fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64: null, mode: "entrevista", provider: interviewAIProvider, context: interviewPrompt }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.summary !== "string" || !Array.isArray(data.insights) || !Array.isArray(data.suggestions)) return;
        if (data.suggestions.length > 0) lastAnalyzedChunkRef.current = last.text;
        setInterviewResults((prev) => {
          const previous = prev[prev.length - 1];
          const isSameTopic = previous?.suggestions.length > 0
            && data.suggestions.length > 0
            && summaryOverlap(data.summary, previous.summary) > 0.4;

          if (isSameTopic) {
            // Snowball — merge unique new bullets into the existing result
            const existingSuggestions = previous.suggestions;
            const newUnique = data.suggestions.filter(
              (s: string) => !existingSuggestions.some((e: string) => summaryOverlap(s, e) > 0.5)
            );
            if (newUnique.length === 0) return prev; // nothing new to add
            const merged = { ...previous, suggestions: [...existingSuggestions, ...newUnique].slice(0, 8) };
            return [...prev.slice(0, -1), merged];
          }

          return [...prev, data].slice(-50);
        });
      })
      .catch((err) => console.error("[interview] analyze error:", err));
  }, [transcript, isInterviewMode, interviewAIProvider, interviewPrompt]);

  const handleHardReset = useCallback(() => {
    resetResults();
    resetTranscript();
    setInterviewResults([]);
  }, [resetResults, resetTranscript]);

  const handleStart = useCallback(async () => {
    const mediaStream = await startCapture(
      isInterviewMode || isStudyMode,
      isInterviewMode
    );
    if (isInterviewMode && mediaStream) {
      setInterviewResults([]);
      startAudio(mediaStream);
    }
    if (isStudyMode && mediaStream) {
      startAudio(mediaStream);
    }
  }, [startCapture, isInterviewMode, isStudyMode, startAudio]);

  const handleStop = useCallback(() => {
    stopCapture();
    if (isInterviewMode || isStudyMode || isCodingMode) stopAudio();
  }, [stopCapture, isInterviewMode, isStudyMode, isCodingMode, stopAudio]);

  const lastCodingQuestion = isCodingMode
    ? transcript.filter((e) => e.speaker === "mic").slice(-5).map((e) => e.text).join("\n")
    : "";

  const displayResults = isInterviewMode ? interviewResults : results;
  const displayLatest = displayResults.length > 0 ? displayResults[displayResults.length - 1] : null;

  // In interview mode: pin the last result WITH bullets — don't let empty results displace it
  const interviewPinned = isInterviewMode
    ? [...interviewResults].reverse().find((r) => r.suggestions.length > 0) ?? null
    : null;
  const interviewListening = isInterviewMode && displayLatest?.suggestions.length === 0
    ? displayLatest
    : null;

  const error = captureError || analysisError || audioError;
  const captureCount = isInterviewMode ? sessionChunkCount : displayResults.length;
  const lastAnalysisTime = !isInterviewMode && displayLatest ? new Date() : null;


  /* ── Shared blocks ─────────────────────────────────────────── */
  const headerBlock = (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Cerebrado</h1>
        <p className="text-gray-500 text-sm">
          Real-time AI feedback for learning.
        </p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <ProviderSelector
          selectedProvider={provider}
          onProviderChange={handleProviderChange}
        />
        <AudioProviderSelector
          value={audioProvider}
          onChange={handleAudioProviderChange}
        />
      </div>
    </div>
  );

  const modeDescription = MODE_DESCRIPTIONS[mode];

  const modeBlock = (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-3">
        Analysis Mode
      </label>
      <ModeSelector selectedMode={mode} onModeChange={setMode} />
      {/* Capability badges */}
      <div className="flex gap-2 mt-2">
        {MODE_BADGES[mode].map(({ label, active }) => (
          <span
            key={label}
            className={`text-xs px-2 py-0.5 rounded-full border ${
              active
                ? "bg-green-50 border-green-300 text-green-700"
                : "bg-gray-100 border-gray-200 text-gray-400 line-through"
            }`}
          >
            {label}
          </span>
        ))}
      </div>
      <p className="mt-2 text-xs text-gray-500">{modeDescription.text}</p>
      <p className="mt-1 text-xs text-amber-600">⚠ {modeDescription.warning}</p>
      {mode === "certification" && (
        <div className="mt-3 flex items-center gap-3">
          <label className="text-xs text-gray-500 shrink-0">
            Auto cada <strong>{studyIntervalMs / 1000}s</strong>
          </label>
          <input
            type="range"
            min={5000}
            max={60000}
            step={5000}
            value={studyIntervalMs}
            onChange={(e) => handleStudyIntervalChange(Number(e.target.value))}
            className="w-full accent-indigo-600"
          />
        </div>
      )}
      {mode === "coding" && (
        <div className="mt-3 flex items-center gap-3">
          <label className="text-xs text-gray-500 shrink-0">
            Auto: <strong>{codingIntervalMs === 0 ? "manual" : `${codingIntervalMs / 60000}min`}</strong>
          </label>
          <input
            type="range"
            min={0}
            max={1_800_000}
            step={300_000}
            value={codingIntervalMs}
            onChange={(e) => handleCodingIntervalChange(Number(e.target.value))}
            className="w-full accent-indigo-600"
          />
        </div>
      )}
    </div>
  );

  const captureBlock = (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-3">
        {isInterviewMode ? "Audio Capture" : "Screen Capture"}
      </label>
      {isInterviewMode && !isCapturing && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-3">
          En el diálogo del browser, selecciona <strong>Chrome Tab</strong> y activa &quot;Share audio&quot;.
        </p>
      )}
      {isInterviewMode && !interviewCV.trim() && !isCapturing && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
          Completa tu CV antes de iniciar.
        </p>
      )}
      <div className="flex items-center gap-3 flex-wrap">
        <CaptureControls
          isCapturing={isCapturing}
          isAnalyzing={isAnalyzing}
          onStart={handleStart}
          onStop={handleStop}
          error={error}
          frameCount={captureCount}
          frameLabel={isInterviewMode ? "fragmentos" : "frames"}
          lastAnalysisTime={lastAnalysisTime}
          disabled={isInterviewMode && !interviewCV.trim()}
          disabledReason="Completa tu CV antes de iniciar"
        />
        {mode === "coding" && isCapturing && (
          <button
            onClick={() => triggerNow()}
            disabled={isAnalyzing}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors"
          >
            📸 Actualizar contexto
          </button>
        )}
        {(isInterviewMode || isStudyMode || isCodingMode) && isCapturing && (
          <button
            onClick={toggleMic}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              isMicActive
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-gray-200 hover:bg-gray-300 text-gray-700"
            }`}
          >
            {isMicActive ? "🎙 Mic ON" : "🎙 Mic OFF"}
          </button>
        )}
        <button
          onClick={handleHardReset}
          className="px-3 py-2 rounded-lg text-sm font-semibold border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-400 transition-colors"
          title="Borra todo el contexto (resultados + transcripción) para empezar desde cero"
        >
          🗑 Reset
        </button>
      </div>
    </div>
  );

  /* ── Interview two-column layout ────────────────────────────── */
  if (isInterviewMode) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {headerBlock}
          <div className="grid grid-cols-2 gap-6 items-start">
            {/* Left column — controls */}
            <div className="bg-white rounded-lg shadow-lg p-5 space-y-5">
              {modeBlock}

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Rol que busco
                  </label>
                  <input
                    type="text"
                    value={interviewRole}
                    onChange={(e) => handleRoleChange(e.target.value)}
                    placeholder="Ej: Senior Frontend Engineer"
                    className="w-full text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Mi CV / experiencia
                  </label>
                  <textarea
                    value={interviewCV}
                    onChange={(e) => handleCVChange(e.target.value)}
                    placeholder="Pega aquí tu CV, experiencia relevante, stack técnico, logros..."
                    rows={8}
                    className="w-full text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 placeholder-gray-400"
                  />
                </div>
              </div>

              {captureBlock}

              {transcript.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-gray-500">
                      Transcripción ({transcript.length})
                    </p>
                    <button
                      onClick={exportSession}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors px-3 py-1 rounded-lg border border-indigo-300 hover:border-indigo-500 bg-indigo-50 hover:bg-indigo-100"
                    >
                      ⬇ Descargar transcripción
                    </button>
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto bg-gray-50 rounded-lg p-3">
                    {transcript.slice(-8).map((entry, i) => (
                      <p key={i} className="text-xs text-gray-700">
                        <span className={`font-semibold ${entry.speaker === "mic" ? "text-blue-600" : "text-gray-600"}`}>
                          {entry.speaker === "mic" ? "Yo" : "Entrevistador"}:
                        </span>{" "}
                        {entry.text}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right column — Q&A coach panel */}
            <div className="bg-white rounded-lg shadow-lg p-5 sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-900">Coach de entrevista</h2>
                {interviewResults.length > 0 && (
                  <button
                    onClick={() => {
                      const text = interviewResults
                        .filter((r) => r.suggestions.length > 0)
                        .map((r) => `• ${r.summary}\n${r.suggestions.map((s) => `  → ${s}`).join("\n")}`)
                        .join("\n\n");
                      navigator.clipboard.writeText(text);
                    }}
                    className="text-xs text-gray-400 hover:text-gray-700 transition-colors px-2 py-1 rounded border border-gray-200 hover:border-gray-400"
                  >
                    Copiar todo
                  </button>
                )}
              </div>
              {interviewPinned || displayLatest ? (
                <div className="space-y-4">
                  {/* Listening indicator — shows when no new question yet */}
                  {interviewListening && (
                    <div className="bg-gray-50 rounded-lg px-4 py-2">
                      <p className="text-xs font-semibold text-gray-400 mb-0.5">Escuchando...</p>
                      <p className="text-xs text-gray-500">{interviewListening.summary}</p>
                    </div>
                  )}
                  {/* Pinned answer — stays visible until a new question replaces it */}
                  {interviewPinned && (
                    <>
                      <div className="bg-gray-50 rounded-lg px-4 py-3">
                        <p className="text-xs font-semibold text-gray-500 mb-1">Pregunta detectada</p>
                        <p className="text-sm text-gray-800">{interviewPinned.summary}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-2">Di esto</p>
                        <ul className="space-y-2">
                          {interviewPinned.suggestions.map((s, i) => (
                            <li key={i} className="flex gap-3 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                              <span className="text-green-500 shrink-0 font-bold">→</span>
                              <span className="text-gray-800 font-medium leading-snug">{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}
                  {(displayLatest?.insights.length ?? 0) > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1">Contexto</p>
                      <ul className="space-y-1">
                        {displayLatest?.insights.map((ins, i) => (
                          <li key={i} className="text-xs text-gray-600 flex gap-2">
                            <span className="text-gray-400">•</span>
                            <span>{ins}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(() => {
                    const history = interviewResults.filter(
                      (r) => r.suggestions.length > 0 && r !== interviewPinned
                    );
                    return history.length > 0 ? (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                          Historial ({history.length} anteriores)
                        </summary>
                        <div className="mt-2 space-y-3 max-h-64 overflow-y-auto">
                          {[...history].reverse().map((r, i) => (
                            <div key={i} className="border-t pt-2">
                              <p className="text-xs text-gray-500 mb-1">{r.summary}</p>
                              <ul className="space-y-1">
                                {r.suggestions.map((s, j) => (
                                  <li key={j} className="text-xs text-gray-600 flex gap-2">
                                    <span className="text-green-400">→</span>
                                    <span>{s}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </details>
                    ) : null;
                  })()}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-12">
                  {isCapturing
                    ? "Escuchando... los bullets aparecerán cuando el entrevistador hable."
                    : "Inicia la captura para recibir ayuda en tiempo real."}
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    );
  }

  /* ── Coding: two-column layout (like interview) ────────────── */
  if (isCodingMode) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {headerBlock}
          <div className="grid grid-cols-2 gap-6 items-start">
            {/* Left column — controls + context */}
            <div className="bg-white rounded-lg shadow-lg p-5 space-y-5">
              {modeBlock}
              {captureBlock}

              {/* What the AI saw in the last frame */}
              {displayLatest && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">📸 Lo que vio la IA</p>
                  <div className="bg-gray-50 rounded-lg px-4 py-3 space-y-2">
                    <p className="text-xs text-gray-700 leading-relaxed">{displayLatest.summary}</p>
                    {displayLatest.insights.length > 0 && (
                      <ul className="space-y-1">
                        {displayLatest.insights.map((ins, i) => (
                          <li key={i} className="text-xs text-gray-600 flex gap-2">
                            <span className="text-gray-400 shrink-0">•</span>
                            <span>{ins}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {/* Last mic question */}
              {lastCodingQuestion && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">🎙 Tu pregunta</p>
                  <div className="bg-blue-50 rounded-lg px-4 py-3">
                    <p className="text-xs text-blue-900 leading-relaxed">{lastCodingQuestion}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Right column — coach output only */}
            <div className="bg-white rounded-lg shadow-lg p-5 sticky top-6">
              <h2 className="text-base font-bold text-gray-900 mb-4">Coach de coding</h2>
              {displayLatest ? (
                <div className="space-y-3">
                  {displayLatest.suggestions.length > 0 ? (
                    <ul className="space-y-2">
                      {displayLatest.suggestions.map((s, i) => (
                        <li key={i} className="flex gap-3 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                          <span className="text-green-500 shrink-0 font-bold">→</span>
                          <span className="text-sm font-medium text-gray-900 leading-snug">{s}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-6">Analizando...</p>
                  )}
                  {/* History */}
                  {displayResults.length > 1 && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                        Historial ({displayResults.length - 1} anteriores)
                      </summary>
                      <div className="mt-2">
                        <AnalysisPanel results={displayResults} latestResult={null} />
                      </div>
                    </details>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-12">
                  {isCapturing
                    ? "Captura un frame o habla por el mic para recibir ayuda."
                    : "Inicia la captura para recibir ayuda en tiempo real."}
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    );
  }

  /* ── Default layout (certification) ─────────── */
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {headerBlock}

        {/* Control Panel */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6 space-y-6">
          {modeBlock}
          {captureBlock}
        </div>

        {/* Results Panel */}
        <div className="bg-white rounded-lg shadow-lg">
          <button
            onClick={() => setPanelOpen((prev) => !prev)}
            className="w-full flex items-center justify-between px-6 py-4 text-left"
          >
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900">Analysis Results</h2>
              {displayLatest && !panelOpen && (
                <span className="text-sm text-gray-500 truncate max-w-xs">
                  {displayLatest.summary.substring(0, 60)}...
                </span>
              )}
            </div>
            <span className="text-gray-400 text-xl">{panelOpen ? "▼" : "▲"}</span>
          </button>

          {panelOpen && (
            <div className="px-6 pb-6">
              <AnalysisPanel results={displayResults} latestResult={displayLatest} />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
