import { describe, it, expect } from "vitest";
import {
  analyzeRoomPhotoWithGemini,
  getFallbackRoomDetections,
} from "@/lib/vision/geminiVisionAdapter";
import fs from "fs";
import path from "path";

describe("Gemini Vision Intelligence Engine", () => {
  it("should gracefully handle missing or invalid image input", async () => {
    const emptyBuffer = Buffer.from("");
    await expect(
      analyzeRoomPhotoWithGemini(emptyBuffer, "image/jpeg")
    ).rejects.toThrow();
  });

  it.skipIf(process.env.SAFEHOME_RUN_LIVE_VISION_TESTS !== "true")("should process and parse interior room image if explicitly enabled", async () => {
    const refImagePath = path.join(process.cwd(), "public/reference/reference_room.jpg");
    if (!fs.existsSync(refImagePath) || !process.env.GEMINI_API_KEY) {
      console.warn("Skipping live API test: image or API key missing.");
      return;
    }

    const imgBuffer = fs.readFileSync(refImagePath);
    const result = await analyzeRoomPhotoWithGemini(imgBuffer, "image/jpeg", {
      roomType: "BEDROOM",
    });

    expect(result).toBeDefined();
    expect(result.detections.length).toBeGreaterThan(0);

    // Verify bounding box normalization
    for (const det of result.detections) {
      expect(det.bbox.xMin).toBeGreaterThanOrEqual(0);
      expect(det.bbox.xMin).toBeLessThanOrEqual(1);
      expect(det.bbox.xMax).toBeGreaterThanOrEqual(0);
      expect(det.bbox.xMax).toBeLessThanOrEqual(1);
      expect(det.bbox.yMin).toBeGreaterThanOrEqual(0);
      expect(det.bbox.yMin).toBeLessThanOrEqual(1);
      expect(det.bbox.yMax).toBeGreaterThanOrEqual(0);
      expect(det.bbox.yMax).toBeLessThanOrEqual(1);
      expect(det.bbox.xMax).toBeGreaterThanOrEqual(det.bbox.xMin);
      expect(det.bbox.yMax).toBeGreaterThanOrEqual(det.bbox.yMin);
      expect(["left", "right", "back", "free"]).toContain(det.placementWall);
    }
  }, 35000);

  it("should generate valid deterministic fallback detections when offline", () => {
    const fallback = getFallbackRoomDetections("BEDROOM");
    expect(fallback.detections.length).toBeGreaterThan(0);
    expect(fallback.floorMaterial).toBe("WOOD");
    expect(fallback.observations.length).toBeGreaterThan(0);

    for (const det of fallback.detections) {
      expect(det.bbox.xMin).toBeGreaterThanOrEqual(0);
      expect(det.bbox.xMax).toBeLessThanOrEqual(1);
      expect(det.bbox.yMin).toBeGreaterThanOrEqual(0);
      expect(det.bbox.yMax).toBeLessThanOrEqual(1);
    }

    const livingFallback = getFallbackRoomDetections("LIVING_ROOM");
    expect(livingFallback.detections.length).toBeGreaterThanOrEqual(7);
    expect(livingFallback.floorMaterial).toBe("CERAMIC_TILE");
    expect(livingFallback.detections.some((d) => d.sceneModelType === "sofa")).toBe(true);
    expect(livingFallback.detections.some((d) => d.sceneModelType === "coffee_table")).toBe(true);
    expect(livingFallback.detections.some((d) => d.sceneModelType === "bench")).toBe(true);
  });
});
