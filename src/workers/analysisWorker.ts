type AnalysisMode = "video" | "coding" | "certification";

interface AnalysisResult {
  summary: string;
  insights: string[];
  suggestions: string[];
  mode: AnalysisMode;
}

interface WorkerMessage {
  imageBase64: string;
  mode: AnalysisMode;
  provider: string;
}

interface WorkerResponse {
  type: "result" | "error";
  data: AnalysisResult | string;
}

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { imageBase64, mode, provider } = event.data;

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64, mode, provider }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const result: AnalysisResult = await response.json();

    const isBlankImage =
      result.summary?.toLowerCase().includes("no puedo ver") ||
      result.summary?.toLowerCase().includes("cannot see") ||
      result.summary?.toLowerCase().includes("no image") ||
      result.summary?.toLowerCase().includes("no puedo analizar") ||
      result.summary?.toLowerCase().includes("blank") ||
      result.summary?.toLowerCase().includes("black");

    if (isBlankImage) {
      fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, mode, summary: null, success: false, error: "blank_frame_discarded" }),
      }).catch(() => {});
      return;
    }

    const message: WorkerResponse = { type: "result", data: result };
    self.postMessage(message);

    fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider,
        mode,
        summary: result.summary?.substring(0, 120),
        success: true,
      }),
    }).catch(() => {});
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const message: WorkerResponse = { type: "error", data: errorMessage };
    self.postMessage(message);

    fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider,
        mode,
        summary: null,
        success: false,
        error: errorMessage,
      }),
    }).catch(() => {});
  }
};
