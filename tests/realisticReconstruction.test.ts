import { describe, it, expect } from "vitest";
import { ASSET_REGISTRY } from "@/data/assetRegistry";
import { matchAssetForDetection } from "@/lib/assets/assetMatcher";
import {
  unprojectBboxTo3D,
  reconstructSceneFromDetections,
} from "@/lib/reconstruction/spatialReconstructor";
import { convertSceneGraphToRoomState } from "@/lib/reconstruction/sceneToRoomAdapter";
import { SemanticSceneGraphSchema } from "@/lib/reconstruction/sceneGraphTypes";
import { VisionDetection } from "@/lib/vision/types";
import { runEnvironmentalAssessment } from "@/features/risk-engine/rules";

describe("Realistic AI Room Reconstruction & Asset Matching Suite", () => {
  it("ASSET_REGISTRY contains valid models for all major elderly room categories", () => {
    expect(ASSET_REGISTRY.double_bed_photoreal).toBeDefined();
    expect(ASSET_REGISTRY.double_bed_photoreal.glbPath).toBe(
      "/models/bedroom/double_bed_photoreal.glb"
    );
    expect(ASSET_REGISTRY.toilet_modern).toBeDefined();
    expect(ASSET_REGISTRY.toilet_modern.glbPath).toBe(
      "/models/bathroom/toilet_modern.glb"
    );
    expect(ASSET_REGISTRY.shower_enclosure).toBeDefined();
    expect(ASSET_REGISTRY.safety_grab_bar).toBeDefined();
    expect(ASSET_REGISTRY.side_table).toBeDefined();
  });

  it("matchAssetForDetection correctly matches detected categories to photoreal GLBs", () => {
    // 1. Bed detection
    const bedMatch = matchAssetForDetection({
      category: "bed",
      estimatedDimensions: { width: 1.8, length: 2.0, height: 0.7 },
    });
    expect(bedMatch.assetId).toBe("double_bed_photoreal");
    expect(bedMatch.glbPath).toBe("/models/bedroom/double_bed_photoreal.glb");
    expect(bedMatch.isProceduralFallback).toBe(false);
    expect(bedMatch.scale[0]).toBeGreaterThan(0.7);
    expect(bedMatch.scale[0]).toBeLessThan(1.4);

    // 2. Toilet detection
    const toiletMatch = matchAssetForDetection({
      category: "toilet",
    });
    expect(toiletMatch.assetId).toBe("toilet_modern");
    expect(toiletMatch.isProceduralFallback).toBe(false);

    // 3. Fallback for rug
    const rugMatch = matchAssetForDetection({
      category: "rug",
    });
    expect(rugMatch.assetId).toBe("procedural_rug");
    expect(rugMatch.isProceduralFallback).toBe(true);
    expect(rugMatch.dimensions.width).toBeGreaterThan(0);
  });

  it("unprojectBboxTo3D projects 2D normalized bbox to valid metric coordinates inside room", () => {
    const roomDims = { width: 4.5, length: 5.0, height: 2.8 };

    // Detection in bottom center (closer to entrance)
    const bboxNear = { xMin: 0.35, yMin: 0.7, xMax: 0.65, yMax: 0.95 };
    const posNear = unprojectBboxTo3D(bboxNear, roomDims, "ENTRANCE");

    expect(posNear.x).toBeCloseTo(0, 1);
    expect(posNear.z).toBeGreaterThan(-roomDims.length / 2);
    expect(posNear.z).toBeLessThan(roomDims.length / 2);

    // Detection in top-left (far corner, deep in room)
    const bboxFarLeft = { xMin: 0.1, yMin: 0.1, xMax: 0.3, yMax: 0.35 };
    const posFarLeft = unprojectBboxTo3D(bboxFarLeft, roomDims, "ENTRANCE");

    expect(posFarLeft.x).toBeLessThan(0); // Left side
    expect(posFarLeft.z).toBeLessThan(0); // Deep in room
  });

  it("reconstructSceneFromDetections generates a valid SemanticSceneGraph", () => {
    const mockDetections: VisionDetection[] = [
      {
        id: "det_bed_1",
        analysisId: "a1",
        imageId: "img1",
        category: "bed",
        originalLabel: "double bed",
        confidence: 0.94,
        bbox: { xMin: 0.15, yMin: 0.25, xMax: 0.7, yMax: 0.8 },
        source: "OBJECT_DETECTOR",
        verificationStatus: "CONFIRMED",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "det_rug_1",
        analysisId: "a1",
        imageId: "img1",
        category: "rug",
        originalLabel: "floor rug",
        confidence: 0.88,
        bbox: { xMin: 0.2, yMin: 0.75, xMax: 0.6, yMax: 0.95 },
        source: "OBJECT_DETECTOR",
        verificationStatus: "CONFIRMED",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const sceneGraph = reconstructSceneFromDetections(mockDetections, {
      roomType: "BEDROOM",
      viewpoint: "ENTRANCE",
      manualDimensions: { width: 4.5, length: 5.2, height: 2.8 },
      floorMaterial: "WOOD",
    });

    // Validate with Zod
    const parsed = SemanticSceneGraphSchema.safeParse(sceneGraph);
    expect(parsed.success).toBe(true);

    // Grounding check: Y must be 0 for all floor furniture
    for (const obj of sceneGraph.objects) {
      expect(obj.position[1]).toBe(0);
      // Wall boundary checks
      expect(Math.abs(obj.position[0])).toBeLessThanOrEqual(4.5 / 2);
      expect(Math.abs(obj.position[2])).toBeLessThanOrEqual(5.2 / 2);
    }
  });

  it("convertSceneGraphToRoomState seamlessly integrates with the Deterministic Clinical Risk Engine", () => {
    const mockDetections: VisionDetection[] = [
      {
        id: "det_bed_test",
        analysisId: "a1",
        imageId: "img1",
        category: "bed",
        originalLabel: "bed",
        confidence: 0.95,
        bbox: { xMin: 0.2, yMin: 0.2, xMax: 0.7, yMax: 0.7 },
        source: "OBJECT_DETECTOR",
        verificationStatus: "CONFIRMED",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "det_rug_loose",
        analysisId: "a1",
        imageId: "img1",
        category: "rug",
        originalLabel: "loose rug",
        confidence: 0.9,
        bbox: { xMin: 0.3, yMin: 0.6, xMax: 0.6, yMax: 0.85 },
        source: "OBJECT_DETECTOR",
        verificationStatus: "CONFIRMED",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const sceneGraph = reconstructSceneFromDetections(mockDetections, {
      roomType: "BEDROOM",
      floorMaterial: "WOOD",
    });

    const roomState = convertSceneGraphToRoomState(sceneGraph);

    // Mark rug as loose to simulate risk detection
    const rugObj = roomState.objects.find((o) => o.modelType === "rug");
    expect(rugObj).toBeDefined();
    if (rugObj) {
      rugObj.isLoose = true;
    }

    // Run deterministic clinical risk engine
    const findings = runEnvironmentalAssessment(roomState);
    expect(findings.length).toBeGreaterThan(0);

    // Verify loose rug rule triggers
    const looseRugFinding = findings.find((f) => f.hazardType === "LOOSE_RUG");
    expect(looseRugFinding).toBeDefined();
    expect(looseRugFinding?.severityCategory).toBe("HIGH");
  });
});
