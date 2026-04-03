export type AudioProviderKey = "openai" | "local" | "webspeech";

export interface AudioProvider {
  /**
   * Transcribe an audio blob to text.
   * For webspeech provider this is a no-op — transcription happens via SpeechRecognition events.
   */
  transcribe(audioBlob: Blob, mimeType: string): Promise<string>;
}

export interface AudioProviderConfig {
  label: string;
  description: string;
  supportsSystemAudio: boolean;
  requiresKey: boolean;
}
