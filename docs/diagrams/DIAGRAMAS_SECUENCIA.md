# Diagramas de Secuencia

Propósito: contratos críticos de interacción. Actualizar solo si cambia el flujo de negocio.

## Flujo 1: Iniciar captura y primer análisis

```mermaid
sequenceDiagram
    actor Usuario
    participant UI as page.tsx
    participant Hook as useScreenCapture
    participant Browser as Browser API
    participant Analysis as useFrameAnalysis
    participant Worker as analysisWorker
    participant API as /api/analyze
    participant AI as Gemini/Ollama

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

## Flujo 2: Cambio de modo durante captura activa

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

## Flujo 3: Detener captura

```mermaid
sequenceDiagram
    actor Usuario
    participant UI as page.tsx
    participant Hook as useScreenCapture
    participant Analysis as useFrameAnalysis
    participant Worker as analysisWorker

    Usuario->>UI: Click "Stop" (o cierra Chrome UI)
    UI->>Hook: stopCapture()
    Hook->>Hook: stream.getTracks().forEach(t => t.stop())
    Hook-->>UI: stream=null, isCapturing=false
    UI->>Analysis: stream=null → detiene intervalo
    Analysis->>Worker: Termina Worker
    Analysis-->>UI: isAnalyzing=false
    UI-->>Usuario: UI en estado inicial
```

## Flujo 4: Swap de provider (Gemini → Ollama)

```mermaid
sequenceDiagram
    participant EnvVar as .env.local
    participant Factory as factory.ts
    participant API as /api/analyze
    participant Gemini as Gemini API
    participant Ollama as Ollama (local)

    Note over EnvVar: AI_PROVIDER=ollama

    API->>Factory: getAIProvider()
    Factory->>EnvVar: Lee AI_PROVIDER
    EnvVar-->>Factory: "ollama"
    Factory-->>API: OllamaProvider instance
    API->>Ollama: POST http://localhost:11434/...
    Ollama-->>API: AnalysisResult
    Note over Gemini: No se llama. Sin cambios de código.
```
