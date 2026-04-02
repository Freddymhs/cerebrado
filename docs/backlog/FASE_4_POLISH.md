# FASE 4: Polish + Deploy

**Status**: ⏸️ PENDIENTE
**Prioridad**: Media
**Dependencias**: FASE 3

## Contexto

Pulir la experiencia, agregar feedback visual, y preparar para deploy a Vercel.

## Tareas

### Tarea 1: Feedback visual de estado

- Archivo: `src/components/CaptureControls.tsx` (modificar)
- Que hacer:
  - Indicador visual de captura activa (dot pulsante o similar)
  - Contador de frames analizados
  - Timestamp del último análisis

### Tarea 2: Historial de resultados

- Archivo: `src/components/AnalysisPanel.tsx` (modificar)
- Que hacer:
  - Mostrar historial scrolleable de resultados anteriores (colapsados)
  - Expandir/colapsar cada resultado
  - Limitar historial a últimos 50 resultados en memoria

### Tarea 3: Error handling robusto

- Archivos: hooks y componentes existentes (modificar)
- Que hacer:
  - Manejar: navegador no soporta getDisplayMedia
  - Manejar: usuario deniega permiso de captura
  - Manejar: API key no configurada (respuesta 500 del API route)
  - Manejar: Ollama no disponible cuando se usa como provider
  - Mensajes de error claros y accionables para el usuario

### Tarea 4: Metadata + SEO básico

- Archivo: `src/app/layout.tsx` (modificar)
- Que hacer:
  - Title, description, viewport meta
  - Favicon ya existe
  - Open Graph básico

### Tarea 5: Deploy a Vercel

- Que hacer:
  - Verificar `pnpm build` pasa limpio
  - Configurar env vars en Vercel (GEMINI_API_KEY, AI_PROVIDER)
  - Deploy inicial
  - Verificar HTTPS (requerido para getDisplayMedia)

## Criterios de Aceptacion

- [ ] MVP verificación completa (de CONCEPTO.md):
  - [ ] getDisplayMedia() muestra selector de monitor/ventana/tab
  - [ ] Frame se extrae correctamente a base64 via Canvas
  - [ ] Gemini recibe imagen y responde en < 3s
  - [ ] Cambiar AI_PROVIDER=ollama funciona sin tocar código
  - [ ] Web Worker no bloquea UI durante análisis
  - [ ] pnpm build pasa sin errores TypeScript
- [ ] Errores tienen mensajes claros
- [ ] Deploy en Vercel funcional con HTTPS
