import { NextRequest, NextResponse } from "next/server";
import type { AnalysisMode } from "@/lib/ai/types";
import { MODE_PROMPTS, ANALYSIS_MODES } from "@/constants/analysis";
import { getAIProvider } from "@/lib/ai/factory";

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type");
  if (!contentType?.includes("application/json")) {
    return NextResponse.json(
      { error: "Content-Type must be application/json" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const { imageBase64, text, mode, provider, context: bodyContext } = body;

  if (!mode || !ANALYSIS_MODES.includes(mode)) {
    return NextResponse.json(
      {
        error: `Invalid mode. Must be one of: ${ANALYSIS_MODES.join(", ")}`,
      },
      { status: 400 }
    );
  }

  // entrevista mode sends neither imageBase64 nor text — context comes from transcript via body.context
  if (!imageBase64 && !text && mode !== "entrevista") {
    return NextResponse.json(
      { error: "Either imageBase64 or text must be provided" },
      { status: 400 }
    );
  }

  if (!provider || typeof provider !== "string") {
    return NextResponse.json(
      { error: "provider is required" },
      { status: 400 }
    );
  }

  const analysisMode = mode as AnalysisMode;
  const context = (bodyContext as string | undefined) ?? MODE_PROMPTS[analysisMode];
  const aiProvider = getAIProvider(provider);

  try {
    let result;
    if (imageBase64) {
      result = await aiProvider.analyzeScreen(imageBase64, context);
    } else {
      result = await aiProvider.analyzeText(text ?? "", context);
    }

    return NextResponse.json({ ...result, mode: analysisMode });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[analyze] Error:", message);
    return NextResponse.json(
      { error: `Analysis failed: ${message}` },
      { status: 500 }
    );
  }
}
