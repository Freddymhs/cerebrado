/**
 * Interview pattern knowledge base.
 * Each entry maps a scenario key to its canonical answer.
 * Used as tool-callable data — independent of the user's CV.
 */

export interface InterviewPattern {
  /** Short label shown in coach UI */
  label: string;
  /** Keywords that trigger this pattern */
  triggers: string[];
  /** Step-by-step solution flow */
  solution: string[];
  /** Anchor to real CV experience if available */
  cvAnchor?: string;
}

export const INTERVIEW_PATTERNS: Record<string, InterviewPattern> = {
  event_loop_blocked: {
    label: "Event loop bloqueado (PDF / CPU-intensivo)",
    triggers: ["event loop", "pdf", "bloquea", "api deja de responder", "cpu", "genera reporte"],
    solution: [
      "Offload a AWS Lambda (como en JL LTDA para reportes PDF) o worker_threads nativo",
      "En JL LTDA: PDF → Lambda + S3 → API nunca bloqueada → email al terminar",
      "Alternativa local: BullMQ + worker separado → job ID para polling del cliente",
    ],
    cvAnchor: "JL LTDA — AWS Lambda para generación de reportes PDF + S3",
  },

  oom_docker: {
    label: "OOM en Docker sin logs",
    triggers: ["oom", "memoria", "docker se reinicia", "out of memory", "sin logs", "sin errores", "contenedor cae"],
    solution: [
      "--inspect + Chrome DevTools heap snapshot → buscar closures y listeners sin limpiar",
      "clinic.js doctor o process.memoryUsage() en health endpoint → identificar el leak",
      "Heap snapshot antes/después del pico → comparar retención → limpiar listeners en cleanup",
    ],
  },

  scraping_scale: {
    label: "Scraping a escala (N sitios, límite M browsers)",
    triggers: ["scraping", "scraper", "5000 sitios", "browsers simultáneos", "colapsa", "escalar scraping"],
    solution: [
      "En Depot Group: Puppeteer pool concurrente + proxy rotation IPRoyal + rate limiting",
      "Arquitecté pools de browsers con concurrencia controlada + proxy rotation → sin bloqueos",
      "Mayor escala: BullMQ cola de URLs → workers distribuidos → retry automático",
    ],
    cvAnchor: "Depot Group — Puppeteer pool management + proxy rotation IPRoyal",
  },

  large_file_upload: {
    label: "Archivos grandes (1-2GB) sin leer en memoria",
    triggers: ["archivo grande", "1 giga", "2 giga", "leer en memoria", "upload pesado", "subir video"],
    solution: [
      "S3 presigned URL → cliente sube directo a S3 sin pasar por servidor",
      "O req.pipe(s3Upload.createWriteStream()) → memoria constante sin importar el tamaño",
      "Nunca .buffer() ni readFile. S3 presigned URL = cero carga en el servidor",
    ],
    cvAnchor: "JL LTDA — AWS S3 + Lambda para almacenamiento de archivos",
  },

  race_condition: {
    label: "Race condition / oversell de stock",
    triggers: ["race condition", "oversell", "stock negativo", "dos usuarios", "mismo milisegundo", "concurrencia"],
    solution: [
      "En JL LTDA con Prisma: $transaction + verificar rows affected",
      "SQL puro: BEGIN → SELECT stock FOR UPDATE → UPDATE IF stock>0 → COMMIT",
      "Prisma $transaction garantiza atomicidad — 0 oversell posible",
    ],
    cvAnchor: "JL LTDA — Prisma + PostgreSQL con transacciones",
  },

  n_plus_1_graphql: {
    label: "N+1 en GraphQL",
    triggers: ["n+1", "n más 1", "101 queries", "1000 queries", "graphql lento", "consultas por cada"],
    solution: [
      "En Klog y JL LTDA usé GraphQL extensamente con Apollo Server",
      "Solución: DataLoader — agrupa resolvers en 1 batch query por request",
      "new DataLoader(async (ids) => db.find({ id: { in: ids } })) → 2 queries en vez de 101",
    ],
    cvAnchor: "Klog — Apollo Client + GraphQL; JL LTDA — GraphQL Subscriptions + Nexus",
  },

  webhook_lost: {
    label: "Webhook perdido en restart",
    triggers: ["webhook", "twilio", "se pierde", "reinicia", "idempotencia", "notificación perdida"],
    solution: [
      "En Depot Group integré Twilio webhooks con Socket.IO robusto",
      "Patrón: guardar webhook ID en DB antes de procesar (INSERT IF NOT EXISTS)",
      "Twilio reintenta — idempotency key en PostgreSQL → nunca doble procesamiento",
    ],
    cvAnchor: "Depot Group — Twilio WhatsApp Business API + webhooks robustos",
  },

  fat_controller: {
    label: "Fat controller (toda lógica en controllers)",
    triggers: ["fat controller", "lógica en controller", "controlador gigante", "todo en el controller", "refactorizar controller"],
    solution: [
      "En JL LTDA y Depot Group: arquitectura modular NestJS con Clean Architecture",
      "Controller valida input → Service ejecuta lógica → Repository accede DB",
      "Extraer service capa por capa con tests como red de seguridad — nunca big bang",
    ],
    cvAnchor: "Depot Group + JL LTDA — NestJS modular + Clean Architecture",
  },

  provider_swap: {
    label: "Cambio de proveedor (Twilio → otro)",
    triggers: ["cambiar proveedor", "twilio a", "otro proveedor", "migrar sms", "strategy pattern", "intercambiable"],
    solution: [
      "En Depot Group integré Twilio WhatsApp Business API",
      "Strategy Pattern: interfaz INotificationProvider.send(to, message) → TwilioProvider / LocalProvider",
      "Inyectar proveedor como dependencia en NestJS DI → cambio = 1 línea en módulo",
    ],
    cvAnchor: "Depot Group — Twilio API + arquitectura modular NestJS",
  },

  typescript_strict: {
    label: "Migración TypeScript strict (500 errores)",
    triggers: ["typescript strict", "modo estricto", "500 errores", "strict true", "any masivo", "migrar typescript"],
    solution: [
      "No activar strict global. Migrar por módulo con @ts-strict por archivo",
      "Priorizar boundaries primero: tipos de entrada/salida de APIs",
      "strict por módulo → errores acotados → merge gradual sin bloquear al equipo",
    ],
  },

  node_upgrade: {
    label: "Upgrade Node 16→22",
    triggers: ["upgrade node", "actualizar node", "node 22", "node 16", "migrar version", "checklist node"],
    solution: [
      "npm-check-updates para deps breaking + revisar streams API + fetch nativo reemplaza node-fetch",
      "Test suite completo + deploy canary al 5% antes de full rollout",
      "No big bang — rama separada → fix por fix → canary → rollback si métrica cae",
    ],
  },

  hotfix_workflow: {
    label: "Hotfix en mitad de sprint",
    triggers: ["hotfix", "bug crítico en producción", "bug en prod", "mitad del sprint", "git workflow", "no perder cambios"],
    solution: [
      "git stash o commit WIP en rama feature → checkout main/prod → rama hotfix/descripcion",
      "Fix → PR a prod → merge → cherry-pick o merge hotfix de vuelta a rama feature",
      "Nunca perder trabajo — stash → hotfix → cherry-pick de vuelta",
    ],
  },

  sprint_deadline: {
    label: "Sprint con cobertura incompleta",
    triggers: ["sprint", "deadline", "no termino", "cobertura", "tests incompletos", "pm pide entregar"],
    solution: [
      "Entregar happy path + documentar casos de borde pendientes como deuda técnica",
      "Comunicar al PM: qué funciona, qué está pendiente, proponer ticket de seguimiento",
      "No deployar en silencio — 'funciona X, pendiente Y como ticket #123'",
    ],
  },

  openai_latency: {
    label: "Latencia OpenAI / UX de espera",
    triggers: ["openai lento", "20 segundos", "30 segundos", "chatbot tarda", "usuario se va", "ux espera"],
    solution: [
      "En Depot Group: respuesta inmediata 'procesando...' + Circuit Breaker para fallos",
      "Detectar intención simple (hola, gracias) → respuesta rápida sin llamar a OpenAI",
      "Streaming de tokens si el cliente lo soporta → percepción de velocidad sin cambiar latencia real",
    ],
    cvAnchor: "Depot Group — chatbot WhatsApp + OpenAI Assistant API + Circuit Breaker",
  },
};

/**
 * Returns the pattern that best matches the given text.
 * Used by the tool executor in the analyze route.
 */
export function findPattern(query: string): InterviewPattern | null {
  const q = query.toLowerCase();
  for (const pattern of Object.values(INTERVIEW_PATTERNS)) {
    if (pattern.triggers.some((t) => q.includes(t))) {
      return pattern;
    }
  }
  return null;
}

/**
 * Tool definition for AI providers that support function calling.
 */
export const LOOKUP_PATTERN_TOOL = {
  name: "lookup_pattern",
  description:
    "Look up the canonical solution for a common backend/fullstack interview scenario. Call this when the interviewer asks a Type E question: diagnosis, infrastructure, design patterns, scaling, debugging in production.",
  parameters: {
    type: "object" as const,
    properties: {
      scenario: {
        type: "string",
        description:
          "Short description of the scenario in the interviewer's words. E.g. 'event loop blocked by PDF generation', 'OOM in Docker without logs', 'N+1 in GraphQL'",
      },
    },
    required: ["scenario"],
  },
} as const;
