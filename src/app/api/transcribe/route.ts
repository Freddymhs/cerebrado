import { NextRequest, NextResponse } from "next/server";
import { getAudioProvider } from "@/lib/audio/factory";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const provider = formData.get("provider") as string | null;

    if (!file || !provider) {
      return NextResponse.json(
        { error: "Missing required fields: file, provider" },
        { status: 400 }
      );
    }

    const audioProvider = getAudioProvider(provider);
    const arrayBuffer = await file.arrayBuffer();
    const audioBlob = new Blob([arrayBuffer], { type: file.type });

    const text = await audioProvider.transcribe(audioBlob, file.type);

    return NextResponse.json({ text });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Transcription failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
