import type { AudioProvider } from "@/lib/audio/types";
import { openaiAudioProvider } from "@/lib/audio/providers/openai";
import { localAudioProvider } from "@/lib/audio/providers/local";
import { webspeechAudioProvider } from "@/lib/audio/providers/webspeech";

export function getAudioProvider(provider: string): AudioProvider {
  const key = provider.toLowerCase();
  if (key === "openai") return openaiAudioProvider;
  if (key === "local") return localAudioProvider;
  if (key === "webspeech") return webspeechAudioProvider;
  throw new Error(`Unknown audio provider: "${provider}"`);
}
