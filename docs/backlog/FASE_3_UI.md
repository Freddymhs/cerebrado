# FASE 3: UI Components

**Status**: ✅ COMPLETADO
**Prioridad**: Alta
**Dependencias**: FASE 0, FASE 1, FASE 2

## Contexto

Construir la interfaz mínima que conecte captura, selección de modo y visualización de resultados. Todo client-side con Tailwind CSS 4.

## Tareas

### Tarea 1: ModeSelector

- Archivo: `src/components/ModeSelector.tsx` (crear)
- Que hacer:
  - Props: `selectedMode: AnalysisMode`, `onModeChange: (mode: AnalysisMode) => void`
  - Renderizar botones/tabs para cada modo usando `ANALYSIS_MODES` y `MODE_LABELS`
  - Estilo activo/inactivo con Tailwind
  - `"use client"` directive
- Referencia: `src/constants/analysis.ts`

### Tarea 2: CaptureControls

- Archivo: `src/components/CaptureControls.tsx` (crear)
- Que hacer:
  - Props: `isCapturing`, `isAnalyzing`, `onStart`, `onStop`, `error`
  - Botón Start/Stop captura con estados visuales claros
  - Mostrar indicador de "analizando..." cuando está activo
  - Mostrar error si existe
  - `"use client"` directive

### Tarea 3: AnalysisPanel

- Archivo: `src/components/AnalysisPanel.tsx` (crear)
- Que hacer:
  - Props: `results: AnalysisResult[]`, `latestResult: AnalysisResult | null`
  - Mostrar último resultado prominente: summary, insights (lista), suggestions (lista)
  - Indicar modo activo del resultado
  - Scroll automático a último resultado
  - Estado vacío cuando no hay resultados
  - `"use client"` directive

### Tarea 4: Page principal (integración)

- Archivo: `src/app/page.tsx` (modificar)
- Que hacer:
  - `"use client"` directive
  - Estado: `mode` (default `video`)
  - Usar `useScreenCapture()` para captura
  - Usar `useFrameAnalysis(stream, mode)` para análisis
  - Componer: ModeSelector + CaptureControls + AnalysisPanel
  - Layout responsivo con Tailwind: controles arriba, panel de resultados abajo

## Criterios de Aceptacion

- [x] Flujo completo funciona: seleccionar modo → start capture → ver resultados en tiempo real
- [x] Stop capture detiene análisis y limpia UI
- [x] Cambiar modo durante captura activa usa el nuevo modo en siguiente frame
- [x] UI no se congela durante análisis (Web Worker)
- [x] Errores se muestran al usuario de forma clara
- [x] Responsive: funciona en desktop (mobile no es target pero no debe romper)
- [x] `pnpm build` y `pnpm lint` pasan sin errores
