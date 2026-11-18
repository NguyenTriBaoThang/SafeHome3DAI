import { ASSET_REGISTRY } from "@/data/assetRegistry";
import { VisionDetection, NormalizedBoundingBox, ViewpointType } from "@/lib/vision/types";
import {
  SemanticSceneGraph,
  SemanticSceneObject,
  RoomEnvelopeDimensions,
} from "./sceneGraphTypes";
import { matchAssetForDetection } from "@/lib/assets/assetMatcher";

export interface ReconstructionConfig {
  roomType: "BEDROOM" | "BATHROOM" | "LIVING_ROOM";
  viewpoint?: ViewpointType;
  manualDimensions?: {
    width?: number;
    length?: number;
    height?: number;
  };
  floorMaterial?: "WOOD" | "CERAMIC_TILE" | "NON_SLIP_VINYL";
  sourceImageUrls?: string[];
  notes?: string;
}

/**
 * Unprojects a normalized 2D Bounding Box [0..1] into 3D Floor Coordinates (meters)
 * based on viewpoint camera pose and room dimensions.
 */
export function unprojectBboxTo3D(
  bbox: NormalizedBoundingBox,
  roomDims: { width: number; length: number; height: number },
  viewpoint: ViewpointType = "ENTRANCE"
): { x: number; z: number; widthM: number; lengthM: number } {
  const boxWidthNorm = Math.max(bbox.xMax - bbox.xMin, 0.05);
  const boxHeightNorm = Math.max(bbox.yMax - bbox.yMin, 0.05);

  const centerXNorm = (bbox.xMin + bbox.xMax) / 2;
  const bottomYNorm = bbox.yMax; // Ground contact point

  // Perspective mapping:
  // In an interior photo taken from entrance looking inward:
  // - Top of image (low Y) is further away (deep into the room, negative Z).
  // - Bottom of image (high Y) is closer to the entrance (positive Z).
  // - Center X (0.5) is center of room (X = 0).

  let estX = 0;
  let estZ = 0;

  if (viewpoint === "ENTRANCE") {
    // X axis spans -width/2 to +width/2
    estX = (centerXNorm - 0.5) * (roomDims.width * 0.85);

    // Z axis: bottom (1.0) is near entrance (+Z), top (<0.5) is rear wall (-Z)
    estZ = (bottomYNorm - 0.5) * (roomDims.length * 0.85);
  } else if (viewpoint === "OPPOSITE_CORNER") {
    // 45-degree angled view
    const rotAngle = Math.PI / 4;
    const rawX = (centerXNorm - 0.5) * (roomDims.width * 0.8);
    const rawZ = (bottomYNorm - 0.5) * (roomDims.length * 0.8);

    estX = rawX * Math.cos(rotAngle) - rawZ * Math.sin(rotAngle);
    estZ = rawX * Math.sin(rotAngle) + rawZ * Math.cos(rotAngle);
  } else {
    // Default symmetric projection
    estX = (centerXNorm - 0.5) * (roomDims.width * 0.8);
    estZ = (bottomYNorm - 0.5) * (roomDims.length * 0.8);
  }

  // Estimate physical footprint based on normalized box scale relative to room
  const widthM = Number((boxWidthNorm * roomDims.width * 0.9).toFixed(2));
  const lengthM = Number((boxHeightNorm * roomDims.length * 0.9).toFixed(2));

  return {
    x: Number(estX.toFixed(2)),
    z: Number(estZ.toFixed(2)),
    widthM: Math.max(widthM, 0.3),
    lengthM: Math.max(lengthM, 0.3),
  };
}

/**
 * Reconstructs a full Semantic 3D Scene Graph from AI Vision Detections
 */
export function reconstructSceneFromDetections(
  detections: VisionDetection[],
  config: ReconstructionConfig
): SemanticSceneGraph {
  const isBathroom = config.roomType === "BATHROOM";

  // 1. Establish metric room dimensions
  const dimensions: RoomEnvelopeDimensions = {
    width: config.manualDimensions?.width || (isBathroom ? 3.2 : 4.5),
    length: config.manualDimensions?.length || (isBathroom ? 3.6 : 5.0),
    height: config.manualDimensions?.height || 2.8,
    unit: "m",
  };

  const sceneId = `scene_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const halfW = dimensions.width / 2;
  const halfL = dimensions.length / 2;

  const objects: SemanticSceneObject[] = [];

  // 2. Process each confirmed/pending detection
  for (const det of detections) {
    if (det.verificationStatus === "REJECTED") continue;

    // Unproject to 3D floor coordinates
    const unproj = unprojectBboxTo3D(
      det.bbox,
      dimensions,
      config.viewpoint || "ENTRANCE"
    );

    // Query intelligent Asset Matching Engine
    const matched = matchAssetForDetection({
      category: det.sceneModelType ?? det.category,
      name: det.userLabel || det.originalLabel,
      estimatedDimensions: {
        width: unproj.widthM,
        length: unproj.lengthM,
        height: isBathroom ? 0.85 : 0.7,
      },
    });

    // Clamp coordinates strictly within room boundaries (snap to walls if too close)
    const margin = 0.15;
    const clampedX = Math.min(
      Math.max(unproj.x, -halfW + matched.dimensions.width / 2 + margin),
      halfW - matched.dimensions.width / 2 - margin
    );
    const clampedZ = Math.min(
      Math.max(unproj.z, -halfL + matched.dimensions.length / 2 + margin),
      halfL - matched.dimensions.length / 2 - margin
    );

    // Determine initial rotation based on wall proximity
    let rotY = 0;
    if (clampedX < -halfW * 0.6) {
      rotY = Math.PI / 2; // Headboard or back against left wall
    } else if (clampedZ < -halfL * 0.6) {
      rotY = 0; // Back against rear wall
    }

    let x = clampedX;
    let z = clampedZ;
    let y = 0;
    if (det.placementWall) {
      const wall = det.placementWall;
      const side = wall === "left" || wall === "right";
      const kind = matched.modelType;
      const extent = matched.dimensions;
      const widthFraction = det.bbox.xMax - det.bbox.xMin;
      const heightFraction = det.bbox.yMax - det.bbox.yMin;
      if (["tv", "mirror", "window", "curtain", "media_console"].includes(kind)) {
        const wallSpan = side ? dimensions.length : dimensions.width;
        extent.width = Math.max(0.2, Math.min(wallSpan * 0.94, widthFraction * wallSpan * (side ? 1.65 : 1.15)));
        extent.height = Math.max(0.15, Math.min(dimensions.height * 0.98, heightFraction * dimensions.height * 1.35));
        extent.length = kind === "media_console" ? 0.38 : kind === "curtain" ? 0.14 : 0.08;
        if (kind === "media_console") extent.height = Math.min(0.65, extent.height);
        if (kind !== "media_console" && wall !== "free") {
          y = Math.max(0, Math.min(dimensions.height - extent.height, dimensions.height * (0.76 - det.bbox.yMax)));
        }
        // Window GLB uses its registered nominal dimensions.
        if (kind === "window") {
          const nominal = ASSET_REGISTRY[matched.assetId].nominalDimensions;
          matched.scale = [extent.width / nominal.width, extent.height / nominal.height, extent.length / nominal.length];
        }
      } else if (["chair", "sofa", "stool", "desk"].includes(kind)) {
        const depth = kind === "sofa" ? 0.9 : kind === "desk" ? 0.65 : 0.46;
        extent.length = depth;
        extent.width = Math.max(kind === "sofa" ? 1.35 : 0.35, Math.min(unproj.widthM, kind === "desk" || kind === "sofa" ? 2.4 : 0.7));
        extent.height = kind === "stool" ? 0.46 : kind === "desk" ? 0.76 : 0.85;
      } else if (kind === "rug") {
        extent.height = 0.015;
      }
      rotY = wall === "left" ? Math.PI / 2 : wall === "right" ? -Math.PI / 2 : 0;
      const limitX = Math.max(0, halfW - (side ? extent.length : extent.width) / 2 - 0.09);
      const limitZ = Math.max(0, halfL - (side ? extent.width : extent.length) / 2 - 0.09);
      x = side ? (wall === "left" ? -limitX : limitX) : Math.max(-limitX, Math.min(limitX, unproj.x));
      // The bottom edge is the near edge of a floor object; its centre lies farther back.
      const depth = unproj.z - (side ? extent.width : extent.length) / 2;
      z = wall === "back" ? -limitZ : Math.max(-limitZ, Math.min(limitZ, depth));
    }

    const isFixed = ["bed", "wardrobe", "toilet", "sink", "shower"].includes(
      matched.modelType
    );
    const isLoose = matched.modelType === "rug";
    const isObstacle = ["chair", "box", "coffee_table", "cable"].includes(
      matched.modelType
    );

    objects.push({
      id: `obj_${det.id}`,
      category: matched.modelType.toUpperCase(),
      name: det.userLabel || det.originalLabel || matched.description,
      assetId: matched.assetId,
      glbPath: matched.glbPath,
      position: [x, y, z],
      rotation: [0, rotY, 0],
      scale: matched.scale,
      dimensions: matched.dimensions,
      detectionConfidence: det.confidence,
      measurementStatus: "estimated",
      verified: det.verificationStatus === "CONFIRMED" || det.verificationStatus === "CORRECTED",
      isFixed,
      isLoose,
      isWalkwayObstacle: isObstacle,
      riskIds: [],
      sourceDetectionId: det.id,
      sourceImageId: det.imageId,
    });
  }

  return {
    sceneId,
    roomType: config.roomType,
    geometrySource: "ai_vision_reconstructed",
    dimensions,
    floorProperties: {
      material:
        config.floorMaterial || (isBathroom ? "CERAMIC_TILE" : "WOOD"),
      isSlipResistant: !isBathroom,
      isWet: isBathroom,
    },
    lightingLevelLux: isBathroom ? 120 : 180,
    objects,
    metadata: {
      sourceImages: config.sourceImageUrls || [],
      calibrationAnchor: objects[0]?.id,
      reconstructionTimestamp: new Date().toISOString(),
      version: "2.0.0",
      notes: config.notes || "Tái dựng không gian 3D từ ảnh thực tế bằng AI",
    },
  };
}
