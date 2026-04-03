# Diagramas de Secuencia

Propósito: contratos críticos de interacción. Actualizar solo si cambia el flujo de negocio.

## Flujo 1: Iniciar captura y primer análisis (modos video/coding/certification)

```mermaid
sequenceDiagram
    actor Usuario
    participant UI as page.tsx
    participant Hook as useScreenCapture
    participant Browser as Browser API
    participant Analysis as useFrameAnalysis
    participant Worker as analysisWorker
    participant API as /api/analyze
    participant AI as Gemini/OpenAI/Ollama

    Usuario->>UI: Click "Start Capture"
    UI->>Hook: startCapture()
    Hook->>Browser: getDisplayMedia({ video: true })
    Browser-->>Usuario: Muestra selector de pantalla
    Usuario->>Browser: Selecciona monitor/ventana
    Browser-->>Hook: MediaStream
    Hook-->>UI: stream, isCapturing=true
    UI->>Analysis: Inicia con stream + mode

    loop Cada intervalMs (default 3000ms)
        Analysis->>Browser: extractFrame(videoElement)
        Browser-->>Analysis: imageBase64 (JPEG)
        Analysis->>Worker: postMessage({ imageBase64, mode })
        Worker->>API: POST /api/analyze { imageBase64, mode }
        API->>AI: analyzeScreen(imageBase64, prompt)
        AI-->>API: AnalysisResult { summary, insights, suggestions }
        API-->>Worker: AnalysisResult JSON
        Worker-->>Analysis: postMessage(AnalysisResult)
        Analysis-->>UI: results[], latestResult
        UI-->>Usuario: Muestra insights en AnalysisPanel
    end
```

## Flujo 2: Modo entrevista — audio + tool calling

```mermaid
sequenceDiagram
    actor Usuario
    participant UI as page.tsx
    participant AudioHook as useAudioCapture
    participant Browser as Browser API
    participant Transcribe as /api/transcribe
    participant Analyze as /api/analyze
    participant AI as Gemini/OpenAI/Ollama
    participant Patterns as interview-patterns.ts

    Usuario->>UI: Click "Start Capture" (modo entrevista)
    UI->>Browser: getDisplayMedia({ audio: true, video: { width:1, height:1 } })
    Browser-->>UI: MediaStream (system audio + minimal video)
    UI->>AudioHook: startAudio(stream)

    loop Cada 12s — sistema (entrevistador)
        AudioHook->>Browser: MediaRecorder graba chunk WebM
        Browser-->>AudioHook: Blob (sistema)
        AudioHook->>Transcribe: POST /api/transcribe { file, provider }
        Transcribe-->>AudioHook: { text: "¿Cómo manejarías N+1 en GraphQL?" }
        AudioHook->>AudioHook: addEntry("system", text) → transcript[]
        AudioHook->>Analyze: POST /api/analyze { text: transcript, mode: "entrevista" }

        alt Provider soporta tool calling
            Analyze->>AI: analyzeWithTools(transcript, prompt, [lookup_pattern])
            AI-->>Analyze: ToolCallRequest { toolName: "lookup_pattern", args: { scenario } }
            Analyze->>Patterns: findPattern(scenario)
            Patterns-->>Analyze: InterviewPattern { label, solution[], cvAnchor }
            Analyze->>AI: continueWithToolResult(transcript, prompt, tools, toolResult)
            AI-->>Analyze: AnalysisResult { summary, suggestions }
        else Sin soporte de tools (Ollama fallback)
            Analyze->>AI: analyzeText(transcript, prompt)
            AI-->>Analyze: AnalysisResult
        end

        Analyze-->>UI: AnalysisResult (coach bullets)
        UI-->>Usuario: Muestra sugerencias en AnalysisPanel
    end

    opt Mic activo (candidato)
        Usuario->>UI: Click "Mic ON"
        UI->>AudioHook: toggleMic()
        AudioHook->>Browser: getUserMedia({ audio: true })
        Browser-->>AudioHook: micStream

        loop Cada 12s — micrófono
            AudioHook->>Browser: MediaRecorder graba chunk WebM (mic)
            Browser-->>AudioHook: Blob (mic)
            AudioHook->>Transcribe: POST /api/transcribe { file, provider }
            Transcribe-->>AudioHook: { text: "Usaría DataLoader para batch queries..." }
            AudioHook->>AudioHook: addEntry("mic", text) → transcript[]
        end
    end
```

## Flujo 3: Cambio de modo durante captura activa

```mermaid
sequenceDiagram
    actor Usuario
    participant UI as page.tsx
    participant ModeSelector
    participant Analysis as useFrameAnalysis
    participant Worker as analysisWorker
    participant API as /api/analyze

    Usuario->>ModeSelector: Click "Coding"
    ModeSelector-->>UI: onModeChange("coding")
    UI-->>Analysis: mode cambia a "coding"

    Note over Analysis,API: Próximo frame usa nuevo modo automáticamente

    Analysis->>Worker: postMessage({ imageBase64, mode: "coding" })
    Worker->>API: POST /api/analyze { imageBase64, mode: "coding" }
    API->>API: Usa MODE_PROMPTS["coding"]
    API-->>Worker: AnalysisResult (con análisis de código)
    Worker-->>Analysis: AnalysisResult
    Analysis-->>UI: latestResult actualizado
```

## Flujo 4: Detener captura

```mermaid
sequenceDiagram
    actor Usuario
    participant UI as page.tsx
    participant Hook as useScreenCapture
    participant AudioHook as useAudioCapture
    participant Analysis as useFrameAnalysis
    participant Worker as analysisWorker

    Usuario->>UI: Click "Stop"
    UI->>Hook: stopCapture()
    Hook->>Hook: stream.getTracks().forEach(t => t.stop())
    Hook-->>UI: stream=null, isCapturing=false
    UI->>AudioHook: stopAudio()
    AudioHook->>AudioHook: recorderRef=null → stopMic()
    UI->>Analysis: stream=null → detiene intervalo
    Analysis->>Worker: Termina Worker
    Analysis-->>UI: isAnalyzing=false
    UI-->>Usuario: UI en estado inicial
```

## Flujo 5: Swap de AI provider

```mermaid
sequenceDiagram
    participant EnvVar as .env.local
    participant Factory as factory.ts
    participant API as /api/analyze
    participant Gemini as Gemini API
    participant OpenAI as OpenAI API
    participant Ollama as Ollama (local)

    Note over EnvVar: AI_PROVIDER=gemini (default)

    API->>Factory: getAIProvider()
    Factory->>EnvVar: Lee AI_PROVIDER
    EnvVar-->>Factory: "gemini"
    Factory-->>API: GeminiProvider (con analyzeWithTools)
    API->>Gemini: functionDeclarations + sendMessage

    Note over EnvVar: AI_PROVIDER=openai

    Factory-->>API: OpenAIProvider (con analyzeWithTools)
    API->>OpenAI: tools[] + tool_choice: "auto"

    Note over EnvVar: AI_PROVIDER=ollama

    Factory-->>API: OllamaProvider
    alt OLLAMA_TEXT_MODEL soporta tools (llama3.1, qwen2.5...)
        API->>Ollama: /api/chat con tools[]
    else modelo sin soporte
        API->>Ollama: /api/generate (analyzeText fallback)
    end

    Note over Gemini,Ollama: Swap = cambiar env var. Cero cambios de código.
```
