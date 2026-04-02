# Backlog — Cerebrado

Personal AI Learning Companion: captura pantalla via browser APIs y provee feedback AI en tiempo real.

## Fases

| Fase | Nombre | Estado | Prioridad | Tareas |
|------|--------|--------|-----------|--------|
| [FASE 0](./FASE_0_PROVIDERS.md) | AI Providers + API Route | ⏸️ PENDIENTE | Alta | 4 |
| [FASE 1](./FASE_1_SCREEN_CAPTURE.md) | Screen Capture | ⏸️ PENDIENTE | Alta | 2 |
| [FASE 2](./FASE_2_ANALYSIS_PIPELINE.md) | Analysis Pipeline (Web Worker) | ⏸️ PENDIENTE | Alta | 3 |
| [FASE 3](./FASE_3_UI.md) | UI Components | ⏸️ PENDIENTE | Alta | 4 |
| [FASE 4](./FASE_4_POLISH.md) | Polish + Deploy | ⏸️ PENDIENTE | Media | 5 |

**FASE 0 y FASE 1 son paralelas** — no tienen dependencia entre sí.
FASE 2 requiere ambas. FASE 3 requiere FASE 2. FASE 4 requiere FASE 3.

## Diagramas de Referencia

| Archivo | Tipo | Contenido |
|---------|------|-----------|
| [`../diagrams/DIAGRAMAS_COMPONENTES.md`](../diagrams/DIAGRAMAS_COMPONENTES.md) | Flowcharts | Topología del sistema |
| [`../diagrams/DIAGRAMAS_SECUENCIA.md`](../diagrams/DIAGRAMAS_SECUENCIA.md) | Sequences | Flujos críticos de análisis |

Estos diagramas son referencia estructural estable. Las fases los referencian pero no los repiten. Actualizar solo ante cambios de topología o flujos de negocio.

## Decisiones Técnicas

Carpeta `../decisions/` — documentar aquí decisiones arquitectónicas cuando surjan durante el desarrollo.
Formato: `DECISION_[TEMA].md` — explica el POR QUÉ, no el QUÉ.

## Validación de Flujos

| Archivo | Propósito |
|---------|-----------|
| [`../flows.md`](../flows.md) | Flujos de usuario documentados manualmente. Guía para QA y E2E. |

Llenar después de probar cada feature. Usar como referencia con `/run-browser_test`.
