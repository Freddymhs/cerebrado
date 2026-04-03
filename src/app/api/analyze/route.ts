import { NextRequest, NextResponse } from "next/server";
import type { AnalysisMode, ToolCallRequest } from "@/lib/ai/types";
import { MODE_PROMPTS, ANALYSIS_MODES } from "@/constants/analysis";
import { getAIProvider } from "@/lib/ai/factory";
import { LOOKUP_PATTERN_TOOL, findPattern } from "@/lib/ai/interview-patterns";

function isToolCallRequest(value: unknown): value is ToolCallRequest {
  return (
    typeof value === "object" &&
    value !== null &&
    "toolName" in value &&
    "args" in value
  );
}

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
  const basePrompt = MODE_PROMPTS[analysisMode];
  // If a context override arrives (e.g. coding mic question), append the base mode prompt
  // so the JSON format instruction is always present regardless of the override content.
  const context = bodyContext
    ? `${bodyContext as string}\n\n${basePrompt}`
    : basePrompt;
  const aiProvider = getAIProvider(provider);

  try {
    let result;

    if (imageBase64) {
      result = await aiProvider.analyzeScreen(imageBase64, context);
    } else if (analysisMode === "entrevista" && aiProvider.analyzeWithTools) {
      // Interview mode: use tool calling loop if the provider supports it
      const input = text ?? "";
      const intermediate = await aiProvider.analyzeWithTools(input, context, [LOOKUP_PATTERN_TOOL]);

      if (isToolCallRequest(intermediate)) {
        // Model wants to look up a pattern — execute the tool and continue
        const pattern = findPattern(intermediate.args.scenario ?? "");
        const toolResultContent = pattern
          ? `Pattern: ${pattern.label}\n${pattern.solution.join("\n")}${pattern.cvAnchor ? `\nCV anchor: ${pattern.cvAnchor}` : ""}`
          : "No specific pattern found. Use general best practices.";

        result = await aiProvider.continueWithToolResult!(input, context, [LOOKUP_PATTERN_TOOL], {
          toolCallId: intermediate.toolCallId,
          toolName: intermediate.toolName,
          result: toolResultContent,
        });
      } else {
        result = intermediate;
      }
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
