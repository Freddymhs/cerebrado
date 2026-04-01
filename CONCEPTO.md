# CEREBRADO - Concepto Completo

**Personal AI Learning Companion**
**Fecha:** Marzo 2026

---

## Tabla de Contenidos

1. [Vision y Contexto](#1-vision-y-contexto)
2. [Plan MVP](#2-plan-mvp)
3. [Hallazgos Clave de Investigacion](#3-hallazgos-clave-de-investigacion)
4. [APIs de Navegador para Captura](#4-apis-de-navegador-para-captura)
5. [Extensiones de Navegador](#5-extensiones-de-navegador)
6. [Modelos de Vision en el Navegador](#6-modelos-de-vision-en-el-navegador)
7. [Proyectos Existentes](#7-proyectos-existentes)
8. [Arquitectura Web + Desktop Hibrida](#8-arquitectura-web--desktop-hibrida)
9. [Matriz Comparativa y Limitaciones](#9-matriz-comparativa-y-limitaciones)
10. [Ejemplos de Codigo](#10-ejemplos-de-codigo)
11. [FAQ y Troubleshooting](#11-faq-y-troubleshooting)
12. [Referencias](#12-referencias)

---

## 1. Vision y Contexto

Herramienta personal de aprendizaje que observa la pantalla y da feedback en tiempo real. **No es para hacer trampa** -- es para mejorar habilidades de coding y arquitectura. Se inspira en Cluely pero con proposito educativo: analizar videos tecnicos, feedback de codigo en vivo, y ayuda con certificaciones (AWS, etc.).

**AI Provider**: Gemini 2.5 Flash (barato, vision nativa). Abstraido detras de Strategy Pattern para poder cambiar a Claude, OpenAI u Ollama local sin tocar el resto del codigo.

**Prioridad de casos de uso**: Videos tecnicos -> Coding en vivo -> Certificaciones

### Proyectos de Referencia

| Proyecto | Vision | Stealth | Local | Mejor Para |
|----------|--------|---------|-------|-----------|
| **Natively** (537 stars) | si | si | si | Entrevistas codigo |
| **Pluely** (Tauri) | si | si | si | Generalista |
| **Phantom-AI** | si | si+ | si | Maximo stealth |
| **Screenpipe** | si | - | si | Captura continua |

**Oportunidad de Cerebrado:** Analisis comportamental + feedback iterativo + adaptacion por modo de estudio.

---

## 2. Plan MVP

### Stack

```
Next.js 16 (App Router) + React 19 + TypeScript
Gemini 2.5 Flash API (@google/generative-ai)
getDisplayMedia() -- captura pantalla/monitor
Canvas API + Web Workers -- extraccion de frames
Vercel -- hosting gratuito
```

Sin LangChain, sin Supabase en MVP (no se necesita auth/storage en v1 personal).

### Arquitectura

#### 2.1 AI Provider Abstraction (Strategy Pattern)

```typescript
// src/lib/ai/types.ts
interface AIProvider {
  analyzeScreen(imageBase64: string, context: string): Promise<AnalysisResult>
  analyzeText(text: string, context: string): Promise<AnalysisResult>
}

interface AnalysisResult {
  summary: string
  insights: string[]
  suggestions: string[]
  mode: 'video' | 'coding' | 'certification'
}
```

```typescript
// src/lib/ai/providers/gemini.ts   <- implementacion principal
// src/lib/ai/providers/ollama.ts   <- fallback local
// src/lib/ai/factory.ts            <- seleccion por env var AI_PROVIDER
```

#### 2.2 Screen Capture

```typescript
// src/hooks/useScreenCapture.ts
// - getDisplayMedia() con opciones de monitor/ventana/tab
// - MediaRecorder para grabacion opcional
// - Cleanup automatico en unmount
```

#### 2.3 Frame Analysis Pipeline

```typescript
// src/workers/analysisWorker.ts    <- Web Worker (no bloquea UI)
// src/hooks/useFrameAnalysis.ts    <- intervalo configurable (2-5s para analisis)
// src/lib/frameExtractor.ts        <- Canvas -> base64
```

#### 2.4 Modos de analisis

| Modo | Trigger | Que hace Gemini |
|------|---------|-----------------|
| `video` | Usuario activa mientras ve video | Resume, explica conceptos, responde preguntas |
| `coding` | Detecta editor en pantalla | Analiza estilo, arquitectura, sugiere mejoras |
| `certification` | Usuario activa en examen/curso | Lee preguntas, explica conceptos (NO da respuestas) |

### Estructura de archivos

```
src/
  app/
    page.tsx                    <- UI principal
    api/analyze/route.ts        <- proxy a Gemini (protege API key)

  lib/
    ai/
      types.ts                  <- AIProvider interface + AnalysisResult
      factory.ts                <- getAIProvider() por env
      providers/
        gemini.ts
        ollama.ts
    frameExtractor.ts           <- canvas -> base64

  hooks/
    useScreenCapture.ts         <- getDisplayMedia wrapper
    useFrameAnalysis.ts         <- analisis periodico

  workers/
    analysisWorker.ts           <- Web Worker para no bloquear UI

  components/
    CaptureControls.tsx         <- start/stop + selector de modo
    AnalysisPanel.tsx           <- muestra insights en tiempo real
    ModeSelector.tsx            <- video / coding / certification

  constants/
    analysis.ts                 <- intervalos, prompts base, modos
```

### Variables de entorno

```bash
# .env.local (nunca al repo)
GEMINI_API_KEY=...
AI_PROVIDER=gemini          # gemini | ollama
OLLAMA_BASE_URL=http://localhost:11434
ANALYSIS_INTERVAL_MS=3000   # cada cuanto analiza
```

### Prompts por modo

Definidos en `src/constants/analysis.ts` -- nunca hardcodeados inline:

- **video**: "Estas viendo mi pantalla. Resume lo que explica el video y destaca los conceptos clave de software/arquitectura."
- **coding**: "Analiza el codigo visible. Identifica patrones, posibles mejoras de arquitectura, y codigo que no sigue buenas practicas."
- **certification**: "Veo que estoy estudiando para una certificacion. Explica los conceptos que aparecen en pantalla para que los entienda profundamente."

### Pasos de implementacion

1. `npx create-next-app@latest cerebrado-app --typescript --app`
2. Instalar `@google/generative-ai`
3. Crear `src/lib/ai/` -- types, factory, providers (gemini + ollama stub)
4. Crear `src/hooks/useScreenCapture.ts` (basado en codigo ya investigado)
5. Crear `src/workers/analysisWorker.ts` + `useFrameAnalysis.ts`
6. Crear `src/app/api/analyze/route.ts` (proxy server-side para proteger API key)
7. Crear UI minima: CaptureControls + AnalysisPanel + ModeSelector
8. Deploy a Vercel

### Verificacion MVP

- [ ] `getDisplayMedia()` muestra selector de monitor/ventana/tab
- [ ] Frame se extrae correctamente a base64 via Canvas
- [ ] Gemini recibe imagen y responde en < 3s
- [ ] Cambiar `AI_PROVIDER=ollama` en `.env.local` y funciona sin tocar codigo
- [ ] Web Worker no bloquea UI durante analisis
- [ ] `npm run build` pasa sin errores TypeScript

---

## 3. Hallazgos Clave de Investigacion

### 3.1 APIs de Navegador Estan Maduras (2024-2026)

`getDisplayMedia()` funciona en Chrome, Firefox, Safari, Edge:
- Soporta captura de monitor, ventana o tab
- Audio del sistema disponible (con limitaciones por OS)
- HTTPS requerido (salvo localhost)

`MediaRecorder` API estandar para grabacion:
- VP8+Opus: maxima compatibilidad (Chrome, Firefox)
- VP9+Opus: mejor compresion (Chrome, Edge)
- H264: Solo Safari (ecosistema Apple)

**Conclusion:** Web puro viable para MVP sin instalacion

### 3.2 TensorFlow.js vs ONNX Runtime: Ambos Viables

| Metrica | TensorFlow.js | ONNX Runtime |
|---------|---------------|--------------|
| Pose Detection | si (27MB) | si (13MB) |
| Rendimiento WebGPU | 3x WebGL | 3-8x WebGL |
| Modelos disponibles | 100+ tfjs | 1000+ Hugging Face |
| Recomendacion | **Mejor para inicio** | **Mejor para produccion** |

**Conclusion:** Comenzar con TensorFlow.js, migrar a ONNX si necesita performance

### 3.3 WebGPU es Game-Changer

```
Latencia token LLM (Phi-3-mini):
- WebGL:  320ms/token
- WebGPU:  85ms/token  <- 3.76x mas rapido
```

Soporte actual:
- Chrome 113+, Edge 113+
- Firefox 141+ (solo Windows)
- Safari (aun no)

**Conclusion:** Usar WebGPU si target es Chrome/Edge, fallback a WebGL

### 3.4 Extensiones Chrome Viables pero Complicadas

**Manifest V3 (obligatorio 2025):**
- `chrome.desktopCapture` API disponible
- `eval()` no permitido (usar sandbox)
- Acceso limitado a iframes

**Limitaciones en sitios de terceros:**
- LeetCode: Bloquea scripts de extension
- HackerRank: CSP restrictivo
- CoderPad: Mas permisivo
- Interview.io: WebRTC level (imposible de bypassear)

**Conclusion:** Extension posible pero con limitaciones. Web app es mas viable.

### 3.5 Analisis en Tiempo Real: Cuidado con Rendimiento

```
Frame extraction @ 1080p:
- canvas.getImageData():  5-10ms (bloqueante)
- Limit practico:         30fps maximo
- PoseNet inference:      ~30ms/frame
- Total budget/frame:     16.66ms (60fps)
```

**Solucion:** Web Workers para procesamiento fuera del main thread

**Conclusion:** Necesario multi-threading; sin eso, UI bloqueara

### 3.6 Tauri Supera Electron para Este Caso

| Aspecto | Electron | Tauri |
|---------|----------|-------|
| Bundle size | 150-200MB | 10-20MB |
| Memory | 200+ MB idle | 50-100MB idle |
| APIs nativas | Node.js (complejo) | Rust (directo) |
| Captura pantalla | getUserMedia | Screencap nativa (80MB+) |
| Recomendacion | Legacy apps | **Nuevo proyecto** |

**Conclusion:** Tauri v2 es mejor opcion para cross-platform (web + desktop)

### 3.7 Integracion AI Vision API Funciona Excelentemente

- Vision API soporta base64 images
- 100K token context window
- Deteccion de codigo en screenshots

**Caso de uso ideal:** Analisis de problema + codigo en tiempo real

---

## 4. APIs de Navegador para Captura

### 4.1 Screen Capture API (`getDisplayMedia()`)

**Documentacion oficial:**
- [MDN: Using the Screen Capture API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Capture_API/Using_Screen_Capture)
- [MDN: MediaDevices.getDisplayMedia()](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia)
- [W3C Screen Capture Spec](https://www.w3.org/TR/screen-capture/)

**Soporte por navegador:**
- Chrome: v74+
- Firefox: v66+
- Safari: v13+
- Edge: v79+
- Opera: v60+

**Ejemplo de codigo basico:**
```javascript
const constraints = {
  video: {
    displaySurface: "monitor" // "monitor", "window", "browser"
  },
  audio: true
};

async function captureScreen() {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia(constraints);
    const video = document.getElementById('preview-video');
    video.srcObject = stream;
    return stream;
  } catch (err) {
    if (err.name === 'NotAllowedError') {
      console.log('Usuario cancelo la captura');
    } else if (err.name === 'NotFoundError') {
      console.log('No hay pantalla disponible');
    }
  }
}
```

**Limitaciones por navegador:**

| Navegador | Limitacion |
|-----------|-----------|
| Firefox | Audio solo disponible en Windows |
| Safari | Limitado a usuario explicitamente autorizado, sin audio |
| Chrome | No soporta captura simultanea de multiples monitores en una sola stream |
| Todos | Requiere HTTPS (salvo localhost) |

**Configuraciones de seguridad:**

```
Permissions-Policy: display-capture=(self "https://trusted-domain.com")
Content-Security-Policy: img-src 'self' blob:; default-src 'self'
```

```html
<iframe sandbox="allow-same-origin allow-scripts" allow="display-capture"></iframe>
```

### 4.2 MediaRecorder API

**Documentacion:** [MDN: MediaStream Recording API](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_Recording_API)

**Ejemplo de grabacion con compresion:**
```javascript
async function recordScreenWithAudio() {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: true
  });

  const audioContext = new AudioContext();
  const audioSource = audioContext.createMediaStreamSource(stream);
  const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const micSource = audioContext.createMediaStreamSource(micStream);
  const destination = audioContext.createMediaStreamDestination();

  audioSource.connect(destination);
  micSource.connect(destination);

  const recorder = new MediaRecorder(destination.stream, {
    mimeType: 'video/webm;codecs=vp9,opus',
    videoBitsPerSecond: 5000000
  });

  const chunks = [];
  recorder.ondataavailable = (e) => chunks.push(e.data);
  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    downloadVideo(url);
  };

  recorder.start();
  return recorder;
}
```

**MIME types soportados:**
- Chrome: `video/webm;codecs=vp9,opus`, `video/webm;codecs=vp8,opus`
- Firefox: `video/webm;codecs=vp8,vorbis`, `audio/webm;codecs=opus`
- Safari: `video/mp4` (Webkit)

### 4.3 Canvas API para Analisis

**Documentacion:**
- [MDN: Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [MDN: Optimizing Canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas)

**Ejemplo: Captura de frames para analisis:**
```javascript
async function captureFramesForAnalysis(stream, fps = 5) {
  const video = document.createElement('video');
  video.srcObject = stream;
  video.play();

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const frameInterval = 1000 / fps;
  let lastTime = 0;

  function processFrame(currentTime) {
    if (currentTime - lastTime >= frameInterval) {
      ctx.drawImage(video, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      analyzeWorker.postMessage({
        pixels: imageData.data,
        width: canvas.width,
        height: canvas.height
      });

      lastTime = currentTime;
    }
    requestAnimationFrame(processFrame);
  }

  requestAnimationFrame(processFrame);
}
```

**Limitaciones de rendimiento:**
- Frame rate 60fps maximo en main thread (16.66ms budget)
- `getImageData()` es operacion sincrona y costosa
- `willReadFrequently: true` mejora lecturas pero desactiva GPU acceleration
- Canvas 1080p @ 30fps requiere optimizacion agresiva

**Optimizacion con OffscreenCanvas:**
```javascript
const offscreenCanvas = canvas.transferControlToOffscreen();
const worker = new Worker('canvas-worker.js');
worker.postMessage({ canvas: offscreenCanvas }, [offscreenCanvas]);
```

### 4.4 ImageCapture Interface

**Documentacion:** [MediaStream Image Capture API](https://www.w3.org/TR/image-capture/)

```javascript
async function captureHighQualityImage(stream) {
  const video = stream.getVideoTracks()[0];
  const imageCapture = new ImageCapture(video);

  const capabilities = await imageCapture.getPhotoCapabilities();
  console.log('ISO range:', capabilities.iso);

  try {
    const bitmap = await imageCapture.grabFrame();
    return bitmap;
  } catch (err) {
    console.error('Error capturando frame:', err);
  }
}
```

### 4.5 Limitaciones por Plataforma

**Google Meet:**
- Usa WebRTC (getUserMedia + RTCPeerConnection)
- Audio del sistema solo en Chrome (Linux), Chrome (Windows 10+)

**Zoom:**
- NO usa WebRTC en version clasica (stack propietario en WASM)
- Zoom Video SDK v2: Usa WebRTC + WebAssembly decoder

**CoderPad/LeetCode/HackerRank:**
- NO exponen APIs de captura directa (sandboxing de seguridad)
- Cheating prevention: Monitoreo de tab switches, focus changes
- Bloquean extensiones que intenten inyectar codigo

---

## 5. Extensiones de Navegador

### 5.1 APIs de Captura en Extensiones

**Chrome:**
- `chrome.desktopCapture.chooseDesktopMedia()` - permite elegir monitor/ventana/tab
- `chrome.tabs.captureVisibleTab()` - captura de la pestana activa
- Requiere permisos: `"desktopCapture"`, `"tabs"` en manifest.json

**Firefox:**
- `browser.tabs.captureVisibleTab()` - captura de pestana visible
- Sin equivalente directo a desktopCapture (sin API nativa)

**Edge:**
- Mismo modelo que Chrome (Chromium)
- `chrome.desktopCapture` API disponible

### 5.2 Inyeccion de Codigo en Sitios de Terceros

**Manifest V3 (Chrome/Edge - obligatorio 2025):**
```json
{
  "manifest_version": 3,
  "permissions": ["scripting"],
  "host_permissions": [
    "https://leetcode.com/*",
    "https://www.hackerrank.com/*",
    "https://coderpad.io/*",
    "https://www.codesignal.com/*"
  ],
  "content_scripts": [
    {
      "matches": ["https://leetcode.com/*"],
      "js": ["content-script.js"],
      "run_at": "document_start"
    }
  ]
}
```

**Manifest V2 (Firefox - aun permitido):**
```json
{
  "manifest_version": 2,
  "permissions": ["<all_urls>"],
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content-script.js"]
    }
  ]
}
```

**Content Script - Inyeccion Segura:**
```javascript
const platform = detectPlatform();

function injectScript(code) {
  const script = document.createElement('script');
  script.textContent = code;
  (document.head || document.documentElement).appendChild(script);
}

window.addEventListener('message', (e) => {
  if (e.source === window && e.data.type === 'CAPTURE_SCREEN') {
    chrome.runtime.sendMessage(
      { action: 'captureScreen', platform },
      (response) => {
        window.postMessage({
          type: 'SCREEN_CAPTURED',
          data: response
        }, '*');
      }
    );
  }
});

function detectPlatform() {
  if (location.hostname.includes('leetcode')) return 'leetcode';
  if (location.hostname.includes('hackerrank')) return 'hackerrank';
  if (location.hostname.includes('coderpad')) return 'coderpad';
  if (location.hostname.includes('codesignal')) return 'codesignal';
  if (location.hostname.includes('interview.io')) return 'interviewio';
  return 'unknown';
}
```

**Background Service Worker (MV3):**
```javascript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureScreen') {
    captureScreen(sender.tab.windowId).then(streamId => {
      sendResponse({ streamId });
    });
  }
});

async function captureScreen(windowId) {
  return new Promise((resolve, reject) => {
    chrome.desktopCapture.chooseDesktopMedia(
      ['screen', 'window', 'tab'],
      { targetTab: windowId },
      (streamId) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        }
        resolve(streamId);
      }
    );
  });
}
```

### 5.3 Diferencias Chrome vs Firefox vs Edge

| Feature | Chrome (MV3) | Firefox (MV2) | Edge |
|---------|-------------|---------------|------|
| desktopCapture API | si Nativa | No existe | si Nativa |
| captureVisibleTab | si | si | si |
| Persistent background | No (Service Workers) | si (Background scripts) | No |
| Message routing | Popup -> SW -> Content script | Flexible (directo) | Popup -> SW |
| Eval/Dynamic code | Sandbox page required | Allowed in MV2 | Sandbox page required |
| Iframe permissions | Requiere display-capture explicito | Similar | Requiere display-capture |

### 5.4 Seguridad y Limitaciones

**Problemas conocidos:**

1. **Prompt Injection (Claude Extension flaw):**
   - Riesgo: Origin allowlist overly permissive (*.claude.ai)
   - Mitigacion: Exact origin matching, strict CSP

2. **Third-party Storage Partitioning (CodeSignal issue):**
   - Chrome `chrome://flags/#third-party-storage-partitioning` rompe SSO

3. **CSP Bypass:** Algunos sitios permiten inyeccion a traves de iframes sandboxed

---

## 6. Modelos de Vision en el Navegador

### 6.1 TensorFlow.js

**Sitios oficiales:**
- [TensorFlow.js](https://www.tensorflow.org/js)
- [GitHub: tensorflow/tfjs](https://github.com/tensorflow/tfjs)

**Modelos disponibles:**
- MobileNet (clasificacion de imagenes)
- PoseNet (estimacion de postura humana)
- BlazeFace (deteccion de cara)
- HandPose (deteccion de manos)
- BodyPix (segmentacion de cuerpo)
- UniversalSentenceEncoder (procesamiento de texto)

**Ejemplo: Deteccion de postura en tiempo real:**
```javascript
import * as posenet from '@tensorflow-models/posenet';
import * as tf from '@tensorflow/tfjs';

async function detectPoseRealtime(videoElement) {
  const net = await posenet.load({
    architecture: 'MobileNetV1',
    outputStride: 16,
    inputResolution: { width: 640, height: 480 },
    multiplier: 0.75
  });

  async function poseDetectionFrame() {
    const poses = await net.estimateMultiplePoses(videoElement, {
      flipHorizontal: false,
      maxDetections: 5,
      scoreThreshold: 0.5
    });

    poses.forEach(pose => {
      const keypoints = pose.keypoints;
      const nose = keypoints.find(k => k.part === 'nose');
      const leftEye = keypoints.find(k => k.part === 'leftEye');
      const rightEye = keypoints.find(k => k.part === 'rightEye');

      if (nose.score > 0.5) {
        analyzeHeadDirection(nose, leftEye, rightEye);
      }
    });

    requestAnimationFrame(poseDetectionFrame);
  }

  poseDetectionFrame();
}

function analyzeHeadDirection(nose, leftEye, rightEye) {
  const eyeDistance = Math.hypot(
    leftEye.position.x - rightEye.position.x,
    leftEye.position.y - rightEye.position.y
  );

  const noseX = nose.position.x;
  const eyeCenterX = (leftEye.position.x + rightEye.position.x) / 2;
  const deviation = (noseX - eyeCenterX) / eyeDistance;

  if (Math.abs(deviation) > 0.3) {
    console.warn('Mirando fuera de pantalla');
  }
}
```

**Backends disponibles:**
- **WebGL:** Compatible con la mayoria de navegadores, GPU acceleration
- **WebGPU:** 3-8x mas rapido que WebGL, requiere Chrome/Edge 113+, Firefox 141+
- **WASM:** Fallback universal, mas lento

```javascript
await tf.setBackend('webgpu'); // O 'webgl', 'cpu'
```

### 6.2 ONNX Runtime Web

**Sitios oficiales:**
- [ONNX Runtime Web Documentation](https://onnxruntime.ai/docs/tutorials/web/)
- [GitHub: microsoft/onnxruntime](https://github.com/microsoft/onnxruntime)

**Ventajas:**
- Soporta modelos PyTorch, TensorFlow, scikit-learn
- Backends: WebAssembly (CPU), WebGL, WebGPU, WebNN
- Mejor performance que TensorFlow.js en muchos casos

**Ejemplo: Inference con ONNX:**
```javascript
import * as ort from 'onnxruntime-web';

async function runONNXInference() {
  try {
    await ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/';
    const gpuSession = await ort.InferenceSession.create(
      'model.onnx',
      { executionProviders: ['webgpu', 'wasm'] }
    );
  } catch (e) {
    const session = await ort.InferenceSession.create('model.onnx');
  }

  const canvas = document.createElement('canvas');
  canvas.width = 224;
  canvas.height = 224;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoElement, 0, 0, 224, 224);

  const imageData = ctx.getImageData(0, 0, 224, 224);
  const pixels = new Float32Array(224 * 224 * 3);

  for (let i = 0; i < imageData.data.length; i += 4) {
    pixels[Math.floor(i / 4) * 3 + 0] = imageData.data[i] / 255.0;
    pixels[Math.floor(i / 4) * 3 + 1] = imageData.data[i + 1] / 255.0;
    pixels[Math.floor(i / 4) * 3 + 2] = imageData.data[i + 2] / 255.0;
  }

  const tensor = new ort.Tensor('float32', pixels, [1, 3, 224, 224]);
  const results = await session.run({ images: tensor });
  const output = results.output.data;
  const topClass = Array.from(output).indexOf(Math.max(...output));
  console.log('Top class:', topClass);
}
```

### 6.3 WebAssembly para Modelos Locales

**Proyectos que habilitan LLMs en navegador:**

1. **WebLLM** ([mlc-ai/web-llm](https://github.com/mlc-ai/web-llm))
   - LLMs completos (Llama, Mistral) en navegador
   - WebGPU + WASM
   ```javascript
   import { MLCEngine } from "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@latest";

   const engine = new MLCEngine();
   const response = await engine.chat.completions.create({
     model: "Llama-2-7b-chat-hf-q4f32_1",
     messages: [
       { role: "user", content: "Analiza este codigo Python..." }
     ]
   });
   ```

2. **Transformers.js** ([xenova/transformers.js](https://github.com/xenova/transformers.js))
   - Modelos de Hugging Face en WASM
   ```javascript
   import { pipeline } from "https://cdn.jsdelivr.net/npm/@xenova/transformers";

   const classifier = await pipeline('image-classification', 'Xenova/vit-base-patch16-224');
   const result = await classifier('image.jpg');
   ```

3. **Ollama WASM** (Experimental)
   - Correr Ollama localmente + navegador como cliente
   - No hay version pura WASM aun, requiere servidor backend

**Limitaciones de LLMs en navegador:**

| Aspecto | Limitacion |
|--------|-----------|
| Tamano modelo | 7B max (4-bit quantized), 3-4B tipico |
| Latencia | 100-500ms/token en M2 MacBook |
| Memoria | 4-8GB RAM consumidos |
| Duracion sesion | Limitado a vida de pestana |

### 6.4 WebGPU vs WebGL - Comparativa de Performance

**Benchmarks de Inference (Phi-3-mini en M2 MacBook):**
- WebGL: **320ms/token**
- WebGPU: **85ms/token**
- **Speedup: 3.76x**

**En RTX 3060 (4096x4096 matrix ops):**
- WebGL: ~5.5x mas lento
- WebGPU: 3-8x mas rapido que WebGL

**Arquitectura diferencial:**
- **WebGL:** Compute via fragment shaders, texturas como almacenamiento
- **WebGPU:** Compute pipeline nativo, storage buffers, shared memory, workgroups

**Soporte de navegadores (2026):**
- Chrome/Edge: Enabled by default
- Firefox: v141+ (Windows), experimental (Mac/Linux)
- Safari: No (requiere WebKit implementacion)

---

## 7. Proyectos Existentes

### 7.1 Extensiones de Screen Capture + Analysis

**1. Interview Coder (Codigo Abierto)**
- GitHub: [j4wg/interview-coder-withoupaywall-opensource](https://github.com/j4wg/interview-coder-withoupaywall-opensource)
- Stack: React + Chrome Extension + GPT-4 Vision
- Flujo:
  ```
  Content Script -> Captura canvas del problema
  -> Envia a Extension Service Worker
  -> Envia a Claude/GPT-4V
  -> Retorna analisis
  ```

**2. Vision Agent**
- GitHub: [suneelmatham/vision-agent](https://github.com/suneelmatham/vision-agent)
- Permite compartir pantalla con Vision LLMs (GPT-4V, LLaVA)

**3. AI Screen Analyzer**
- GitHub: [bigsk1/ai-screen-analyzer](https://github.com/bigsk1/ai-screen-analyzer)
- Soporta multiples providers: OpenAI, Anthropic, Ollama

**4. DeepCamera**
- GitHub: [SharpAI/DeepCamera](https://github.com/SharpAI/DeepCamera)
- Local VLM video analysis (Qwen, DeepSeek, LLaVA, SmolVLM)
- YOLO26 para deteccion de objetos

### 7.2 WebRTC + Screen Sharing + AI

**Arquitectura tipica:**
```
Browser A (Interviewer)
  | (WebRTC + getDisplayMedia)
  |-> RTCPeerConnection
  |-> MediaRecorder
    |
Signaling Server (WebSocket)
    |
Browser B (Candidate)
  |-> Receive stream
  |-> MediaRecorder (local)
  |-> Canvas/Analysis (opcional)

Backend (Optional):
  |-> FFmpeg transcoding
  |-> Vision LLM analysis
  |-> Storage (S3, Blob)
```

---

## 8. Arquitectura Web + Desktop Hibrida

### 8.1 Tauri + React (Recomendado)

**Documentacion:**
- [Tauri v2 Official](https://v2.tauri.app/)

**Arquitectura:**
```
Monorepo (pnpm workspaces)
|
|-- apps/web       (Next.js)
|-- apps/desktop   (Tauri + React)
|
|-- packages/shared
    - API client
    - Types/DTOs
    - Business logic
    - UI components (React)
```

**Logica compartida:**
```typescript
// packages/shared/src/screen-capture.ts
export interface ScreenCaptureOptions {
  fps?: number;
  quality?: 'low' | 'medium' | 'high';
  enableAudio?: boolean;
}

export interface ScreenAnalysisResult {
  timestamp: number;
  hasCode: boolean;
  codeDetectionScore: number;
  facingAway: boolean;
  tabSwitches: number;
}

export abstract class ScreenCaptureService {
  abstract startCapture(options: ScreenCaptureOptions): Promise<MediaStream>;
  abstract stopCapture(): void;
  abstract captureFrame(): Promise<ImageData>;
  abstract recordSession(filename: string): Promise<void>;
}
```

**Web Implementation (Next.js):**
```typescript
// apps/web/src/services/WebScreenCaptureService.ts
import { ScreenCaptureService, ScreenCaptureOptions } from '@shared/screen-capture';

export class WebScreenCaptureService extends ScreenCaptureService {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;

  async startCapture(options: ScreenCaptureOptions): Promise<MediaStream> {
    this.stream = await navigator.mediaDevices.getDisplayMedia({
      video: { cursor: 'always' },
      audio: options.enableAudio ?? false
    });

    if (options.fps) {
      await this.setupFpsLimiter(options.fps);
    }

    return this.stream;
  }

  stopCapture(): void {
    this.stream?.getTracks().forEach(track => track.stop());
  }

  async captureFrame(): Promise<ImageData> {
    if (!this.stream) throw new Error('Captura no iniciada');

    const video = document.createElement('video');
    video.srcObject = this.stream;
    video.play();

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);

    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  async recordSession(filename: string): Promise<void> {
    if (!this.stream) throw new Error('No active stream');

    this.recorder = new MediaRecorder(this.stream, {
      mimeType: 'video/webm;codecs=vp9,opus'
    });

    const chunks: Blob[] = [];
    this.recorder.ondataavailable = e => chunks.push(e.data);
    this.recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
    };

    this.recorder.start();
  }

  private async setupFpsLimiter(targetFps: number): Promise<void> {
    // Implementacion de limitador de FPS
  }
}
```

**Desktop Implementation (Tauri):**
```typescript
// apps/desktop/src/services/TauriScreenCaptureService.ts
import { ScreenCaptureService, ScreenCaptureOptions } from '@shared/screen-capture';
import { invoke } from '@tauri-apps/api/core';

export class TauriScreenCaptureService extends ScreenCaptureService {
  async startCapture(options: ScreenCaptureOptions): Promise<MediaStream> {
    const stream = await invoke<MediaStream>('start_screen_capture', {
      enableAudio: options.enableAudio ?? false,
      targetFps: options.fps
    });
    return stream;
  }

  stopCapture(): void {
    invoke('stop_screen_capture');
  }

  async captureFrame(): Promise<ImageData> {
    const data = await invoke<ImageData>('capture_frame');
    return data;
  }

  async recordSession(filename: string): Promise<void> {
    await invoke('record_session', { filename });
  }
}
```

**Rust Backend (Tauri):**
```rust
// src-tauri/src/screen_capture.rs
use screenshots::Screen;
use std::sync::Mutex;

pub struct ScreenCaptureState {
    capturing: Mutex<bool>,
}

#[tauri::command]
pub async fn start_screen_capture(
    enable_audio: bool,
    target_fps: Option<u32>,
    state: tauri::State<'_, ScreenCaptureState>
) -> Result<String, String> {
    let mut capturing = state.capturing.lock().unwrap();
    *capturing = true;

    let screen = Screen::all()
        .map_err(|e| e.to_string())?
        .into_iter()
        .find(|s| s.is_primary())
        .ok_or("No screen found")?;

    let image = screen.capture()
        .map_err(|e| e.to_string())?;

    let path = std::env::temp_dir().join("screen_capture.png");
    image.save(&path)
        .map_err(|e| e.to_string())?;

    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn stop_screen_capture(
    state: tauri::State<'_, ScreenCaptureState>
) -> Result<(), String> {
    let mut capturing = state.capturing.lock().unwrap();
    *capturing = false;
    Ok(())
}
```

### 8.2 React Native y Flutter (Alternativas)

**React Native:**
- No soporte nativo de getDisplayMedia
- Requiere platform-specific code
- Mejor para UI shared, logica analysis

**Flutter:**
- 100% codigo compartido entre plataformas
- Rendimiento superior en desktop (Skia)
- Captura de pantalla requiere plugins nativos

---

## 9. Matriz Comparativa y Limitaciones

### 9.1 getDisplayMedia() Soporte y Limitaciones

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Screen capture | si v74+ | si v66+ | si v13+ | si v79+ |
| Window capture | si | si | si | si |
| Tab capture | si | si (limitado) | No (privacidad) | si |
| Audio del sistema | si Win10+ | si Windows | No | si |
| Audio microfono | si | si | si | si |
| HTTPS requerido | si | si | si | si |
| FPS maximo | 60 | 60 | 30 | 60 |
| Resolucion maxima | Nativa | Nativa | 720p | Nativa |

### 9.2 MediaRecorder MIME Types

| Codec | Chrome | Firefox | Safari | Edge |
|-------|--------|---------|--------|------|
| VP9 + Opus | si | No | No | si |
| VP8 + Opus | si | si | No | si |
| VP8 + Vorbis | No | si | No | No |
| H264 + AAC | No | No | si | No |
| H264 + Opus | Experimental | No | No | Experimental |

**Recomendacion:** Usar VP8 para maxima compatibilidad (Chrome, Firefox)

### 9.3 Frameworks ML en Navegador

| Aspecto | TensorFlow.js | ONNX Runtime |
|--------|---------------|--------------|
| Modelos soportados | TF, Keras, PyTorch (limitado) | TF, PyTorch, scikit-learn |
| Backends | WebGL, WebGPU, CPU (WASM) | WASM, WebGL, WebGPU, WebNN |
| Performance WebGPU | 3x mas rapido | 3-8x mas rapido |
| Tamano bundle | 5.8MB (tfjs-core) | 2.5MB (ONNX runtime) |
| Documentacion | Excelente | Buena |
| Comunidad | Muy grande | Creciendo |
| Modelos pre-entrenados | 100+ en tfjs-models | 1000+ en Hugging Face |
| Quantization | int8, float16 | int8, float16, uint8 |

### 9.4 Benchmarks en MacBook Air M2

**Inferencia token generativo (Phi-3-mini):**
```
TensorFlow.js (WebGL):     320 ms/token
ONNX Runtime (WebGL):      280 ms/token
ONNX Runtime (WebGPU):      85 ms/token
ONNX Runtime (WASM):       500+ ms/token
```

**Pose Detection (PoseNet):**
```
640x480 @ 30fps:
- TensorFlow.js:    ~30ms/frame
- ONNX alternative: ~25ms/frame
```

### 9.5 Permisos Requeridos por Tarea (Extensiones)

| Tarea | Chrome (MV3) | Firefox (MV2) | Dificultad |
|------|------------|---------------|-----------|
| Captura de tab | `tabs`, `scripting` | `activeTab` | Facil |
| Captura de pantalla | `desktopCapture`, `tabs` | No existe API | Medio |
| Inyectar en LeetCode | `scripting`, host_permissions | `<all_urls>` | Medio |
| Capturar audio sistema | `desktopCapture` + audio | Muy limitado | Dificil |
| Almacenar localmente | `storage`, `unlimitedStorage` | `storage` | Facil |

### 9.6 Analisis de Deteccion Anti-Cheat

| Plataforma | Metodo | Detectable por Extension | Evasion Posible |
|-----------|--------|-------------------------|-----------------|
| **LeetCode** | JavaScript event listeners | Tab focus changes | Dificil |
| **HackerRank** | Viewport tracking | Click interception | Media |
| **CoderPad** | User activity monitoring | si (via content script) | si |
| **CodeSignal** | Browser DevTools detection | si | si |
| **Interview.io** | Screenshare validation | No (WebRTC level) | No (imposible) |
| **Zoom/Meet** | Proprietary monitoring | Depende | Muy dificil |

### 9.7 Consumo de Memoria por Modelo

| Modelo | Tamano | Memoria Runtime | GPU VRAM | Viable en Navegador |
|--------|--------|-----------------|----------|---------------------|
| PoseNet (MobileNet) | 27MB | 80MB | 100MB | Excelente |
| MobileNet v2 | 13MB | 60MB | 80MB | Excelente |
| Bert-small | 110MB | 200MB | 300MB | Bueno |
| DistilBERT | 268MB | 400MB | 500MB | Aceptable |
| Whisper (tiny) | 39MB | 100MB | 150MB | Excelente |
| Phi-3-mini (3.8B, int4) | 2GB | 4GB | 5GB | No practico |
| LLaVA-1.5 (7B, int4) | 4GB | 8GB | 10GB | Imposible |

### 9.8 Latencia por Operacion

```
Operacion                    Navegador      Desktop    Diferencia
-------------------------------------------------------------------
getDisplayMedia()            ~100ms         ~50ms      2x navegador
Canvas frame capture         ~5-10ms        ~2ms       5x navegador
PoseNet inference            ~30ms          ~15ms      2x navegador
ONNX WebGPU inference        ~50ms          ~20ms      2.5x
Claude/Gemini API call       ~1000ms        ~1000ms    Igual (red)
LocalLLM token gen (WASM)    ~300ms         ~100ms     3x navegador
```

### 9.9 Arbol de Decision: Que Stack Usar

```
|- Necesita funcionar offline?
|  |- Si -> Tauri / Electron
|  |- No -> Necesita codigo compartido con mobile?
|         |- Si -> Flutter
|         |- No -> Necesita maximo control?
|                |- Si -> Tauri + Rust
|                |- No -> Next.js + TensorFlow.js
|
|- Es extension del navegador?
|  |- Si -> Manifest V3 + chrome.desktopCapture
|  |- No -> (ver arriba)
|
|- Necesita capturar en sitios de terceros?
   |- Si -> Extension (puede fallar en some sites)
   |- No -> Web app nativa (mejor UX)
```

### 9.10 Tabla de Seleccion Rapida

| Caso | Stack | Razon |
|------|-------|-------|
| SaaS web puro | Next.js + TF.js | Simple, no instalacion, hosted |
| Desktop dedicada | Tauri + ONNX | Rendimiento, acceso nativo |
| Mobile + Web + Desktop | Flutter | 100% codigo compartido |
| Multiplataforma (web/desktop) | Tauri monorepo | Codigo compartido |
| Extension para LeetCode | MV3 + canvas | Inyeccion permite analisis |
| Maximo rendimiento | Tauri + C++/Rust | APIs nativas, sin limites JS |
| Maxima compatibilidad | WebGL + fallback | Soporta navegadores viejos |
| Presupuesto cero GPU | WASM + quantized | Corre en cualquier maquina |

### 9.11 Limitaciones Criticas

#### Imposible en Navegador Web Puro
1. Capturar audio de aplicacion especifica (solo Windows desktop API)
2. Acceder a archivos del candidato (sin input explicito)
3. Detectar virtualizaciones/VMs (anti-cheat imposible)
4. LLM locales grandes (7B+ no viables, memory limits)
5. Correr codigo malicioso con deteccion (JavaScript sandbox es limitado)

#### Requiere Arquitectura Cuidadosa
1. HTTPS obligatorio (getDisplayMedia)
2. Permisos explicitos por navegador
3. CSP compatible con scripts dinamicos
4. Memory leaks con streams/models
5. CORS en analisis cloud

#### Seguridad/Privacy
1. getDisplayMedia = acceso a informacion sensible
2. No hay forma de "verificar" si usuario sigue problema
3. Copiar texto es trivial (no detectable)
4. Extension puede ser detectada y removida

---

## 10. Ejemplos de Codigo

### 10.1 Captura Basica - Web App Next.js

```typescript
// app/hooks/useScreenCapture.ts
import { useCallback, useRef, useState } from 'react';

export const useScreenCapture = () => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);

  const startCapture = useCallback(async () => {
    try {
      setError(null);

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'window',
          frameRate: { ideal: 30, max: 60 }
        },
        audio: false
      });

      streamRef.current = stream;
      setIsCapturing(true);

      stream.getVideoTracks()[0].onended = () => {
        setIsCapturing(false);
      };

    } catch (err) {
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          setError('Captura cancelada por el usuario');
        } else if (err.name === 'NotFoundError') {
          setError('No hay pantalla disponible');
        } else {
          setError(err.message);
        }
      }
    }
  }, []);

  const stopCapture = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setIsCapturing(false);
    }
  }, []);

  const recordCapture = useCallback(
    async (mimeType: string = 'video/webm;codecs=vp9,opus') => {
      if (!streamRef.current) {
        setError('No hay captura activa');
        return;
      }

      const recorder = new MediaRecorder(streamRef.current, {
        mimeType,
        videoBitsPerSecond: 5000000
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `screen-${Date.now()}.webm`;
        a.click();

        URL.revokeObjectURL(url);
      };

      recorderRef.current = recorder;
      recorder.start();

      return {
        stop: () => recorder.stop(),
        pause: () => recorder.pause(),
        resume: () => recorder.resume()
      };
    },
    []
  );

  return {
    isCapturing,
    error,
    stream: streamRef.current,
    startCapture,
    stopCapture,
    recordCapture
  };
};
```

**Uso en Componente React:**
```tsx
// app/components/ScreenCaptureUI.tsx
'use client';

import { useScreenCapture } from '../hooks/useScreenCapture';
import { useEffect, useRef } from 'react';

export const ScreenCaptureUI = () => {
  const { isCapturing, error, stream, startCapture, stopCapture, recordCapture } = useScreenCapture();
  const videoRef = useRef<HTMLVideoElement>(null);
  const recorderControlsRef = useRef<ReturnType<typeof recordCapture> | null>(null);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="space-y-4 p-4">
      <div className="flex gap-2">
        <button
          onClick={() => startCapture()}
          disabled={isCapturing}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {isCapturing ? 'Capturando...' : 'Iniciar Captura'}
        </button>

        {isCapturing && (
          <>
            <button
              onClick={async () => { recorderControlsRef.current = await recordCapture(); }}
              className="px-4 py-2 bg-red-500 text-white rounded"
            >
              Grabar
            </button>
            <button
              onClick={() => { recorderControlsRef.current?.stop(); recorderControlsRef.current = null; }}
              className="px-4 py-2 bg-orange-500 text-white rounded"
            >
              Detener Grabacion
            </button>
            <button
              onClick={stopCapture}
              className="px-4 py-2 bg-gray-500 text-white rounded"
            >
              Detener Captura
            </button>
          </>
        )}
      </div>

      {error && <div className="text-red-500">{error}</div>}

      {isCapturing && (
        <video ref={videoRef} autoPlay className="border rounded w-full max-h-96" />
      )}
    </div>
  );
};
```

### 10.2 Recording + Analysis Pipeline

```typescript
// app/lib/screenAnalyzer.ts
import * as tf from '@tensorflow/tfjs';
import * as posenet from '@tensorflow-models/posenet';

export interface ScreenAnalysisResult {
  timestamp: number;
  hasFrame: boolean;
  faceDetected: boolean;
  faceScore: number;
  headDirection: 'forward' | 'left' | 'right' | 'down' | 'unknown';
  screenContent: string[];
  codeDetected: boolean;
}

export class ScreenAnalyzer {
  private model: posenet.PoseNet | null = null;
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;

    this.model = await posenet.load({
      architecture: 'MobileNetV1',
      outputStride: 16,
      inputResolution: { width: 640, height: 480 },
      multiplier: 0.75
    });

    this.isInitialized = true;
  }

  async analyzeFrame(imageData: ImageData): Promise<ScreenAnalysisResult> {
    if (!this.model) {
      await this.initialize();
    }

    const result: ScreenAnalysisResult = {
      timestamp: Date.now(),
      hasFrame: !!imageData,
      faceDetected: false,
      faceScore: 0,
      headDirection: 'unknown',
      screenContent: [],
      codeDetected: false
    };

    try {
      const canvas = new OffscreenCanvas(imageData.width, imageData.height);
      const ctx = canvas.getContext('2d')!;
      ctx.putImageData(imageData, 0, 0);

      const poses = await this.model!.estimateSinglePose(
        canvas as any,
        { flipHorizontal: false }
      );

      const faceKeypoints = poses.keypoints.filter(k =>
        ['nose', 'leftEye', 'rightEye', 'leftEar', 'rightEar'].includes(k.part)
      );

      if (faceKeypoints.length > 0) {
        const avgScore = faceKeypoints.reduce((sum, k) => sum + k.score, 0) / faceKeypoints.length;

        if (avgScore > 0.5) {
          result.faceDetected = true;
          result.faceScore = avgScore;
          result.headDirection = this.analyzeHeadDirection(faceKeypoints);
        }
      }

      result.codeDetected = this.detectCodePatterns(imageData);
      return result;

    } catch (error) {
      console.error('Error en analisis:', error);
      return result;
    }
  }

  private analyzeHeadDirection(
    keypoints: posenet.Keypoint[]
  ): ScreenAnalysisResult['headDirection'] {
    const nose = keypoints.find(k => k.part === 'nose');
    const leftEye = keypoints.find(k => k.part === 'leftEye');
    const rightEye = keypoints.find(k => k.part === 'rightEye');

    if (!nose || !leftEye || !rightEye) return 'unknown';

    const eyeCenterX = (leftEye.position.x + rightEye.position.x) / 2;
    const noseOffsetX = nose.position.x - eyeCenterX;
    const eyeDistance = rightEye.position.x - leftEye.position.x;
    const relativeOffset = noseOffsetX / eyeDistance;

    if (Math.abs(relativeOffset) < 0.2) return 'forward';
    if (relativeOffset < -0.2) return 'left';
    if (relativeOffset > 0.2) return 'right';

    return 'unknown';
  }

  private detectCodePatterns(imageData: ImageData): boolean {
    const data = imageData.data;
    let darkPixels = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const luminance = (r * 0.299 + g * 0.587 + b * 0.114);
      if (luminance < 50) darkPixels++;
    }

    const darkRatio = darkPixels / (imageData.width * imageData.height);
    return darkRatio > 0.3;
  }

  dispose() {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
    this.isInitialized = false;
  }
}
```

**Consumer Hook:**
```typescript
// app/hooks/useFrameAnalysis.ts
import { useCallback, useRef, useEffect } from 'react';
import { ScreenAnalyzer, ScreenAnalysisResult } from '../lib/screenAnalyzer';

export const useFrameAnalysis = (onAnalysis?: (result: ScreenAnalysisResult) => void) => {
  const analyzerRef = useRef<ScreenAnalyzer | null>(null);
  const processingRef = useRef(false);

  useEffect(() => {
    analyzerRef.current = new ScreenAnalyzer();
    return () => {
      analyzerRef.current?.dispose();
    };
  }, []);

  const analyzeCanvasFrame = useCallback(async (canvas: HTMLCanvasElement | OffscreenCanvas) => {
    if (!analyzerRef.current || processingRef.current) return;

    processingRef.current = true;
    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const result = await analyzerRef.current.analyzeFrame(imageData);
      onAnalysis?.(result);
    } finally {
      processingRef.current = false;
    }
  }, [onAnalysis]);

  return { analyzeCanvasFrame };
};
```

### 10.3 Chrome Extension Completo

**manifest.json (Manifest V3):**
```json
{
  "manifest_version": 3,
  "name": "Interview Assistant",
  "version": "1.0.0",
  "description": "AI-powered assistant para entrevistas de coding",

  "permissions": ["scripting", "storage", "offscreen"],
  "host_permissions": [
    "https://leetcode.com/*",
    "https://www.hackerrank.com/*",
    "https://coderpad.io/*",
    "https://www.codesignal.com/*"
  ],

  "background": {
    "service_worker": "background.js"
  },

  "content_scripts": [
    {
      "matches": [
        "https://leetcode.com/*",
        "https://www.hackerrank.com/*",
        "https://coderpad.io/*",
        "https://www.codesignal.com/*"
      ],
      "js": ["content-script.js"],
      "run_at": "document_idle"
    }
  ],

  "action": {
    "default_popup": "popup.html",
    "default_title": "Interview Assistant"
  },

  "web_accessible_resources": [
    {
      "resources": ["injected.js"],
      "matches": ["*://*/*"]
    }
  ]
}
```

**background.js (Service Worker):**
```javascript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'START_CAPTURE') {
    startScreenCapture(sender.tab.windowId)
      .then(streamId => {
        sendResponse({ success: true, streamId });
      })
      .catch(err => {
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }

  if (request.action === 'ANALYZE_SCREENSHOT') {
    analyzeScreenshot(request.imageData)
      .then(result => {
        sendResponse({ success: true, analysis: result });
      })
      .catch(err => {
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }
});

async function startScreenCapture(windowId) {
  return new Promise((resolve, reject) => {
    chrome.desktopCapture.chooseDesktopMedia(
      ['screen', 'window', 'tab'],
      { targetTab: windowId },
      (streamId) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (!streamId) {
          reject(new Error('User cancelled capture'));
        } else {
          resolve(streamId);
        }
      }
    );
  });
}

async function analyzeScreenshot(imageData) {
  const response = await fetch('https://api.example.com/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${await chrome.storage.sync.get(['token'])}`
    },
    body: JSON.stringify({ imageData })
  });
  return response.json();
}
```

**content-script.js:**
```javascript
const PLATFORM = detectPlatform();

function detectPlatform() {
  const hostname = window.location.hostname;
  if (hostname.includes('leetcode')) return 'leetcode';
  if (hostname.includes('hackerrank')) return 'hackerrank';
  if (hostname.includes('coderpad')) return 'coderpad';
  if (hostname.includes('codesignal')) return 'codesignal';
  return 'unknown';
}

function injectUI() {
  const container = document.createElement('div');
  container.id = 'interview-assistant';
  container.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 10000;
    background: white;
    padding: 10px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  `;

  const startBtn = document.createElement('button');
  startBtn.textContent = 'Iniciar Analisis';
  startBtn.style.cssText = `
    padding: 8px 12px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  `;

  startBtn.addEventListener('click', async () => {
    chrome.runtime.sendMessage(
      { action: 'START_CAPTURE' },
      (response) => {
        if (response.success) {
          startAnalysisLoop();
        } else {
          alert('Error: ' + response.error);
        }
      }
    );
  });

  container.appendChild(startBtn);
  document.body.appendChild(container);
}

async function startAnalysisLoop() {
  setInterval(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(document.documentElement, 0, 0);

    const imageData = canvas.toDataURL('image/jpeg');

    chrome.runtime.sendMessage(
      { action: 'ANALYZE_SCREENSHOT', imageData },
      (response) => {
        if (response.success) {
          displayAnalysis(response.analysis);
        }
      }
    );
  }, 5000);
}

function displayAnalysis(analysis) {
  let statusEl = document.getElementById('analysis-status');
  if (!statusEl) {
    statusEl = document.createElement('div');
    statusEl.id = 'analysis-status';
    statusEl.style.cssText = `
      position: fixed;
      bottom: 10px;
      right: 10px;
      background: #f0f0f0;
      padding: 10px;
      border-radius: 4px;
      font-size: 12px;
    `;
    document.body.appendChild(statusEl);
  }

  statusEl.innerHTML = `
    <div>Analisis: ${analysis.codeDetected ? 'si' : 'no'}</div>
    <div>Cara detectada: ${analysis.faceDetected ? 'si' : 'no'}</div>
  `;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectUI);
} else {
  injectUI();
}
```

### 10.4 Tauri App (Desktop)

**tauri.conf.json:**
```json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devPath": "http://localhost:5173",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "fullscreen": false,
        "height": 900,
        "resizable": true,
        "title": "Interview Recorder",
        "width": 1200
      }
    ],
    "security": {
      "csp": "default-src 'self'; img-src 'self' blob:; script-src 'self' 'wasm-unsafe-eval';"
    }
  }
}
```

**src-tauri/src/screen_capture.rs:**
```rust
use tauri::command;
use std::sync::{Arc, Mutex};

pub struct ScreenCaptureManager {
    is_capturing: Arc<Mutex<bool>>,
    frames_captured: Arc<Mutex<u32>>,
}

impl ScreenCaptureManager {
    pub fn new() -> Self {
        Self {
            is_capturing: Arc::new(Mutex::new(false)),
            frames_captured: Arc::new(Mutex::new(0)),
        }
    }
}

#[command]
pub async fn start_capture(
    manager: tauri::State<'_, ScreenCaptureManager>
) -> Result<String, String> {
    let mut capturing = manager.is_capturing.lock()
        .map_err(|e| e.to_string())?;

    if *capturing {
        return Err("Captura ya en progreso".to_string());
    }

    *capturing = true;

    #[cfg(target_os = "windows")]
    {
        // Implementacion Windows
    }

    #[cfg(target_os = "macos")]
    {
        // Implementacion macOS
    }

    Ok("Captura iniciada".to_string())
}

#[command]
pub async fn stop_capture(
    manager: tauri::State<'_, ScreenCaptureManager>
) -> Result<(), String> {
    let mut capturing = manager.is_capturing.lock()
        .map_err(|e| e.to_string())?;
    *capturing = false;
    Ok(())
}

#[command]
pub async fn get_capture_status(
    manager: tauri::State<'_, ScreenCaptureManager>
) -> Result<CaptureStatus, String> {
    let capturing = manager.is_capturing.lock()
        .map_err(|e| e.to_string())?;
    let frames = manager.frames_captured.lock()
        .map_err(|e| e.to_string())?;

    Ok(CaptureStatus {
        is_capturing: *capturing,
        frames_captured: *frames,
    })
}

#[derive(serde::Serialize)]
pub struct CaptureStatus {
    pub is_capturing: bool,
    pub frames_captured: u32,
}
```

**src-tauri/src/main.rs:**
```rust
#![cfg_attr(all(not(debug_assertions), target_os = "windows"), windows_subsystem = "windows")]

mod screen_capture;

use screen_capture::{start_capture, stop_capture, get_capture_status, ScreenCaptureManager};
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .manage(ScreenCaptureManager::new())
        .invoke_handler(tauri::generate_handler![
            start_capture,
            stop_capture,
            get_capture_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**React Component (Frontend Tauri):**
```tsx
// src/App.tsx
import { invoke } from '@tauri-apps/api/tauri';
import { useState, useEffect } from 'react';

function App() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [status, setStatus] = useState<{ is_capturing: boolean; frames_captured: number } | null>(null);

  const startCapture = async () => {
    try {
      await invoke('start_capture');
      setIsCapturing(true);
    } catch (error) {
      alert(`Error: ${error}`);
    }
  };

  const stopCapture = async () => {
    try {
      await invoke('stop_capture');
      setIsCapturing(false);
    } catch (error) {
      alert(`Error: ${error}`);
    }
  };

  useEffect(() => {
    const interval = setInterval(async () => {
      const status = await invoke('get_capture_status');
      setStatus(status as any);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h1>Interview Recorder</h1>
      <div style={{ marginBottom: '20px' }}>
        <button onClick={startCapture} disabled={isCapturing}>
          Iniciar Captura
        </button>
        <button onClick={stopCapture} disabled={!isCapturing} style={{ marginLeft: '10px' }}>
          Detener Captura
        </button>
      </div>
      {status && (
        <div style={{ background: '#f0f0f0', padding: '10px', borderRadius: '4px' }}>
          <p>Estado: {status.is_capturing ? 'Capturando' : 'Detenido'}</p>
          <p>Frames capturados: {status.frames_captured}</p>
        </div>
      )}
    </div>
  );
}

export default App;
```

### 10.5 Web Worker para Analisis

**worker.ts:**
```typescript
// app/workers/analysisWorker.ts
import * as tf from '@tensorflow/tfjs';
import * as posenet from '@tensorflow-models/posenet';

let model: posenet.PoseNet | null = null;

self.onmessage = async (event: MessageEvent) => {
  const { type, data } = event.data;

  if (type === 'INIT') {
    try {
      model = await posenet.load({
        architecture: 'MobileNetV1',
        outputStride: 16,
        inputResolution: { width: 640, height: 480 },
        multiplier: 0.75
      });
      self.postMessage({ type: 'INIT_COMPLETE' });
    } catch (error) {
      self.postMessage({
        type: 'ERROR',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  if (type === 'ANALYZE_FRAME' && model) {
    try {
      const { pixels, width, height } = data;

      const imageData = new ImageData(
        new Uint8ClampedArray(pixels),
        width,
        height
      );

      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext('2d')!;
      ctx.putImageData(imageData, 0, 0);

      const poses = await model.estimateSinglePose(canvas as any);

      const result = {
        poses: poses.keypoints.map(kp => ({
          part: kp.part,
          x: kp.position.x,
          y: kp.position.y,
          score: kp.score
        })),
        timestamp: Date.now()
      };

      self.postMessage({ type: 'ANALYSIS_RESULT', result });
    } catch (error) {
      self.postMessage({
        type: 'ERROR',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
};
```

**Hook para usar Worker:**
```typescript
// app/hooks/useAnalysisWorker.ts
import { useEffect, useRef } from 'react';

export const useAnalysisWorker = (onResult?: (result: any) => void) => {
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/analysisWorker.ts', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (event) => {
      const { type, result, error } = event.data;

      if (type === 'ANALYSIS_RESULT') {
        onResult?.(result);
      } else if (type === 'ERROR') {
        console.error('Worker error:', error);
      }
    };

    worker.postMessage({ type: 'INIT' });
    workerRef.current = worker;

    return () => {
      worker.terminate();
    };
  }, [onResult]);

  const analyze = (pixels: Uint8ClampedArray, width: number, height: number) => {
    workerRef.current?.postMessage({
      type: 'ANALYZE_FRAME',
      data: { pixels, width, height }
    });
  };

  return { analyze };
};
```

### 10.6 Integracion con AI Vision API

**API Service:**
```typescript
// app/lib/claudeAnalysisService.ts
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface CodeReviewResult {
  summary: string;
  issues: string[];
  suggestions: string[];
  confidence: number;
}

export async function analyzeCodeFromScreenshot(
  imageBase64: string
): Promise<CodeReviewResult> {
  const response = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: `Analiza el codigo visible en esta pantalla. Proporciona:
1. Un resumen breve del codigo
2. Problemas o errores detectados
3. Sugerencias de mejora
4. Tu confianza en el analisis (0-1)

Responde en JSON con estructura:
{
  "summary": "...",
  "issues": ["..."],
  "suggestions": ["..."],
  "confidence": 0.8
}`,
          },
        ],
      },
    ],
  });

  try {
    const content = response.content[0];
    if (content.type === 'text') {
      const json = JSON.parse(content.text);
      return json as CodeReviewResult;
    }
  } catch (error) {
    console.error('Error parsing response:', error);
  }

  return {
    summary: 'Error analyzing code',
    issues: [],
    suggestions: [],
    confidence: 0,
  };
}
```

**React Hook:**
```typescript
// app/hooks/useClaudeAnalysis.ts
import { useState } from 'react';
import { analyzeCodeFromScreenshot, CodeReviewResult } from '../lib/claudeAnalysisService';

export const useClaudeAnalysis = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CodeReviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = async (canvas: HTMLCanvasElement) => {
    setLoading(true);
    setError(null);

    try {
      const imageBase64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
      const analysis = await analyzeCodeFromScreenshot(imageBase64);
      setResult(analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return { analyze, loading, result, error };
};
```

**Componente CodeReviewPanel:**
```tsx
// app/components/CodeReviewPanel.tsx
'use client';

import { useClaudeAnalysis } from '../hooks/useClaudeAnalysis';

export const CodeReviewPanel = ({ canvas }: { canvas: HTMLCanvasElement | null }) => {
  const { analyze, loading, result, error } = useClaudeAnalysis();

  return (
    <div style={{ padding: '20px', borderLeft: '1px solid #e0e0e0' }}>
      <h3>Code Review</h3>

      <button
        onClick={() => canvas && analyze(canvas)}
        disabled={loading || !canvas}
        style={{
          padding: '8px 16px',
          background: loading ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'default' : 'pointer'
        }}
      >
        {loading ? 'Analizando...' : 'Analizar Codigo'}
      </button>

      {error && (
        <div style={{ color: 'red', marginTop: '10px' }}>
          Error: {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: '20px' }}>
          <h4>Resumen</h4>
          <p>{result.summary}</p>

          <h4>Problemas</h4>
          <ul>
            {result.issues.map((issue, i) => (
              <li key={i}>{issue}</li>
            ))}
          </ul>

          <h4>Sugerencias</h4>
          <ul>
            {result.suggestions.map((suggestion, i) => (
              <li key={i}>{suggestion}</li>
            ))}
          </ul>

          <p>Confianza: {(result.confidence * 100).toFixed(0)}%</p>
        </div>
      )}
    </div>
  );
};
```

### Mejores Practicas de Implementacion

1. **Web Workers:** Nunca procesar imagenes pesadas en main thread
2. **Memoizacion:** Cachear modelos TensorFlow para evitar recargas
3. **Cleanup:** Siempre liberar recursos (streams, contexts, models)
4. **Error Handling:** Ser especifico con errores (NotAllowedError, NotFoundError, etc.)
5. **Performance:** Limitar a 30fps maximo para analisis en tiempo real

**Debugging:**
```javascript
tf.env().set('DEBUG', true);

performance.mark('analysis-start');
// ... codigo
performance.mark('analysis-end');
performance.measure('analysis', 'analysis-start', 'analysis-end');
const measure = performance.getEntriesByName('analysis')[0];
console.log(`Analysis took ${measure.duration}ms`);
```

---

## 11. FAQ y Troubleshooting

### FAQ

**P: Cual es el mejor framework para empezar?**
R: TensorFlow.js. Tiene mejor documentacion y mas ejemplos que ONNX.

**P: Necesito Tauri si solo es web?**
R: No para MVP. Usa Next.js. Tauri es para v2 (produccion, performance).

**P: Puedo detectar si el usuario esta cheating?**
R: Parcialmente. Pose detection (cara fuera pantalla), tab switches. Pero no es 100% proof.

**P: Funciona en Safari?**
R: getDisplayMedia si (v13+). WebGPU no (aun). Canvas/TF.js si.

**P: Puedo usar extension en Firefox?**
R: Si. MV2 permitido. Pero no tiene desktopCapture nativo como Chrome.

**P: Cuanta memoria consume?**
R: ~200MB para web app completa. ~300MB con desktop app Tauri.

### Troubleshooting

**"NotAllowedError: Permission denied"**
-> Usuario denego permisos. Validar HTTPS y UX.

**"Canvas getImageData is slow"**
-> Usar Web Worker + OffscreenCanvas. No procesamiento en main thread.

**"TensorFlow model consumes 200MB"**
-> Usar quantized versions (int8) o ONNX con optimizacion.

**"Extension no funciona en LeetCode"**
-> CSP restrictivo bloquea. Usar postMessage + page-injected script.

**"Memory leak con getDisplayMedia"**
-> Olvido `stream.getTracks()[0].stop()`. Siempre cleanup.

---

## 12. Referencias

### Documentacion Oficial
- [MDN Screen Capture API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Capture_API/Using_Screen_Capture)
- [W3C Screen Capture Spec](https://www.w3.org/TR/screen-capture/)
- [MDN MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_Recording_API)
- [MDN Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Chrome Desktop Capture API](https://developer.chrome.com/docs/extensions/reference/api/desktopCapture)
- [Chrome Extension MV3](https://developer.chrome.com/docs/extensions/mv3/)
- [TensorFlow.js](https://www.tensorflow.org/js)
- [ONNX Runtime Web](https://onnxruntime.ai/docs/tutorials/web/)
- [Tauri v2](https://v2.tauri.app/)
- [WebGPU Spec](https://gpuweb.github.io/gpuweb/)

### Proyectos de Referencia
- [Interview Coder](https://github.com/j4wg/interview-coder-withoupaywall-opensource)
- [Vision Agent](https://github.com/suneelmatham/vision-agent)
- [AI Screen Analyzer](https://github.com/bigsk1/ai-screen-analyzer)
- [DeepCamera](https://github.com/SharpAI/DeepCamera)
- [WebLLM](https://github.com/mlc-ai/web-llm)
- [Transformers.js](https://github.com/xenova/transformers.js)
- [WebRTC Samples](https://webrtc.github.io/samples/)

### Herramientas
- [Can I Use - getDisplayMedia](https://caniuse.com/?search=getDisplayMedia)
- [WebGPU Support](https://webgpu.dev/)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [Lighthouse Performance](https://developers.google.com/web/tools/lighthouse)

### Performance y Seguridad
- [Permissions Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy)
- [Canvas Optimization](https://web.dev/canvas-performance/)
- [WebGPU Best Practices](https://toji.dev/webgpu-best-practices/webgl-performance-comparison.html)

---

## Roadmap

### Fase 1: MVP Web (2-3 semanas)
- getDisplayMedia() captura basica
- MediaRecorder para recording
- Canvas para frame extraction
- AI vision API integration (Gemini)
- Web Workers para analisis paralelo

### Fase 2: AI Analysis (1-2 semanas)
- Screenshot analysis mejorado
- Real-time feedback
- Frame caching en IndexedDB
- Batching de analisis

### Fase 3: Extension Chrome (2 semanas)
- Inyeccion en LeetCode/HackerRank
- chrome.desktopCapture
- Background analysis
- Persistent storage

### Fase 4: Desktop App (3-4 semanas)
- Tauri port con Rust backend
- ONNX Runtime (mejor performance)
- Offline support
- GPU acceleration

---

## Checklist de Validacion

### Antes de Deployar
- [ ] HTTPS en produccion (requirement de getDisplayMedia)
- [ ] Permissions-Policy header configurado
- [ ] CSP policy no contradice funcionalidad requerida
- [ ] Modelos ML cacheados correctamente
- [ ] Error handling para NotAllowedError, NotFoundError
- [ ] Performance metrics: < 50ms/frame analisis
- [ ] Memory leak testing (dispose de streams/models)
- [ ] Cross-browser testing (Chrome, Firefox, Edge)

### Testing
- [ ] getDisplayMedia() permiso denegado
- [ ] Stream.getTracks()[0].stop() cleanup
- [ ] Canvas getImageData performance
- [ ] TensorFlow.js modelo dispose
- [ ] Web Worker message passing
- [ ] IndexedDB caching fallback
- [ ] Network timeout handling
- [ ] Memory usage > 500MB warning

---

**Investigacion completada:** 30 de Marzo, 2026
**Plan MVP:** 31 de Marzo, 2026
**Por:** Claude Code Research Agent
**Total:** ~3600 lineas consolidadas de 7 archivos
