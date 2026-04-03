import type { AudioProviderKey, AudioProviderConfig } from "@/lib/audio/types";

export const AUDIO_PROVIDERS: Record<AudioProviderKey, AudioProviderConfig> = {
  openai: {
    label: "Whisper (OpenAI)",
    description: "OpenAI Whisper API — ~$0.006/min. Sistema + mic.",
    supportsSystemAudio: true,
    requiresKey: true,
  },
  local: {
    label: "Local (Whisper)",
    description: "Modelo local via LOCAL_TRANSCRIBE_URL. Sin costo.",
    supportsSystemAudio: true,
    requiresKey: false,
  },
};

export const AUDIO_CHUNK_INTERVAL_MS = 12_000; // send chunk every 12s
