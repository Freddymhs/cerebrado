export type AudioProviderKey = "openai" | "local" | "webspeech";

export interface AudioProvider {
  /**
   * Transcribe an audio blob to text.
   */
  transcribe(audioBlob: Blob, mimeType: string): Promise<string>;
}

export interface AudioProviderConfig {
  label: string;
  description: string;
  supportsSystemAudio: boolean;
  requiresKey: boolean;
}
