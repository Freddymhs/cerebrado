# FASE 2: Analysis Pipeline (Web Worker)

**Status**: ✅ COMPLETADO
**Prioridad**: Alta
**Dependencias**: FASE 0 (API route), FASE 1 (screen capture + frame extractor)

## Contexto

Conectar la captura de pantalla con el análisis AI a través de un Web Worker que no bloquee el main thread. Intervalo configurable (default 3s).

## Tareas

### Tarea 1: Analysis Web Worker

- Archivo: `src/workers/analysisWorker.ts` (crear)
- Que hacer:
  - Recibir mensajes con `{ imageBase64: string, mode: AnalysisMode }`
  - Llamar a `/api/analyze` via fetch
  - Postear resultado (`AnalysisResult`) de vuelta al main thread
  - Postear errores como mensaje de error tipado
  - No importar tipos directamente (Web Worker aislado) — definir tipos inline o usar shared types

### Tarea 2: Hook useFrameAnalysis

- Archivo: `src/hooks/useFrameAnalysis.ts` (crear)
- Que hacer:
  - Recibir: `stream` (del useScreenCapture), `mode` (AnalysisMode), `intervalMs` (default desde `ANALYSIS_INTERVAL_MS` env o `DEFAULT_ANALYSIS_INTERVAL_MS`)
  - Crear elemento `<video>` hidden, asignar stream como srcObject
  - Cada `intervalMs`: extraer frame con `extractFrame()`, enviar al worker
  - Escuchar respuestas del worker, acumular en array de resultados
  - Exponer: `results: AnalysisResult[]`, `isAnalyzing`, `latestResult`, `error`
  - Limpiar intervalo y worker en unmount o cuando stream cambie
- Referencia: `src/lib/frameExtractor.ts`, `src/workers/analysisWorker.ts`

### Tarea 3: Configuración de intervalo desde env

- Archivo: `src/constants/analysis.ts` (modificar)
- Que hacer:
  - Agregar helper para obtener intervalo: leer de `process.env.NEXT_PUBLIC_ANALYSIS_INTERVAL_MS` o fallback a `DEFAULT_ANALYSIS_INTERVAL_MS`
  - Nota: en cliente necesita `NEXT_PUBLIC_` prefix

## Criterios de Aceptacion

- [x] Web Worker envía frame a API route y recibe AnalysisResult
- [x] Main thread NO se bloquea durante análisis (UI responsive)
- [x] Intervalo es configurable via env var
- [x] Si el stream se detiene, el análisis se detiene
- [x] Errores del worker se propagan al hook como estado de error
- [x] `pnpm build` pasa sin errores TypeScript
