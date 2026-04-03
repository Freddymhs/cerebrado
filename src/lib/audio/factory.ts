import type { AudioProvider } from "@/lib/audio/types";
import { openaiAudioProvider } from "@/lib/audio/providers/openai";
import { localAudioProvider } from "@/lib/audio/providers/local";

export function getAudioProvider(provider: string): AudioProvider {
  const key = provider.toLowerCase();
  if (key === "openai") return openaiAudioProvider;
  if (key === "local") return localAudioProvider;
  throw new Error(`Unknown audio provider: "${provider}"`);
}
