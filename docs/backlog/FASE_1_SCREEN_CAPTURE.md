# FASE 1: Screen Capture

**Status**: ⏸️ PENDIENTE
**Prioridad**: Alta
**Dependencias**: Ninguna (independiente de FASE 0)

## Contexto

Implementar la captura de pantalla via `getDisplayMedia()` como hook reutilizable. Es el input del pipeline de análisis.

## Tareas

### Tarea 1: Hook useScreenCapture

- Archivo: `src/hooks/useScreenCapture.ts` (crear)
- Que hacer:
  - `startCapture()`: llamar `navigator.mediaDevices.getDisplayMedia()` con opciones de monitor/ventana/tab
  - `stopCapture()`: detener todos los tracks del stream y limpiar estado
  - Exponer: `stream`, `isCapturing`, `error`, `startCapture`, `stopCapture`
  - Escuchar evento `ended` del track (usuario cancela desde Chrome UI) para limpiar estado
  - Cleanup automático en unmount (useEffect cleanup)
  - Constraints: `{ video: { displaySurface: "monitor" }, audio: false }`

### Tarea 2: Frame Extractor

- Archivo: `src/lib/frameExtractor.ts` (crear)
- Que hacer:
  - Función `extractFrame(video: HTMLVideoElement): string` que retorna base64
  - Crear canvas off-screen, dibujar frame del video, exportar como `toDataURL('image/jpeg', 0.8)`
  - Optimizar: reutilizar canvas entre llamadas (no crear uno nuevo cada vez)
  - Escalar a resolución razonable para AI (ej: max 1280px de ancho) para reducir payload

## Criterios de Aceptacion

- [ ] `startCapture()` muestra selector de pantalla del navegador
- [ ] `stopCapture()` libera el stream correctamente
- [ ] Si el usuario cancela desde Chrome UI, estado se limpia
- [ ] `extractFrame()` retorna string base64 JPEG válido
- [ ] Frame se escala proporcionalmente si excede max width
- [ ] Cleanup en unmount no deja streams activos
- [ ] `pnpm build` pasa sin errores TypeScript
