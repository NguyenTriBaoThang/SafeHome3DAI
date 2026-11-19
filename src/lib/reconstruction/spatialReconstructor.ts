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
  imageAspect?: number;
  surfaceColors?: Record<string, string>;
  manualDimensions?: {
    width?: number;
    length?: number;
    height?: number;
  };
  floorMaterial?: "WOOD" | "CERAMIC_TILE" | "NON_SLIP_VINYL";
  sourceImageUrls?: string[];
  notes?: string;
}

// The photo uses normalized coordinates. A vertical field of view defines the
// focal length in image heights, so horizontal displacements include the aspect.
function cameraRay(u: number, v: number, aspect: number) {
  const pitch = 18 * Math.PI / 180;
  const focal = 0.5 / Math.tan(65 * Math.PI / 360);
  const up = (0.5 - v) / focal;
  return {
    x: (u - 0.5) * aspect / focal,
    y: up * Math.cos(pitch) - Math.sin(pitch),
    z: -(up * Math.sin(pitch) + Math.cos(pitch)),
  };
}

function projectToPlane(u: number, v: number, planeY: number, room: Pick<RoomEnvelopeDimensions, "width" | "length">, viewpoint: ViewpointType, aspect: number) {
  const ray = cameraRay(u, v, aspect);
  const distance = (planeY - 1.45) / ray.y;
  const t = distance > 0 ? Math.min(distance, Math.hypot(room.width, room.length)) : room.length;
  const fromCorner = viewpoint === "OPPOSITE_CORNER";
  const yaw = fromCorner ? Math.PI / 4 : 0;
  const x = fromCorner ? room.width / 2 - 0.35 : 0;
  return {
    x: x + t * (ray.x * Math.cos(yaw) + ray.z * Math.sin(yaw)),
    z: room.length / 2 - 0.35 + t * (ray.z * Math.cos(yaw) - ray.x * Math.sin(yaw)),
    t,
  };
}

export function unprojectBboxTo3D(
  bbox: NormalizedBoundingBox,
  roomDims: { width: number; length: number; height: number },
  viewpoint: ViewpointType = "ENTRANCE",
  imageAspect = 1
) {
  const center = (bbox.xMin + bbox.xMax) / 2;
  const near = projectToPlane(center, bbox.yMax, 0, roomDims, viewpoint, imageAspect);
  const far = projectToPlane(center, bbox.yMin, 0, roomDims, viewpoint, imageAspect);
  const horizontalSpan = cameraRay(bbox.xMax, bbox.yMax, imageAspect).x - cameraRay(bbox.xMin, bbox.yMax, imageAspect).x;
  return {
    x: Math.max(-roomDims.width / 2, Math.min(roomDims.width / 2, near.x)),
    z: Math.max(-roomDims.length / 2, Math.min(roomDims.length / 2, near.z)),
    widthM: Math.max(0.15, Math.min(near.t * horizontalSpan, roomDims.width)),
    // Only objects lying flat on the floor can use both edges as contact points.
    lengthM: Math.max(0.15, Math.min(Math.hypot(far.x - near.x, far.z - near.z), roomDims.length)),
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
      config.viewpoint || "ENTRANCE",
      config.imageAspect
    );

    // Query intelligent Asset Matching Engine
    const matched = matchAssetForDetection({
      category: det.sceneModelType ?? det.category,
      name: det.userLabel || det.originalLabel,
      estimatedDimensions: {
        width: unproj.widthM,
        length: det.category === "rug" ? unproj.lengthM : undefined,
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
      // A rear-wall anchor has known depth. Use that same plane for the
      // lateral position of every attached object, including small side tables.
      const backRay = cameraRay((det.bbox.xMin + det.bbox.xMax) / 2, (det.bbox.yMin + det.bbox.yMax) / 2, config.imageAspect ?? 1);
      const rearDepth = (dimensions.length - 0.35) / -backRay.z;
      const useRearPlane = wall === "back" && config.viewpoint !== "OPPOSITE_CORNER";
      const spanOnRear = rearDepth * (cameraRay(det.bbox.xMax, 0.5, config.imageAspect ?? 1).x - cameraRay(det.bbox.xMin, 0.5, config.imageAspect ?? 1).x);
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
        if (kind === "curtain") {
          extent.width = Math.min(wallSpan * 0.9, Math.max(0.65, extent.width));
          extent.height = Math.min(dimensions.height - 0.08, Math.max(extent.height, heightFraction * dimensions.height * 1.65));
          y = dimensions.height - extent.height - 0.06;
        }
        // Window GLB uses its registered nominal dimensions.
        if (kind === "window") {
          const nominal = ASSET_REGISTRY[matched.assetId]?.nominalDimensions || { width: 1.2, height: 1.5, length: 0.1 };
          matched.scale = [extent.width / nominal.width, extent.height / nominal.height, extent.length / nominal.length];
        }
      } else if (kind === "wall_art") {
        extent.width = Math.max(1.2, Math.min(dimensions.width * 0.5, 1.8));
        extent.height = 0.85;
        extent.length = 0.04;
        y = 1.55; // Eye-level wall mount
      } else if (kind === "ceiling_fan") {
        extent.width = 1.25;
        extent.length = 1.25;
        extent.height = 0.45;
        y = dimensions.height - 0.28; // Ceiling mount
      } else if (kind === "air_conditioner") {
        extent.width = 0.88;
        extent.length = 0.24;
        extent.height = 0.3;
        y = dimensions.height - 0.42; // Upper wall mount
      } else if (kind === "slat_partition") {
        extent.width = Math.min((side ? dimensions.length : dimensions.width) * 0.8, Math.max(1, unproj.widthM * (side ? 2 : 1)));
        extent.length = 0.12;
        extent.height = dimensions.height;
        y = 0;
      } else if (["chair", "sofa", "stool", "desk", "bench", "coffee_table"].includes(kind)) {
        if (kind === "sofa") {
          extent.length = 0.92;
          extent.width = Math.max(1.8, Math.min(useRearPlane ? spanOnRear : unproj.widthM, dimensions.width * 0.78));
          extent.height = 0.82;
        } else if (kind === "coffee_table") {
          extent.length = 0.65;
          extent.width = Math.max(0.9, Math.min(unproj.widthM, 1.4));
          extent.height = 0.42;
        } else if (kind === "bench") {
          extent.length = 0.45;
          extent.width = Math.max(0.9, Math.min(unproj.widthM, 1.6));
          extent.height = 0.44;
        } else if (kind === "stool") {
          extent.length = 0.45;
          extent.width = 0.45;
          extent.height = 0.44;
        } else {
          extent.length = 0.65;
          extent.width = Math.max(0.7, Math.min(unproj.widthM, 1.5));
          extent.height = 0.76;
        }
      } else if (kind === "rug") {
        extent.height = 0.015;
        extent.width = Math.max(1.8, Math.min(unproj.widthM, dimensions.width * 0.75));
        extent.length = Math.max(2.0, Math.min(unproj.lengthM, dimensions.length * 0.7));
      }
      rotY = wall === "left" ? Math.PI / 2 : wall === "right" ? -Math.PI / 2 : 0;
      const limitX = Math.max(0, halfW - (side ? extent.length : extent.width) / 2 - 0.09);
      const limitZ = Math.max(0, halfL - (side ? extent.width : extent.length) / 2 - 0.09);
      const lateral = useRearPlane ? backRay.x * rearDepth : unproj.x;
      x = side ? (wall === "left" ? -limitX : limitX) : Math.max(-limitX, Math.min(limitX, lateral));
      // The bottom edge is the near edge of a floor object; its centre lies farther back.
      const depth = unproj.z - (side ? extent.width : extent.length) / 2;
      z = wall === "back" ? -limitZ : Math.max(-limitZ, Math.min(limitZ, depth));
      if (kind === "ceiling_fan") {
        const ceiling = projectToPlane((det.bbox.xMin + det.bbox.xMax) / 2, det.bbox.yMin,
          dimensions.height, dimensions, config.viewpoint || "ENTRANCE", config.imageAspect ?? 1);
        x = Math.max(-limitX, Math.min(limitX, ceiling.x));
        z = Math.max(-limitZ, Math.min(limitZ, ceiling.z));
      }
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
      surfaceColor: config.surfaceColors?.[det.id],
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
