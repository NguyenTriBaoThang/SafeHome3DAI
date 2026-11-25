import { VisionDetection, NormalizedBoundingBox, ViewpointType } from "@/lib/vision/types";
import {
  SemanticSceneGraph,
  SemanticSceneObject,
  RoomEnvelopeDimensions,
} from "./sceneGraphTypes";
import { matchAssetForDetection } from "@/lib/assets/assetMatcher";
import type { MeasurementSourceType } from "@/lib/contracts/sharedContractV1";
import { makeObjectId } from "./sceneProvenance";

// Shapes whose size below is a catalog constant, not derived from the bbox.
const TEMPLATE_SIZED_KINDS = new Set(["light_switch", "wall_art", "ceiling_fan", "air_conditioner", "slat_partition", "stool"]);

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
  /** Per-axis override of the source of `manualDimensions` (default: given = user_confirmed, absent = simulated). */
  dimensionSources?: Partial<Record<"width" | "length" | "height", MeasurementSourceType>>;
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

  const sourceOf = (axis: "width" | "length" | "height"): MeasurementSourceType =>
    config.dimensionSources?.[axis] ?? (config.manualDimensions?.[axis] ? "user_confirmed" : "simulated");
  const dimensionProvenance = { width: sourceOf("width"), length: sourceOf("length"), height: sourceOf("height") };

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

    // Estimate real metric height from projected distance + normalized vertical span
    const heightFrac = Math.max(0.02, det.bbox.yMax - det.bbox.yMin);
    const widthFrac = Math.max(0.02, det.bbox.xMax - det.bbox.xMin);
    const focal = 0.5 / Math.tan((65 * Math.PI) / 360);
    const estDistance = Math.max(1.0, Math.hypot(unproj.x, unproj.z - (dimensions.length / 2 - 0.35)));
    const estHeightM = Math.max(
      0.22,
      Math.min(dimensions.height * 0.96, (heightFrac / focal) * estDistance * 0.9)
    );

    const rawCategory = det.sceneModelType ?? det.category;
    const rawCenterX = (det.bbox.xMin + det.bbox.xMax) / 2;
    const isLikelySideWall =
      !det.placementWall &&
      rawCategory !== "rug" &&
      rawCategory !== "cable" &&
      rawCategory !== "electrical_cable" &&
      ((det.bbox.xMin <= 0.28 && det.bbox.xMax <= 0.5) ||
        (det.bbox.xMax >= 0.72 && det.bbox.xMin >= 0.5));

    // Query intelligent Asset Matching Engine
    const matched = matchAssetForDetection({
      category: rawCategory,
      name: det.userLabel || det.originalLabel,
      estimatedDimensions: {
        width:
          isLikelySideWall && rawCategory !== "bed"
            ? Math.max(unproj.widthM, Math.min(2.2, unproj.lengthM * 0.75))
            : unproj.widthM,
        length: rawCategory === "rug" ? unproj.lengthM : undefined,
        height: rawCategory === "rug" ? 0.02 : estHeightM,
      },
    });

    const kind = matched.modelType;
    const inferPlacementWall = (): VisionDetection["placementWall"] | undefined => {
      if (det.placementWall) return det.placementWall;
      if (kind === "bed") {
        if (det.bbox.xMax >= 0.78 && det.bbox.xMin >= 0.3) return "right";
        if (det.bbox.xMin <= 0.22 && det.bbox.xMax <= 0.7) return "left";
        if (det.bbox.yMin <= 0.48) return "back";
        return undefined;
      }
      if (
        [
          "cabinet",
          "wardrobe",
          "media_console",
          "nightstand",
          "desk",
          "sofa",
          "tv",
          "mirror",
          "window",
          "curtain",
          "wall_art",
          "air_conditioner",
          "slat_partition",
          "light_switch",
        ].includes(kind)
      ) {
        if (det.bbox.xMin <= 0.28 && det.bbox.xMax <= 0.5) return "left";
        if (det.bbox.xMax >= 0.72 && det.bbox.xMin >= 0.5) return "right";
        if (det.bbox.yMin <= 0.48 && rawCenterX > 0.24 && rawCenterX < 0.76) return "back";
      }
      if (kind === "lamp" && estHeightM <= 0.75) {
        if (rawCenterX >= 0.6) return "right";
        if (rawCenterX <= 0.4) return "left";
      }
      return undefined;
    };
    const resolvedWall = inferPlacementWall();

    // Clamp coordinates strictly within room boundaries
    const margin = 0.15;
    const clampedX = Math.min(
      Math.max(unproj.x, -halfW + matched.dimensions.width / 2 + margin),
      halfW - matched.dimensions.width / 2 - margin
    );
    const clampedZ = Math.min(
      Math.max(unproj.z, -halfL + matched.dimensions.length / 2 + margin),
      halfL - matched.dimensions.length / 2 - margin
    );

    // Determine initial rotation based on room side / wall proximity
    let rotY = 0;
    if (clampedX < -halfW * 0.45 && kind !== "rug") {
      rotY = Math.PI / 2;
    } else if (clampedX > halfW * 0.45 && kind !== "rug") {
      rotY = -Math.PI / 2;
    } else if (clampedZ < -halfL * 0.6) {
      rotY = 0;
    }

    let x = clampedX;
    let z = clampedZ;
    let y = 0;
    if (resolvedWall) {
      const wall = resolvedWall;
      const side = wall === "left" || wall === "right";
      const extent = matched.dimensions;
      const widthFraction = widthFrac;
      const backRay = cameraRay(rawCenterX, (det.bbox.yMin + det.bbox.yMax) / 2, config.imageAspect ?? 1);
      const rearDepth = (dimensions.length - 0.35) / -backRay.z;
      const useRearPlane = wall === "back" && config.viewpoint !== "OPPOSITE_CORNER";
      const spanOnRear = rearDepth * (cameraRay(det.bbox.xMax, 0.5, config.imageAspect ?? 1).x - cameraRay(det.bbox.xMin, 0.5, config.imageAspect ?? 1).x);
      const heightFraction = heightFrac;
      if (["tv", "mirror", "window", "curtain", "media_console"].includes(kind)) {
        const wallSpan = side ? dimensions.length : dimensions.width;
        extent.width =
          kind === "media_console" && side
            ? Math.max(1.3, Math.min(wallSpan * 0.55, Math.max(unproj.lengthM * 0.72, widthFraction * wallSpan * 1.45)))
            : Math.max(0.2, Math.min(wallSpan * 0.94, widthFraction * wallSpan * (side ? 1.65 : 1.15)));
        extent.height = Math.max(0.15, Math.min(dimensions.height * 0.98, heightFraction * dimensions.height * 1.35));
        extent.length = kind === "media_console" ? 0.4 : kind === "curtain" ? 0.14 : 0.08;
        if (kind === "media_console") extent.height = Math.min(0.62, Math.max(0.42, extent.height));
        if (kind !== "media_console" && wall !== "free") {
          y = Math.max(0, Math.min(dimensions.height - extent.height, dimensions.height * (0.76 - det.bbox.yMax)));
        }
        if (kind === "curtain") {
          extent.width = Math.min(wallSpan * 0.9, Math.max(0.65, extent.width));
          extent.height = Math.min(dimensions.height - 0.08, Math.max(extent.height, heightFraction * dimensions.height * 1.65));
          y = dimensions.height - extent.height - 0.06;
        }
        // The renderer normalizes the GLB to `dimensions`; no extra instance scale (it would apply twice).
      } else if (kind === "light_switch") {
        extent.width = 0.09;
        extent.height = 0.12;
        extent.length = 0.02;
        y = 1.15;
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
          extent.length = 0.42;
          extent.width = 0.42;
          extent.height = 0.44;
        } else if (kind === "desk") {
          extent.length = 0.48;
          extent.width = Math.max(0.85, Math.min(side ? 1.05 : unproj.widthM * 1.4, 1.25));
          extent.height = 0.76;
        } else {
          extent.length = 0.55;
          extent.width = Math.max(0.5, Math.min(unproj.widthM, 1.2));
          extent.height = 0.8;
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
      if (kind === "lamp" && side && det.bbox.yMax < 0.72) {
        // Pull bedside lamp slightly inward onto bedside surface zone
        const inward = Math.max(0.28, extent.length);
        x = wall === "left" ? -halfW + inward : halfW - inward;
      }
      if (kind === "ceiling_fan") {
        const ceiling = projectToPlane(rawCenterX, det.bbox.yMin,
          dimensions.height, dimensions, config.viewpoint || "ENTRANCE", config.imageAspect ?? 1);
        x = Math.max(-limitX, Math.min(limitX, ceiling.x));
        z = Math.max(-limitZ, Math.min(limitZ, ceiling.z));
      }
    } else if (kind === "rug") {
      matched.dimensions.height = 0.015;
      matched.dimensions.width = Math.max(1.6, Math.min(unproj.widthM, dimensions.width * 0.72));
      matched.dimensions.length = Math.max(1.8, Math.min(unproj.lengthM, dimensions.length * 0.68));
      rotY = 0;
      x = Math.max(-halfW + matched.dimensions.width / 2 + 0.1, Math.min(halfW - matched.dimensions.width / 2 - 0.1, unproj.x));
      z = Math.max(-halfL + matched.dimensions.length / 2 + 0.1, Math.min(halfL - matched.dimensions.length / 2 - 0.1, unproj.z - matched.dimensions.length * 0.4));
    }

    const isFixed = ["bed", "wardrobe", "toilet", "sink", "shower"].includes(
      matched.modelType
    );
    const isLoose = matched.modelType === "rug";
    const isObstacle = ["chair", "box", "coffee_table", "cable"].includes(
      matched.modelType
    );

    const geomSource =
      matched.dimensionSource === "estimate" && !(resolvedWall && TEMPLATE_SIZED_KINDS.has(kind))
        ? ("vision_estimated" as const)
        : ("simulated" as const);

    objects.push({
      id: makeObjectId(matched.modelType, det.id),
      category: matched.modelType.toUpperCase(),
      name: det.userLabel || det.originalLabel || matched.description,
      assetId: matched.assetId,
      glbPath: matched.glbPath,
      position: [x, y, z],
      rotation: [0, rotY, 0],
      // `dimensions` already hold the final metre size; instance scale stays 1.
      scale: [1, 1, 1],
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
      provenance: { width: geomSource, length: geomSource, height: geomSource, position: "vision_estimated" },
    });
  }

  // Separate solid floor objects horizontally so neighboring items (e.g. dresser beside bed, stool beside vanity) don't interpenetrate.
  const solidFloor = objects.filter(
    (obj) =>
      obj.position[1] === 0 &&
      !["RUG", "CABLE", "ELECTRICAL_CABLE", "SLAT_PARTITION"].includes(obj.category)
  );
  const footSpan = (obj: SemanticSceneObject) => {
    const rotated = Math.abs(Math.sin(obj.rotation[1])) > 0.7;
    return {
      hx: (rotated ? obj.dimensions.length : obj.dimensions.width) / 2,
      hz: (rotated ? obj.dimensions.width : obj.dimensions.length) / 2,
    };
  };
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < solidFloor.length; i++) {
      for (let j = i + 1; j < solidFloor.length; j++) {
        const a = solidFloor[i];
        const b = solidFloor[j];
        const sa = footSpan(a);
        const sb = footSpan(b);
        const dx = b.position[0] - a.position[0];
        const dz = b.position[2] - a.position[2];
        const overlapX = sa.hx + sb.hx + 0.08 - Math.abs(dx);
        const overlapZ = sa.hz + sb.hz + 0.08 - Math.abs(dz);
        if (overlapX <= 0 || overlapZ <= 0) continue;

        // Keep larger anchor fixed (e.g. bed), push the smaller companion outward
        const areaA = sa.hx * sa.hz;
        const areaB = sb.hx * sb.hz;
        const mover = a.category === "BED" || areaA >= areaB ? b : a;
        const anchor = mover === b ? a : b;
        const sm = mover === b ? sb : sa;
        const gapX = mover.position[0] - anchor.position[0];
        const gapZ = mover.position[2] - anchor.position[2];

        const sameSideWall =
          Math.abs(a.position[0]) > halfW * 0.65 &&
          Math.abs(b.position[0]) > halfW * 0.65 &&
          Math.sign(a.position[0]) === Math.sign(b.position[0]);
        // Same-wall items slide along Z to remain flush with their wall; otherwise separate along minimal axis.
        const moveAlongZ = sameSideWall || overlapZ <= overlapX || mover.category === "CABINET";
        if (moveAlongZ) {
          const signZ = gapZ >= 0 ? 1 : -1;
          const saAnchor = anchor === a ? sa : sb;
          const desiredZ = mover.position[2] + signZ * overlapZ;
          const clampedZ = Math.max(-halfL + sm.hz + 0.09, Math.min(halfL - sm.hz - 0.09, desiredZ));
          const pushed = Math.abs(clampedZ - mover.position[2]);
          mover.position[2] = clampedZ;
          const rem = overlapZ - pushed;
          if (rem > 0.01 && anchor.category !== "BED") {
            anchor.position[2] = Math.max(
              -halfL + saAnchor.hz + 0.09,
              Math.min(halfL - saAnchor.hz - 0.09, anchor.position[2] - signZ * rem)
            );
          }
        } else {
          const signX = gapX !== 0 ? Math.sign(gapX) : mover.position[0] < 0 ? 1 : -1;
          mover.position[0] = Math.max(
            -halfW + sm.hx + 0.09,
            Math.min(halfW - sm.hx - 0.09, mover.position[0] + signX * overlapX)
          );
        }
      }
    }
  }

  return {
    sceneId,
    roomType: config.roomType,
    geometrySource: "ai_vision_reconstructed",
    dimensions,
    dimensionProvenance,
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
