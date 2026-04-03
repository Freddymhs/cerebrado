import type { AnalysisMode, AIProviderRateLimit } from "@/lib/ai/types";

export const DEFAULT_ANALYSIS_INTERVAL_MS = 3000;

/** Interval per mode. Coding = 0 → manual trigger only. Study default = 15s. */
export const MODE_INTERVALS_MS: Record<AnalysisMode, number> = {
  coding: 0,       // manual trigger only via triggerNow()
  certification: 15_000,
  entrevista: 0,   // no frame analysis — audio-driven
};

/** Recommended default interval for study (certification) mode, shown in UI slider */
export const STUDY_DEFAULT_INTERVAL_MS = 15_000;

/** Recommended default auto-interval for coding mode (0 = manual only) */
export const CODING_DEFAULT_INTERVAL_MS = 0;

// ─────────────────────────────────────────────────────────────────────────────
// AI PROVIDER RATE LIMITS
// Add a new entry here when integrating a new provider.
// The key matches the AI_PROVIDER env var + optional tier suffix.
// ─────────────────────────────────────────────────────────────────────────────
export const PROVIDER_RATE_LIMITS: Record<string, AIProviderRateLimit> = {
  gemini_free: {
    requestsPerMinute: 5,
    requestsPerDay: 1500,
    tier: "free",
    description: "Gemini 2.5 Flash — Free Tier (Google AI Studio)",
  },
  gemini_paid: {
    requestsPerMinute: 60,
    tier: "paid",
    description: "Gemini 2.5 Flash — Pay-as-you-go (Google Cloud)",
  },
  ollama: {
    requestsPerMinute: Infinity,
    tier: "local",
    description: "Ollama — Local model, no external rate limit",
  },
  openai_tier1: {
    requestsPerMinute: 500,
    requestsPerDay: 10_000,
    tier: "paid",
    description: "OpenAI gpt-4o-mini — Tier 1",
  },
  openai_tier2: {
    requestsPerMinute: 5000,
    tier: "paid",
    description: "OpenAI gpt-4o-mini — Tier 2+",
  },
  // ── Add future providers below ──────────────────────────────────────────
  // anthropic: { requestsPerMinute: 50, tier: "paid", description: "..." },
};

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVE RATE LIMIT — set via NEXT_PUBLIC_AI_PROVIDER_TIER in .env.local
// e.g. NEXT_PUBLIC_AI_PROVIDER_TIER=gemini_free
// ─────────────────────────────────────────────────────────────────────────────
const ACTIVE_TIER_KEY =
  process.env.NEXT_PUBLIC_AI_PROVIDER_TIER ?? "gemini_free";

export const ACTIVE_RATE_LIMIT: AIProviderRateLimit =
  PROVIDER_RATE_LIMITS[ACTIVE_TIER_KEY] ?? PROVIDER_RATE_LIMITS.gemini_free;

/** Minimum safe interval in ms derived from the active provider's rate limit */
export const MIN_SAFE_INTERVAL_MS =
  ACTIVE_RATE_LIMIT.requestsPerMinute === Infinity
    ? DEFAULT_ANALYSIS_INTERVAL_MS
    : Math.ceil(60_000 / ACTIVE_RATE_LIMIT.requestsPerMinute);

/** Effective interval: respects both user config and provider rate limit */
export function getAnalysisInterval(): number {
  const envInterval = process.env.NEXT_PUBLIC_ANALYSIS_INTERVAL_MS;
  const userInterval = envInterval ? parseInt(envInterval, 10) : NaN;
  const requested = isNaN(userInterval) ? DEFAULT_ANALYSIS_INTERVAL_MS : userInterval;
  return Math.max(requested, MIN_SAFE_INTERVAL_MS);
}

export const ANALYSIS_MODES: readonly AnalysisMode[] = [
  "coding",
  "certification",
  "entrevista",
] as const;

const JSON_FORMAT = `Responde ÚNICAMENTE con este JSON (sin markdown, sin texto extra):
{"summary":"resumen en 2-3 oraciones","insights":["concepto 1","concepto 2"],"suggestions":["sugerencia 1"]}`;

const INTERVIEW_FORMAT = `Responde ÚNICAMENTE con este JSON (sin markdown, sin texto extra):
{"summary":"qué ocurrió en 1 oración","insights":[],"suggestions":[]}

Si hay pregunta real al candidato, agrega bullets en suggestions (máx 4, máx 12 palabras cada uno).
Si NO hay pregunta directa (es presentación, instrucción, narración o comentario), deja suggestions como [].`;

export const INTERVIEW_BASE_PROMPT = `Eres mi coach de entrevistas en tiempo real. Solo actúas cuando el entrevistador hace una pregunta o pide algo al candidato.`;

export const buildInterviewPrompt = (profile: string, transcript: string): string => {
  const profileSection = profile.trim()
    ? `\nMi CV y perfil (fuente de verdad absoluta — no inventar nada que no esté aquí):\n${profile.trim()}`
    : "";
  const transcriptSection = transcript.trim()
    ? `\nConversación reciente:\n${transcript.trim()}`
    : "";
  return `${INTERVIEW_BASE_PROMPT}${profileSection}\n\nREGLA CRÍTICA DE FUENTES:\n- Para preguntas de EXPERIENCIA (Tipo A/B): usa SOLO información explícita del CV. Nunca inventes experiencias ni logros.\n- Para preguntas de ESCENARIO/PATRÓN (Tipo E): usa la BASE DE CONOCIMIENTO TÉCNICO embebida abajo. No necesitas CV para estas.\n- Para preguntas de DECISIÓN (Tipo F): combina CV (qué se usó) + conocimiento general (qué sería mejor hoy).\n\nPASO 1 — ¿El entrevistador hace una pregunta o pide algo al candidato? Si es presentación, instrucciones, narración o comentario → suggestions: [].\n\nPASO 2 — Clasifica el tipo y usa la fuente correcta:\n\nTIPO A — Experiencia/trayectoria (FUENTE: CV):\nUsa STAR por empresa/proyecto del CV: "[Empresa]: [situación] → [qué hice] → [resultado concreto + métrica]"\n\nTIPO B — Implementación técnica — "¿cómo lo hiciste?", "baja al técnico" (FUENTE: CV + escalada):\nFlujo exacto: "[Problema] → [herramienta/método concreto] → [resultado]". Sin conceptos genéricos.\n\nTIPO C — Stack/arquitectura — "¿qué usarías?", "¿cómo lo diseñarías?" (FUENTE: CV + conocimiento general):\n"[Herramienta]: [cuándo la elegiría y por qué]"\n\nTIPO D — Personal/motivación (FUENTE: candidato):\nEstructura STAR vacía para que el candidato llene con su propia voz.\n\nTIPO E — Escenario/diagnóstico/patrón (FUENTE: tool lookup_pattern — el sistema provee el patrón canónico automáticamente):\nCuando detectes este tipo, el sistema ya habrá ejecutado lookup_pattern y te enviará el patrón específico como contexto.\nUsa ese patrón para armar los bullets. Conecta con el CV anchor si viene incluido.\n\nTIPO F — Decisión/retrospectiva — "¿por qué no X?", "si lo hicieras hoy" (FUENTE: CV + conocimiento general):\n"[Razón pragmática original] → [Qué haría hoy] → [Por qué es mejor]"\n\nREGLA DE ESCALADA — Si el entrevistador dice "baja al técnico", "dame el código", "¿cómo exactamente?":\nDar nombre de método/query/paquete concreto. Nunca conceptos.\n\nREGLA TÉRMINO OLVIDADO — Si el candidato no recuerda el nombre:\nNombrar el concepto: "lo que se llama [DataLoader / SELECT FOR UPDATE / idempotencia / Strategy Pattern]"\n\nREGLA DE CIERRE — Si el entrevistador dice "perfecto", "buenísimo", "muy bien", "sigue":\nDar 1 bullet de cierre con resultado + métrica: "Cierra: [resultado] — [tiempo/escala/impacto]"\n\nREGLA MÉTRICAS — Si el candidato no da números en respuestas de experiencia:\nAnclar con dimensión concreta: tiempo, escala, equipo, módulos, o impacto de negocio.\n\nREGLA FINAL: bullets concretos, máx 14 palabras, primera persona.${transcriptSection}\n\n${INTERVIEW_FORMAT}`;
};

export const STUDY_BASE_PROMPT = `Eres mi asistente de estudio. Generas notas compactas basadas en lo que YO digo.

FUENTES (en orden de prioridad):
1. [Yo, instrucción]: lo que yo digo en voz alta — ESTO define el contenido y estructura de las notas.
2. [Video/clase]: audio del contenido que estoy viendo — contexto de fondo, no copiar literalmente.
3. Lo visible en pantalla — apoyo visual, úsalo para enriquecer sin redundar.

REGLAS:
- Si hay entradas [Yo, instrucción]: las notas reflejan lo que yo expresé, en mis propias palabras, organizado.
- Si no hay mic activo: toma notas compactas de lo que ves en pantalla.
- Ideas cortas, definiciones breves, relaciones entre conceptos. Sin texto verboso.

${JSON_FORMAT}`;

export const MODE_PROMPTS: Record<AnalysisMode, string> = {
  coding: `Eres mi asistente de coding en tiempo real. Estoy resolviendo un desafío de programación.

PASO 1 — Detecta el estado de la pantalla:
A) ¿Hay un resultado de tests visible? (ej: "X/Y test cases failed", "Wrong Answer", "Runtime Error", output incorrecto)
B) ¿Hay código escrito pero sin ejecutar?
C) ¿La función está vacía o apenas iniciada?

PASO 2 — Lee el enunciado del problema (puede estar en cualquier parte de la pantalla). Identifica qué recibe la función, qué debe retornar, y los edge cases.

PASO 3 — Responde según el estado detectado:

Si estado A (tests fallando / wrong answer):
- summary: "X/Y tests fallaron — [causa probable]"
- insights: qué parte de la lógica está mal y por qué, con referencia al input/output visible
- suggestions: corrección puntual con el índice, condición o cálculo exacto que falla

Si estado B (código escrito, no ejecutado):
- Revisa la lógica. Si hay un bug, explícalo con el valor concreto que produciría mal resultado.
- suggestions: el fix exacto o la verificación que falta

Si estado C (función vacía o mínima):
- summary: describe el problema en 1 oración clara
- insights: el algoritmo en palabras paso a paso — FLUJO CONCRETO, no genérico.
  Ejemplo correcto: "for i de 0 a n-1: suma arr[i][i] (diagonal principal) y arr[i][n-1-i] (diagonal secundaria)"
  Ejemplo incorrecto (NO hacer): "itera a través de la matriz para sumar los elementos"
- suggestions: 2 pistas accionables. Si hay métodos útiles del lenguaje, nómbralos (Math.abs, reduce, parseInt, etc.)

CASO ESPECIAL — Si el contexto incluye "[Pregunta del usuario]":
El usuario habló por el micrófono haciendo una pregunta o comentario. Responde DIRECTAMENTE a esa pregunta:
- Si pregunta si su enfoque es correcto → dile si sí o no, y por qué en 1-2 frases concretas
- Si tiene una duda conceptual → explícala en términos del problema visible
- Si describe lo que intentó → evalúa si va por buen camino
summary: resume su pregunta + tu respuesta en 1 oración
suggestions: los siguientes pasos concretos basados en lo que preguntó

REGLA CRÍTICA: nunca dar consejos genéricos de clean code (nombres de variables, etc.). Solo ayuda específica para ESTE problema.

${JSON_FORMAT}`,
  certification: STUDY_BASE_PROMPT,
  entrevista: INTERVIEW_BASE_PROMPT, // overridden at runtime by buildInterviewPrompt
};

export const MODE_LABELS: Record<AnalysisMode, string> = {
  coding: "Coding",
  certification: "Estudio",
  entrevista: "Entrevista",
};

export const MODE_DESCRIPTIONS: Record<AnalysisMode, { text: string; warning: string }> = {
  coding: {
    text: "La IA ve tu pantalla y te da pistas para resolver el desafío. Captura manual cuando lo necesites.",
    warning: "Solo video — sin audio.",
  },
  certification: {
    text: "La IA toma notas compactas de lo que se ve en pantalla. Ideal para videos en el navegador.",
    warning: "Audio solo de pestañas del navegador con 'Share audio'. Apps externas (Zoom, Slack) no se escuchan.",
  },
  entrevista: {
    text: "Escucha al entrevistador y genera bullets de respuesta en tiempo real.",
    warning: "Requiere Chrome Tab con 'Share audio'. No funciona con apps fuera del navegador.",
  },
};
