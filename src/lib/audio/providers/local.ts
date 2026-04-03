import type { AudioProvider } from "@/lib/audio/types";

// Point LOCAL_TRANSCRIBE_URL to any whisper-compatible endpoint:
// - faster-whisper server, whisper.cpp HTTP server, custom /bin script, etc.
// Expected: POST multipart/form-data with "file" field, returns { text: string }
const LOCAL_TRANSCRIBE_URL =
  process.env.LOCAL_TRANSCRIBE_URL ?? "http://localhost:8080/transcribe";

export const localAudioProvider: AudioProvider = {
  async transcribe(audioBlob: Blob, mimeType: string): Promise<string> {
    const ext = mimeType.includes("webm") ? "webm" : "wav";
    const formData = new FormData();
    formData.append("file", new File([audioBlob], `audio.${ext}`, { type: mimeType }));

    const response = await fetch(LOCAL_TRANSCRIBE_URL, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Local transcription error: ${response.statusText}`);
    }

    const data = (await response.json()) as { text: string };
    return data.text;
  },
};
