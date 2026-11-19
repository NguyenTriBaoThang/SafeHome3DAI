import { describe, it, expect } from "vitest";
import {
  analyzeItemHazardFromImage,
  SAMPLE_ITEM_PRESETS,
} from "../src/lib/vision/itemHazardAnalyzer";

describe("Item Hazard Assessment Engine (CDC STEADI / WHO)", () => {
  it("should evaluate a rug photo and answer the 3 core questions", async () => {
    const mockBuffer = Buffer.from("mock-rug-image-bytes");
    const result = await analyzeItemHazardFromImage(
      mockBuffer,
      "tham-trai-san-phong-ngu.jpg",
      "image/jpeg",
      "thảm trải sàn"
    );

    // 1. Mức độ nguy hiểm bao nhiêu?
    expect(result.riskScore).toBeGreaterThanOrEqual(70);
    expect(result.riskScore).toBeLessThanOrEqual(100);
    expect(result.severity).toBe("HIGH");
    expect(result.severityLabel).toContain("/100");

    // 2. Tại sao nguy hiểm? (Căn cứ y tế & cơ chế dáng đi người già)
    expect(result.whyDangerous.summary).toBeTruthy();
    expect(result.whyDangerous.biomechanicalRationale).toContain("dáng đi");
    expect(result.whyDangerous.clinicalReference).toContain("CDC STEADI");
    expect(result.whyDangerous.consequenceRisk).toBeTruthy();

    // 3. Nguy hiểm ở chỗ nào? (Hotspots & tọa độ)
    expect(result.whereDangerous.length).toBeGreaterThanOrEqual(2);
    result.whereDangerous.forEach((spot) => {
      expect(spot.title).toBeTruthy();
      expect(spot.description).toBeTruthy();
      expect(spot.coordinates.x).toBeGreaterThanOrEqual(0);
      expect(spot.coordinates.x).toBeLessThanOrEqual(100);
      expect(spot.coordinates.y).toBeGreaterThanOrEqual(0);
      expect(spot.coordinates.y).toBeLessThanOrEqual(100);
      expect(spot.mechanism).toBeTruthy();
    });

    // 4. Khuyến nghị khắc phục & chi phí
    expect(result.remediation.length).toBeGreaterThan(0);
    expect(result.remediation[0].costEstimate).toBeTruthy();
    expect(result.remediation[0].timeEstimate).toBeTruthy();

    // 5. Trích dẫn y khoa hợp lệ
    expect(result.citations.length).toBeGreaterThan(0);
    expect(result.citations[0].publisher).toBeTruthy();
    expect(result.citations[0].documentId).toBeTruthy();
    expect(result.citations[0].chunkId).toBeTruthy();
  });

  it("should evaluate an electrical cable hazard accurately", async () => {
    const mockBuffer = Buffer.from("mock-cable-bytes");
    const result = await analyzeItemHazardFromImage(
      mockBuffer,
      "day-dien-quat-san.jpg",
      "image/jpeg",
      "dây điện"
    );

    expect(result.itemCategory).toBe("electrical_cable");
    expect(result.riskScore).toBeGreaterThanOrEqual(85);
    expect(result.urgencyLevel).toBe("KHẨN CẤP");
    expect(result.whereDangerous.some((s) => s.title.includes("dây"))).toBe(true);
  });

  it("should evaluate a threshold step hazard accurately", async () => {
    const mockBuffer = Buffer.from("mock-step-bytes");
    const result = await analyzeItemHazardFromImage(
      mockBuffer,
      "go-cua-nha-ve-sinh.jpg",
      "image/jpeg",
      "bậc tam cấp gờ cửa"
    );

    expect(result.itemCategory).toBe("threshold_step");
    expect(result.riskScore).toBeGreaterThanOrEqual(80);
    expect(result.whereDangerous.some((s) => s.coordinates.y > 0)).toBe(true);
  });

  it("should provide sample presets for quick test in the UI", () => {
    expect(SAMPLE_ITEM_PRESETS.length).toBeGreaterThanOrEqual(3);
    SAMPLE_ITEM_PRESETS.forEach((preset) => {
      expect(preset.id).toBeTruthy();
      expect(preset.title).toBeTruthy();
      expect(preset.category).toBeTruthy();
    });
  });
});

