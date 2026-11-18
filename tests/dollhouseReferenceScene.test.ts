import { describe, it, expect } from "vitest";
import { PHOTOREALISTIC_DOLLHOUSE_ROOM } from "@/data/dollhouseReferenceScene";
import { ASSET_REGISTRY } from "@/data/assetRegistry";
import { convertVisionDetectionsTo3DObjects, mapVisionCategoryToAsset } from "@/lib/vision/visionAssetMapper";
import { runEnvironmentalAssessment, calculateSafetyScore } from "@/features/risk-engine/rules";

describe("Photorealistic Isometric Dollhouse & Asset Registry", () => {
  it("defines the photorealistic dollhouse room with 3 interconnected zones", () => {
    expect(PHOTOREALISTIC_DOLLHOUSE_ROOM.id).toBe("room-photoreal-dollhouse-01");
    expect(PHOTOREALISTIC_DOLLHOUSE_ROOM.layoutType).toBe("DOLLHOUSE_MULTI_ZONE");
    expect(PHOTOREALISTIC_DOLLHOUSE_ROOM.zones).toBeDefined();
    expect(PHOTOREALISTIC_DOLLHOUSE_ROOM.zones?.length).toBeGreaterThanOrEqual(3);

    const zoneTypes = PHOTOREALISTIC_DOLLHOUSE_ROOM.zones?.map((z) => z.type);
    expect(zoneTypes).toContain("bedroom");
    expect(zoneTypes).toContain("walk_in_closet");
    expect(zoneTypes).toContain("bathroom");
  });

  it("contains all critical photorealistic furniture matching reference photo", () => {
    const objects = PHOTOREALISTIC_DOLLHOUSE_ROOM.objects;
    const modelTypes = objects.map((o) => o.modelType);

    // Bedroom components
    expect(modelTypes).toContain("bed");
    expect(modelTypes).toContain("nightstand");
    expect(modelTypes).toContain("rug");
    expect(modelTypes).toContain("plant");
    expect(modelTypes).toContain("wall_art");
    expect(modelTypes).toContain("window");

    // Walk-in closet components
    expect(modelTypes).toContain("wardrobe");
    expect(modelTypes).toContain("cabinet");

    // Bathroom components
    expect(modelTypes).toContain("shower");
    expect(modelTypes).toContain("sink");
    expect(modelTypes).toContain("toilet");
    expect(modelTypes).toContain("grab_bar");

    // All objects must have non-zero dimensions and coordinates
    for (const obj of objects) {
      expect(obj.id).toBeDefined();
      expect(obj.dimensions.width).toBeGreaterThan(0);
      expect(obj.dimensions.length).toBeGreaterThan(0);
      expect(obj.dimensions.height).toBeGreaterThan(0);
      expect(obj.position.length).toBe(3);
    }
  });

  it("registers all required GLB models in ASSET_REGISTRY", () => {
    const requiredAssets = [
      "double_bed_photoreal",
      "bedside_table_lamp",
      "walkin_closet_system",
      "drawer_cabinet",
      "toilet_modern",
      "bathroom_vanity",
      "shower_enclosure",
      "potted_plant",
      "framed_wall_art",
      "modern_window",
      "safety_grab_bar",
    ];

    for (const assetId of requiredAssets) {
      const entry = ASSET_REGISTRY[assetId];
      expect(entry, `Asset ${assetId} must exist in ASSET_REGISTRY`).toBeDefined();
      expect(entry.glbPath).toMatch(/\.glb$/);
      expect(entry.nominalDimensions.width).toBeGreaterThan(0);
      expect(entry.nominalDimensions.height).toBeGreaterThan(0);
      expect(entry.license).toBeDefined();
    }
  });

  it("correctly maps AI Vision detections to 3D assets", () => {
    const bedAsset = mapVisionCategoryToAsset("bed");
    expect(bedAsset?.id).toBe("double_bed_photoreal");

    const toiletAsset = mapVisionCategoryToAsset("toilet");
    expect(toiletAsset?.id).toBe("toilet_modern");

    const converted = convertVisionDetectionsTo3DObjects("room-test-01", [
      {
        id: "det-1",
        category: "bed",
        label: "Giường ngủ đôi",
        confidence: 0.94,
        bbox: { xMin: 0.1, yMin: 0.2, xMax: 0.5, yMax: 0.6 },
      },
      {
        id: "det-2",
        category: "toilet",
        label: "Bồn cầu sứ",
        confidence: 0.96,
        bbox: { xMin: 0.7, yMin: 0.3, xMax: 0.9, yMax: 0.6 },
      },
    ]);

    expect(converted.length).toBe(2);
    expect(converted[0].assetId).toBe("double_bed_photoreal");
    expect(converted[1].assetId).toBe("toilet_modern");
    expect(converted[0].verified).toBe(true);
  });

  it("evaluates risk assessment on the dollhouse scene cleanly", () => {
    const findings = runEnvironmentalAssessment(PHOTOREALISTIC_DOLLHOUSE_ROOM);
    const score = calculateSafetyScore(findings);

    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
    expect(Array.isArray(findings)).toBe(true);
  });
});
