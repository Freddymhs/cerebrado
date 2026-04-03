# Pendiente / Investigar

---

## E — Electron wrapper (audio del sistema completo)

**Idea:** wrappear el Next.js existente en Electron para acceder a `desktopCapturer` — captura audio de cualquier app (Zoom, Teams, etc.), sin restricciones del browser.  
**Por qué no ahora:** es una nueva capa de infraestructura, no es urgente mientras el caso de uso sea browser tabs.  
**Alternativa sin código:** instalar BlackHole (Mac) o PulseAudio monitor source (Linux) — expone el audio del sistema como micrófono virtual, el browser lo ve como `getUserMedia`.  
**Prioridad:** alta para distribución como app de escritorio. Media si solo se usa localmente.

---

Items que requieren investigación o son complejos para implementar ahora.

---

## A — Persistencia de frames

**Idea:** después de N frames, volcar a disco y liberar memoria. Cargar al retomar.  
**Problema:** browser no puede escribir a disco directamente desde un Worker.  
**Opciones a investigar:** IndexedDB (browser), endpoint `/api/save-session`, Service Worker cache.  
**Prioridad:** baja — 10 frames en memoria es suficiente por ahora.

---

## B — Modo Estudio: audio + video sincronizados

**Idea:** analizar al mismo tiempo el frame visible y el transcript del audio del sistema.  
**Problema:** sincronizar timing entre chunks de audio (12s) y frames de video (3s) sin duplicar contexto.  
**Opciones a investigar:** adjuntar transcript acumulado al prompt del frame; o analizar solo cuando hay nuevo transcript.  
**Prioridad:** media — depende de que el audio pipeline esté estable primero.

---

## C — Token budget por modo

**Idea:** contar tokens antes de enviar para no exceder límites del modelo.  
**Problema:** contar tokens exacto requiere tiktoken (solo Node, no browser). Estimación por chars es imprecisa.  
**Opciones a investigar:** `tiktoken` server-side en el API route, o límite conservador por longitud de string.  
**Prioridad:** baja — los prompts actuales son cortos. Problema real cuando el transcript sea largo.

---

## D — Compresión de contexto visual (frames)

**Idea:** resumir frames anteriores en texto antes de descartarlos, para mantener contexto histórico sin imagen.  
**Problema:** las imágenes no se pueden "resumir" como texto sin perder información visual. Requiere llamada extra al modelo.  
**Opciones a investigar:** extraer summary textual de cada frame antes de descartarlo, acumularlo como contexto.  
**Prioridad:** baja — el historial de 10 frames ya captura el texto del summary.
