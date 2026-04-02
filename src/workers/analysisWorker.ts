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
    const message: WorkerResponse = { type: "result", data: result };
    self.postMessage(message);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const message: WorkerResponse = { type: "error", data: errorMessage };
    self.postMessage(message);
  }
};
