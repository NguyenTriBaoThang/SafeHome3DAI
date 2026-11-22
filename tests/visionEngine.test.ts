import { describe, it, expect } from "vitest";
import {
  validateImageBuffer,
  stripExifMetadata,
  pixelToNormalizedBox,
  normalizedToPixelBox,
} from "@/lib/vision/imagePreprocessor";
import { normalizePredictedLabel, CATEGORY_TAXONOMY } from "@/lib/vision/taxonomy";
import { runVisionAnalysis } from "@/lib/vision/visionProvider";
import { mapClarificationToRoomFacts } from "@/lib/vision/clarificationEngine";

describe("SafeHome Vision Intelligence — Unit Tests", () => {
  describe("Image Preprocessor & Validation", () => {
    it("validates valid JPEG magic bytes", () => {
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      const res = validateImageBuffer(jpegBuffer);
      expect(res.isValid).toBe(true);
      expect(res.mimeType).toBe("image/jpeg");
      expect(res.fileExtension).toBe("jpg");
    });

    it("validates valid PNG magic bytes", () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
      const res = validateImageBuffer(pngBuffer);
      expect(res.isValid).toBe(true);
      expect(res.mimeType).toBe("image/png");
      expect(res.fileExtension).toBe("png");
    });

    it("rejects empty or corrupted non-image files", () => {
      const emptyBuffer = Buffer.alloc(0);
      const resEmpty = validateImageBuffer(emptyBuffer);
      expect(resEmpty.isValid).toBe(false);

      const textBuffer = Buffer.from("Hello world not an image");
      const resText = validateImageBuffer(textBuffer);
      expect(resText.isValid).toBe(false);
      expect(resText.errorMessage).toContain("Định dạng tệp không được hỗ trợ");
    });

    it("strips EXIF metadata safely from JPEG buffer", () => {
      // Mock JPEG with APP1 EXIF segment (0xFF 0xE1)
      const mockExifJpeg = Buffer.from([
        0xff, 0xd8, // SOI
        0xff, 0xe1, 0x00, 0x08, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // APP1 Exif length 8
        0xff, 0xdb, 0x00, 0x04, 0x01, 0x02, // DQT
      ]);
      const stripped = stripExifMetadata(mockExifJpeg);
      expect(stripped.length).toBeLessThan(mockExifJpeg.length);
      expect(stripped.includes(Buffer.from([0xff, 0xe1]))).toBe(false);
    });

    it("converts pixel coordinates to normalized bounding box and back accurately", () => {
      const imgW = 1000;
      const imgH = 800;
      const norm = pixelToNormalizedBox(200, 100, 400, 300, imgW, imgH);

      expect(norm.xMin).toBe(0.2);
      expect(norm.yMin).toBe(0.125);
      expect(norm.xMax).toBe(0.6);
      expect(norm.yMax).toBe(0.5);

      const pixel = normalizedToPixelBox(norm, imgW, imgH);
      expect(pixel.x).toBe(200);
      expect(pixel.y).toBe(100);
      expect(pixel.width).toBe(400);
      expect(pixel.height).toBe(300);
    });
  });

  describe("Taxonomy & Model Label Mapping", () => {
    it("maps standard COCO classes to SafeHome categories", () => {
      expect(normalizePredictedLabel("bed").category).toBe("bed");
      expect(normalizePredictedLabel("chair").category).toBe("chair");
      expect(normalizePredictedLabel("couch").category).toBe("sofa");
      expect(normalizePredictedLabel("toilet").category).toBe("toilet");
      expect(normalizePredictedLabel("dining table").category).toBe("table");
    });

    it("maps specialized environmental categories with Vietnamese labels", () => {
      const rug = normalizePredictedLabel("area rug with curls");
      expect(rug.category).toBe("rug");
      expect(rug.vietnameseName).toContain("Thảm");
      expect(rug.isSpecializedFallback).toBe(true);

      const cable = normalizePredictedLabel("extension power cable");
      expect(cable.category).toBe("electrical_cable");
      expect(cable.vietnameseName).toContain("Dây điện");

      const grabBar = normalizePredictedLabel("bathroom grab bar");
      expect(grabBar.category).toBe("grab_bar");
      expect(grabBar.vietnameseName).toContain("tay vịn");
    });

    it("covers 18 categories including lighting objects without claiming measured risks", () => {
      expect(Object.keys(CATEGORY_TAXONOMY).length).toBe(18);
      expect(CATEGORY_TAXONOMY.rug.vietnameseName).toBeDefined();
      expect(CATEGORY_TAXONOMY.grab_bar.vietnameseName).toBeDefined();
      expect(normalizePredictedLabel("bedside lamp").category).toBe("lamp");
      expect(normalizePredictedLabel("công tắc đèn").category).toBe("light_switch");
      expect(normalizePredictedLabel("light_switch").category).toBe("light_switch");
      expect(CATEGORY_TAXONOMY.lamp.description).toContain("Không suy ra lux");
      expect(CATEGORY_TAXONOMY.light_switch.description).toContain("thiếu đo đạc");
    });
  });

  describe("Vision Provider Inference & Observations", () => {
    it("generates structured detections and observations for BEDROOM", async () => {
      const analysis = await runVisionAnalysis("img-1", "room-bedroom-1", {
        demo: true,
        roomType: "BEDROOM",
        viewpoint: "ENTRANCE",
      });

      expect(analysis.analysisStatus).toBe("COMPLETED");
      expect(analysis.detections.length).toBeGreaterThanOrEqual(3);

      const categories = analysis.detections.map((d) => d.category);
      expect(categories).toContain("bed");
      expect(categories).toContain("rug");

      // Check observation uncertainty tags
      expect(analysis.observations.length).toBeGreaterThanOrEqual(2);
      for (const obs of analysis.observations) {
        expect(obs.uncertaintyType).toBeDefined();
        expect(obs.requiresConfirmation).toBe(true);
        expect(obs.verificationStatus).toBe("PENDING_REVIEW");
      }

      // Check clarification questions mapping to survey
      expect(analysis.clarifications.length).toBeGreaterThanOrEqual(2);
      const questionIds = analysis.clarifications.map((c) => c.surveyQuestionId);
      expect(questionIds).toContain("BED_006"); // Rug presence
      expect(questionIds).toContain("BED_004"); // Nighttime light
    });

    it("generates structured detections and observations for BATHROOM", async () => {
      const analysis = await runVisionAnalysis("img-2", "room-bathroom-1", {
        demo: true,
        roomType: "BATHROOM",
        viewpoint: "ENTRANCE",
      });

      expect(analysis.analysisStatus).toBe("COMPLETED");
      const categories = analysis.detections.map((d) => d.category);
      expect(categories).toContain("toilet");

      const questionIds = analysis.clarifications.map((c) => c.surveyQuestionId);
      expect(questionIds).toContain("BATH_005"); // Grab bar presence
      expect(questionIds).toContain("BATH_003"); // Slippery floor & mat
    });

    it("returns empty detections in MANUAL_REVIEW mode", async () => {
      const analysis = await runVisionAnalysis("img-3", "room-1", {
        mode: "MANUAL_REVIEW",
      });
      expect(analysis.detections.length).toBe(0);
      expect(analysis.modelId).toBe("manual-photo-review");
    });
  });

  describe("Clarification Engine & Room Fact Mapping", () => {
    it("maps BED_006 YES to rugs.present = true", () => {
      const facts = mapClarificationToRoomFacts("room-1", "BED_006", "YES", "ref-1");
      expect(facts.length).toBe(1);
      expect(facts[0].fieldPath).toBe("rugs.present");
      expect(facts[0].confirmedValue).toBe(true);
      expect(facts[0].source).toBe("USER_CONFIRMED_VISION");
    });

    it("maps BED_007 UNSECURED to rugs.secured = false", () => {
      const facts = mapClarificationToRoomFacts("room-1", "BED_007", "UNSECURED", "ref-2");
      expect(facts.length).toBe(1);
      expect(facts[0].fieldPath).toBe("rugs.secured");
      expect(facts[0].confirmedValue).toBe(false);
    });

    it("maps BATH_005 NONE to grabBars.present = false, grabBars.count = 0", () => {
      const facts = mapClarificationToRoomFacts("room-bath", "BATH_005", "NONE", "ref-3");
      expect(facts.find(f => f.fieldPath === "grabBars.locations")?.confirmedValue).toEqual([]);
      expect(facts.find((f) => f.fieldPath === "grabBars.present")?.confirmedValue).toBe(false);
      expect(facts.find((f) => f.fieldPath === "grabBars.count")?.confirmedValue).toBe(0);
    });
  });
});

