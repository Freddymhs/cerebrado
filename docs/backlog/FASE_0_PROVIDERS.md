# FASE 0: AI Providers + API Route

**Status**: ⏸️ PENDIENTE
**Prioridad**: Alta
**Dependencias**: Ninguna (types.ts y constants/analysis.ts ya existen)

## Contexto

Los tipos (`AIProvider`, `AnalysisResult`, `AnalysisMode`) y las constantes (prompts por modo, intervalos) ya están definidos. Esta fase implementa los providers concretos y el proxy server-side.

## Tareas

### Tarea 1: Implementar Gemini Provider

- Archivo: `src/lib/ai/providers/gemini.ts` (crear)
- Que hacer:
  - Instalar `@google/generative-ai`
  - Implementar `AIProvider` interface
  - `analyzeScreen`: enviar imagen base64 + prompt del modo activo a Gemini 2.5 Flash
  - `analyzeText`: enviar texto + prompt del modo activo
  - Parsear respuesta de Gemini a `AnalysisResult`
  - Usar `GEMINI_API_KEY` desde env (server-side only)
- Referencia: `src/lib/ai/types.ts`

### Tarea 2: Implementar Ollama Provider (stub funcional)

- Archivo: `src/lib/ai/providers/ollama.ts` (crear)
- Que hacer:
  - Implementar `AIProvider` interface
  - Llamar a Ollama REST API (`OLLAMA_BASE_URL` desde env, default `http://localhost:11434`)
  - Soportar modelos con vision (llava, bakllava)
  - Parsear respuesta a `AnalysisResult`
- Referencia: `src/lib/ai/types.ts`

### Tarea 3: Implementar Provider Factory

- Archivo: `src/lib/ai/factory.ts` (crear)
- Que hacer:
  - Leer `AI_PROVIDER` desde env (`gemini` | `ollama`, default `gemini`)
  - Retornar instancia del provider correspondiente
  - Exportar `getAIProvider(): AIProvider`
- Referencia: `src/lib/ai/providers/gemini.ts`, `src/lib/ai/providers/ollama.ts`

### Tarea 4: API Route (server proxy)

- Archivo: `src/app/api/analyze/route.ts` (crear)
- Que hacer:
  - POST handler: recibir `{ imageBase64: string, mode: AnalysisMode }`
  - Obtener provider via factory
  - Construir context con `MODE_PROMPTS[mode]`
  - Llamar `provider.analyzeScreen()`
  - Retornar `AnalysisResult` como JSON
  - Validar input (mode válido, imageBase64 presente)
  - Manejar errores del provider con respuestas HTTP apropiadas
- Referencia: `src/constants/analysis.ts`

## Criterios de Aceptacion

- [ ] `AI_PROVIDER=gemini` llama a Gemini correctamente con imagen base64
- [ ] `AI_PROVIDER=ollama` llama a Ollama local correctamente
- [ ] Cambiar env var swapea provider sin tocar código
- [ ] API route protege API key (nunca expuesta al cliente)
- [ ] API route valida input y retorna errores descriptivos
- [ ] `pnpm build` pasa sin errores TypeScript
