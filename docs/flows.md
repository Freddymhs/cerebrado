# Flow Validation Document — Cerebrado

> Documento mantenido manualmente. Describe cómo funciona la app para el usuario final.
> Llenar cada flujo después de probarlo. Útil como guía para `/run-browser_test`.
>
> Última actualización: 2026-04-01

---

## Convenciones

- **Precondiciones**: qué debe existir antes de ejecutar el flujo
- **Pasos**: acciones del usuario (navegar, click, escribir, etc.)
- **Resultado esperado**: qué ve/obtiene el usuario al completar
- **Casos borde**: situaciones alternativas relevantes

---

## Módulo: Setup inicial

### Flujo: Primera configuración

**Precondiciones:**
- `.env.local` con `GEMINI_API_KEY` configurada
- App corriendo en `http://localhost:3000`

**Pasos:**
1. (por llenar)

**Resultado esperado:**
- (por llenar)

**Casos borde:**
- Sin `GEMINI_API_KEY` configurada
- Con `AI_PROVIDER=ollama` pero Ollama no corriendo

---

## Módulo: Screen Capture

### Flujo: Iniciar captura de pantalla

**Precondiciones:**
- (por llenar)

**Pasos:**
1. (por llenar)

**Resultado esperado:**
- (por llenar)

**Casos borde:**
- Usuario cancela el selector de pantalla
- Usuario deniega permiso de captura
- Navegador no soporta `getDisplayMedia()`

---

### Flujo: Detener captura

**Precondiciones:**
- (por llenar)

**Pasos:**
1. (por llenar)

**Resultado esperado:**
- (por llenar)

**Casos borde:**
- Usuario cierra el diálogo de Chrome "Dejar de compartir"
- (por llenar)

---

## Módulo: Selección de Modo

### Flujo: Cambiar modo mientras captura está activa

**Precondiciones:**
- (por llenar)

**Pasos:**
1. (por llenar)

**Resultado esperado:**
- (por llenar)

**Casos borde:**
- (por llenar)

---

### Flujo: Cambiar modo sin captura activa

**Precondiciones:**
- (por llenar)

**Pasos:**
1. (por llenar)

**Resultado esperado:**
- (por llenar)

**Casos borde:**
- (por llenar)

---

## Módulo: Análisis AI

### Flujo: Análisis en modo Video

**Precondiciones:**
- Captura activa con video técnico reproduciéndose en pantalla

**Pasos:**
1. (por llenar)

**Resultado esperado:**
- Summary del contenido del video
- Insights con conceptos clave
- Suggestions relevantes al contenido

**Casos borde:**
- Pantalla en negro o sin contenido
- Video pausado
- (por llenar)

---

### Flujo: Análisis en modo Coding

**Precondiciones:**
- Captura activa con editor de código visible en pantalla

**Pasos:**
1. (por llenar)

**Resultado esperado:**
- Análisis de patrones de código visibles
- Sugerencias de mejoras de arquitectura
- Identificación de malas prácticas

**Casos borde:**
- Código no visible (terminal, browser, etc.)
- (por llenar)

---

### Flujo: Análisis en modo Certification

**Precondiciones:**
- Captura activa con material de estudio o curso visible

**Pasos:**
1. (por llenar)

**Resultado esperado:**
- Explicación de conceptos visibles en pantalla
- NO da respuestas directas a preguntas de examen

**Casos borde:**
- Pregunta de examen visible
- (por llenar)

---

## Módulo: Panel de Resultados

### Flujo: Ver historial de análisis

**Precondiciones:**
- (por llenar)

**Pasos:**
1. (por llenar)

**Resultado esperado:**
- (por llenar)

**Casos borde:**
- (por llenar)

---

### Flujo: Error de análisis (API key inválida o Gemini no disponible)

**Precondiciones:**
- (por llenar)

**Pasos:**
1. (por llenar)

**Resultado esperado:**
- Mensaje de error claro y accionable visible al usuario

**Casos borde:**
- (por llenar)
