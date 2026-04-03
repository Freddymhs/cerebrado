import type { AnalysisMode, AIProviderRateLimit } from "@/lib/ai/types";

export const DEFAULT_ANALYSIS_INTERVAL_MS = 3000;

/** Interval per mode — coding is slower by default (manual trigger preferred) */
export const MODE_INTERVALS_MS: Record<AnalysisMode, number> = {
  video: 3000,
  coding: 20000, // slow auto — user uses manual trigger instead
  certification: 3000,
  entrevista: 0, // no frame analysis
};

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
  "video",
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
  return `${INTERVIEW_BASE_PROMPT}${profileSection}\n\nREGLA CRÍTICA DE FUENTES:\n- Para preguntas de EXPERIENCIA (Tipo A/B): usa SOLO información explícita del CV. Nunca inventes experiencias ni logros.\n- Para preguntas de ESCENARIO/PATRÓN (Tipo E): usa la BASE DE CONOCIMIENTO TÉCNICO embebida abajo. No necesitas CV para estas.\n- Para preguntas de DECISIÓN (Tipo F): combina CV (qué se usó) + conocimiento general (qué sería mejor hoy).\n\nPASO 1 — ¿El entrevistador hace una pregunta o pide algo al candidato? Si es presentación, instrucciones, narración o comentario → suggestions: [].\n\nPASO 2 — Clasifica el tipo y usa la fuente correcta:\n\nTIPO A — Experiencia/trayectoria (FUENTE: CV):\nUsa STAR por empresa/proyecto del CV: "[Empresa]: [situación] → [qué hice] → [resultado concreto + métrica]"\n\nTIPO B — Implementación técnica — "¿cómo lo hiciste?", "baja al técnico" (FUENTE: CV + escalada):\nFlujo exacto: "[Problema] → [herramienta/método concreto] → [resultado]". Sin conceptos genéricos.\n\nTIPO C — Stack/arquitectura — "¿qué usarías?", "¿cómo lo diseñarías?" (FUENTE: CV + conocimiento general):\n"[Herramienta]: [cuándo la elegiría y por qué]"\n\nTIPO D — Personal/motivación (FUENTE: candidato):\nEstructura STAR vacía para que el candidato llene con su propia voz.\n\nTIPO E — Escenario/diagnóstico/patrón (FUENTE: BASE DE CONOCIMIENTO + CV si hay experiencia relacionada):\nIdentifica el escenario, da el patrón canónico Y conecta con experiencia real del CV si aplica.\nEjemplo: "En Depot Group manejé esto con [X] — el patrón general es [Y]"\n\nTIPO F — Decisión/retrospectiva — "¿por qué no X?", "si lo hicieras hoy" (FUENTE: CV + conocimiento general):\n"[Razón pragmática original] → [Qué haría hoy] → [Por qué es mejor]"\n\n━━━ BASE DE CONOCIMIENTO TÉCNICO (Tipo E — usar siempre, con o sin CV) ━━━\n\nEvent loop bloqueado (PDF/CPU-intensivo):\n→ Offload a AWS Lambda (como hice en JL LTDA para reportes PDF) o `worker_threads` nativo\n→ "En JL LTDA: generación PDF → Lambda + S3 → API nunca bloqueada → notificación por email al terminar"\n→ Alternativa local: BullMQ + worker separado → job ID para polling\n\nOOM en Docker sin logs:\n→ `--inspect` + Chrome DevTools heap snapshot → buscar closures/listeners sin limpiar\n→ clinic.js / `process.memoryUsage()` en health endpoint → identificar leak\n→ "Heap snapshot antes/después del pico → comparar retención → fix: limpiar listeners en cleanup"\n\nScraping a escala (N sitios, límite M browsers):\n→ En Depot Group: Puppeteer pool concurrente + proxy rotation IPRoyal + rate limiting\n→ "Arquitecté pools de browsers Puppeteer con concurrencia controlada + proxy rotation → scraping eficiente sin bloqueos"\n→ Para mayor escala: BullMQ cola de URLs → workers distribuidos → retry automático\n\nArchivos grandes (1-2GB) sin leer en memoria:\n→ En JL LTDA usé AWS S3 + Lambda para almacenamiento\n→ Patrón: S3 presigned URL → cliente sube directo a S3 sin pasar por servidor\n→ O `req.pipe(s3Upload.createWriteStream())` → memoria constante independiente del tamaño\n→ "Nunca `.buffer()` ni `readFile`. S3 presigned URL = cero carga en servidor"\n\nRace condition / oversell de stock:\n→ En JL LTDA con Prisma: `$transaction` + verificar rows affected\n→ SQL puro: `BEGIN → SELECT stock FOR UPDATE → UPDATE IF stock>0 → COMMIT`\n→ "Prisma `$transaction` garantiza atomicidad — 0 oversell posible"\n\nN+1 en GraphQL:\n→ En Klog y JL LTDA usé GraphQL extensamente con Apollo Server\n→ Solución: DataLoader — agrupa resolvers en 1 batch query por request\n→ `new DataLoader(async (ids) => db.find({ id: { in: ids } }))` → 2 queries en vez de 101\n\nWebhook perdido en restart (idempotencia):\n→ En Depot Group integré Twilio webhooks con Socket.IO robusto\n→ Patrón: guardar webhook ID en DB antes de procesar (`INSERT IF NOT EXISTS`)\n→ "Twilio reintenta — idempotency key en PostgreSQL → nunca doble procesamiento"\n\nFat controller (toda lógica en controllers):\n→ En JL LTDA y Depot Group: arquitectura modular NestJS con Clean Architecture\n→ Controller valida input → Service ejecuta lógica → Repository accede DB\n→ "Extraer service capa por capa con tests como red de seguridad — nunca big bang"\n\nCambio de proveedor SMS/notificaciones (Twilio → otro):\n→ En Depot Group integré Twilio WhatsApp Business API\n→ Strategy Pattern: interfaz `INotificationProvider.send(to, message)` → `TwilioProvider` / `LocalProvider`\n→ "Inyectar proveedor como dependencia en NestJS DI → cambio de proveedor = 1 línea en módulo"\n\nMigración TypeScript strict (500 errores):\n→ No activar strict global. Migrar por módulo: `// @ts-strict` por archivo\n→ Priorizar boundaries (tipos de entrada/salida de APIs) primero\n→ "strict por módulo → errores acotados → merge gradual sin bloquear el equipo"\n\nUpgrade Node 16→22:\n→ Checklist: 1) `npm-check-updates` deps breaking, 2) streams API (cambios en readable), 3) fetch nativo (reemplaza node-fetch), 4) crypto changes, 5) test suite completo, 6) deploy canary 5%\n→ "No big bang. Rama separada → fix por fix → canary → rollback si métrica cae"\n\nHotfix en mitad de sprint:\n→ `git stash` o commit WIP en rama feature → checkout main/prod → rama `hotfix/descripcion`\n→ Fix → PR a prod → merge → cherry-pick o merge hotfix a rama feature\n→ "Nunca perder trabajo. Stash → hotfix → cherry-pick de vuelta"\n\nSprint con cobertura incompleta por bug crítico:\n→ Entregar happy path + documentar casos de borde pendientes como deuda técnica\n→ Comunicar al PM qué funciona, qué está pendiente, proponer ticket de seguimiento\n→ "No deployar silencio. Entregar con contexto: 'funciona X, pendiente Y como ticket #123'"\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nREGLA DE ESCALADA — Si el entrevistador dice "baja al técnico", "dame el código", "¿cómo exactamente?":\nDar nombre de método/query/paquete concreto. Nunca conceptos. Usar ejemplos de la BASE DE CONOCIMIENTO.\n\nREGLA TÉRMINO OLVIDADO — Si el candidato no recuerda el nombre:\nNombrar el concepto: "lo que se llama [DataLoader / SELECT FOR UPDATE / idempotencia / Strategy Pattern]"\n\nREGLA DE CIERRE — Si el entrevistador dice "perfecto", "buenísimo", "muy bien", "sigue":\nDar 1 bullet de cierre con resultado + métrica: "Cierra: [resultado] — [tiempo/escala/impacto]"\n\nREGLA MÉTRICAS — Si el candidato no da números en respuestas de experiencia:\nAnclar con dimensión concreta: tiempo, escala, equipo, módulos, o impacto de negocio.\n\nREGLA FINAL: bullets concretos, máx 14 palabras, primera persona.${transcriptSection}\n\n${INTERVIEW_FORMAT}`;
};

export const MODE_PROMPTS: Record<AnalysisMode, string> = {
  video: `Estás viendo mi pantalla. Resume qué se está mostrando y destaca los conceptos o ideas clave. ${JSON_FORMAT}`,
  coding: `Analiza el código visible en pantalla. Identifica patrones, mejoras de arquitectura y malas prácticas. ${JSON_FORMAT}`,
  certification: `Estoy estudiando. Explica los conceptos visibles en pantalla de forma clara y profunda. ${JSON_FORMAT}`,
  entrevista: INTERVIEW_BASE_PROMPT, // overridden at runtime by buildInterviewPrompt
};

export const MODE_LABELS: Record<AnalysisMode, string> = {
  video: "Video",
  coding: "Coding",
  certification: "Estudio",
  entrevista: "Entrevista",
};
