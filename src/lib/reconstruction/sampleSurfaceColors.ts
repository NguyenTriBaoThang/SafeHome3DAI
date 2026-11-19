import type { VisionDetection } from "@/lib/vision/types";

// Sample the original pixels before the UI draws labels. Smaller boxes can
// cover the item being sampled (for example, a table on top of a rug).
export function sampleSurfaceColors(image: ImageData, detections: VisionDetection[]) {
  const colors: Record<string, string> = {};
  const visible = detections.filter(d => d.verificationStatus !== "REJECTED");
  for (const detection of visible) {
    const box = detection.bbox;
    const width = box.xMax - box.xMin;
    const height = box.yMax - box.yMin;
    const foreground = visible.map(d => d.bbox).filter(b =>
      (b.xMax - b.xMin) * (b.yMax - b.yMin) < width * height);
    const samples: number[][] = [];
    for (let row = 0; row < 11; row++) {
      for (let col = 0; col < 11; col++) {
        const x = box.xMin + width * (0.1 + col * 0.08);
        const y = box.yMin + height * (0.1 + row * 0.08);
        if (foreground.some(b => x >= b.xMin && x <= b.xMax && y >= b.yMin && y <= b.yMax)) continue;
        const pixel = (Math.floor(y * image.height) * image.width + Math.floor(x * image.width)) * 4;
        samples.push([image.data[pixel], image.data[pixel + 1], image.data[pixel + 2]]);
      }
    }
    if (samples.length < 8) continue;
    const color = [0, 1, 2].map(channel => {
      const values = samples.map(sample => sample[channel]).sort((a, b) => a - b);
      return values[Math.floor(values.length / 2)].toString(16).padStart(2, "0");
    });
    colors[detection.id] = "#" + color.join("");
  }
  return colors;
}
