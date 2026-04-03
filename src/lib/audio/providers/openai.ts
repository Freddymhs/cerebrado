import OpenAI from "openai";
import type { AudioProvider } from "@/lib/audio/types";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
    client = new OpenAI({ apiKey });
  }
  return client;
}

const WHISPER_MODEL = process.env.OPENAI_WHISPER_MODEL ?? "whisper-1";

export const openaiAudioProvider: AudioProvider = {
  async transcribe(audioBlob: Blob, mimeType: string): Promise<string> {
    const ext = mimeType.includes("webm") ? "webm" : "wav";
    const file = new File([audioBlob], `audio.${ext}`, { type: mimeType });

    const response = await getClient().audio.transcriptions.create({
      model: WHISPER_MODEL,
      file,
      language: "es",
    });

    return response.text;
  },
};
