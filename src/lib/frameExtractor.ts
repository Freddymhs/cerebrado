const MAX_WIDTH = 1280;
let canvas: HTMLCanvasElement | null = null;

function getCanvas(): HTMLCanvasElement {
  if (!canvas) {
    canvas = document.createElement("canvas");
  }
  return canvas;
}

export function extractFrame(video: HTMLVideoElement): string {
  const canvas = getCanvas();
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  const videoWidth = video.videoWidth;
  const videoHeight = video.videoHeight;

  if (!videoWidth || !videoHeight) {
    throw new Error("Video has no dimensions");
  }

  const scale = Math.min(1, MAX_WIDTH / videoWidth);
  const width = Math.floor(videoWidth * scale);
  const height = Math.floor(videoHeight * scale);

  canvas.width = width;
  canvas.height = height;

  ctx.drawImage(video, 0, 0, width, height);

  const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
  const base64 = dataUrl.split(",")[1];
  return base64;
}
