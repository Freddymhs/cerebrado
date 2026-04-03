import type { AudioProvider } from "@/lib/audio/types";

// Web Speech API does not work via chunk-based transcription.
// This provider is a stub — actual transcription is handled by the
// useAudioCapture hook directly via SpeechRecognition events.
// transcribe() will never be called for webspeech; it exists for type compliance.
export const webspeechAudioProvider: AudioProvider = {
  async transcribe(): Promise<string> {
    throw new Error("webspeech provider uses SpeechRecognition events, not transcribe()");
  },
};
