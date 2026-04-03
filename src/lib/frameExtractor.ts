const MAX_WIDTH = 768;
const BLACK_THRESHOLD = 8; // avg brightness 0-255; below this = black frame
let canvas: HTMLCanvasElement | null = null;

function getCanvas(): HTMLCanvasElement {
  if (!canvas) {
    canvas = document.createElement("canvas");
  }
  return canvas;
}

/** Returns base64 JPEG or null if the frame is black/empty */
export function extractFrame(video: HTMLVideoElement): string | null {
  const canvas = getCanvas();
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const videoWidth = video.videoWidth;
  const videoHeight = video.videoHeight;
  if (!videoWidth || !videoHeight) return null;

  const scale = Math.min(1, MAX_WIDTH / videoWidth);
  const width = Math.floor(videoWidth * scale);
  const height = Math.floor(videoHeight * scale);

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(video, 0, 0, width, height);

  // Sample pixels to detect black frame (skip expensive full scan)
  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data;
  const SAMPLE_STEP = 40;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < pixels.length; i += 4 * SAMPLE_STEP) {
    sum += pixels[i] + pixels[i + 1] + pixels[i + 2];
    count++;
  }
  const avgBrightness = count > 0 ? sum / (count * 3) : 0;
  if (avgBrightness < BLACK_THRESHOLD) return null;

  const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
  return dataUrl.split(",")[1];
}
