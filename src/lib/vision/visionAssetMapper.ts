/**
 * SafeHome3D AI - Vision to Digital Twin Asset Mapper
 * Implements Section 13: Bridges AI Vision Object Detections with high-fidelity 3D assets.
 */

import { SceneObjectState, ObjectCategory } from "@/types";
import { ASSET_REGISTRY, AssetRegistryEntry } from "@/data/assetRegistry";

export interface VisionDetectionInput {
  id: string;
  category: string;
  label: string;
  confidence: number;
  bbox: {
    xMin: number;
    yMin: number;
    xMax: number;
    yMax: number;
  };
  verified?: boolean;
}

/**
 * Maps an AI Vision category string to a curated AssetRegistryEntry
 */
export function mapVisionCategoryToAsset(
  category: string
): AssetRegistryEntry | null {
  const norm = category.toLowerCase().trim();

  if (norm.includes("bed") || norm.includes("giuong")) {
    return ASSET_REGISTRY.double_bed_photoreal;
  }
  if (norm.includes("nightstand") || norm.includes("tu_dau_giuong") || norm.includes("lamp")) {
    return ASSET_REGISTRY.bedside_table_lamp;
  }
  if (norm.includes("wardrobe") || norm.includes("closet") || norm.includes("tu_quan_ao")) {
    return ASSET_REGISTRY.walkin_closet_system;
  }
  if (norm.includes("cabinet") || norm.includes("drawer") || norm.includes("ngan_keo")) {
    return ASSET_REGISTRY.drawer_cabinet;
  }
  if (norm.includes("toilet") || norm.includes("bon_cau")) {
    return ASSET_REGISTRY.toilet_modern;
  }
  if (norm.includes("sink") || norm.includes("vanity") || norm.includes("lavabo") || norm.includes("chau_rua")) {
    return ASSET_REGISTRY.bathroom_vanity;
  }
  if (norm.includes("shower") || norm.includes("voi_sen") || norm.includes("cabin_tam")) {
    return ASSET_REGISTRY.shower_enclosure;
  }
  if (norm.includes("plant") || norm.includes("cay")) {
    return ASSET_REGISTRY.potted_plant;
  }
  if (norm.includes("grab_bar") || norm.includes("tay_vin")) {
    return ASSET_REGISTRY.safety_grab_bar;
  }
  if (norm.includes("art") || norm.includes("tranh") || norm.includes("frame")) {
    return ASSET_REGISTRY.framed_wall_art;
  }

  return null;
}

/**
 * Converts raw 2D Vision Detections into fully interactive, high-fidelity SceneObjectStates.
 */
export function convertVisionDetectionsTo3DObjects(
  roomId: string,
  detections: VisionDetectionInput[],
  roomDimensions = { width: 7.5, length: 5.2, height: 2.7 }
): SceneObjectState[] {
  const halfW = roomDimensions.width / 2;
  const halfL = roomDimensions.length / 2;

  return detections.map((det) => {
    const asset = mapVisionCategoryToAsset(det.category);

    // Map 2D bbox center [0..1] to Room 3D coordinate space [-halfW..halfW, -halfL..halfL]
    const centerXNorm = (det.bbox.xMin + det.bbox.xMax) / 2;
    const centerZNorm = (det.bbox.yMin + det.bbox.yMax) / 2;

    const posX = Number(((centerXNorm - 0.5) * roomDimensions.width * 0.85).toFixed(2));
    const posZ = Number(((centerZNorm - 0.5) * roomDimensions.length * 0.85).toFixed(2));

    const dimensions = asset
      ? { ...asset.nominalDimensions }
      : {
          width: Number(((det.bbox.xMax - det.bbox.xMin) * roomDimensions.width).toFixed(2)) || 0.6,
          length: Number(((det.bbox.yMax - det.bbox.yMin) * roomDimensions.length).toFixed(2)) || 0.6,
          height: 0.8,
        };

    const categoryMap: Record<string, ObjectCategory> = {
      bed: "FURNITURE",
      wardrobe: "FURNITURE",
      toilet: "FURNITURE",
      sink: "FURNITURE",
      shower: "FURNITURE",
      nightstand: "FURNITURE",
      rug: "RUG",
      cable: "CABLE",
      plant: "DECORATION",
      grab_bar: "SAFETY_DEVICE",
    };

    const category = categoryMap[det.category.toLowerCase()] || "FURNITURE";

    return {
      id: `vision-obj-${det.id}`,
      roomId,
      name: det.label || asset?.name || `Vật thể ${det.category}`,
      category,
      modelType: det.category.toLowerCase(),
      assetId: asset?.id,
      glbPath: asset?.glbPath,
      position: [posX, 0, posZ],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      dimensions,
      verified: det.verified ?? (det.confidence >= 0.85),
      confidence: det.confidence,
      isFixed: category === "FURNITURE" || category === "SAFETY_DEVICE",
      isWalkwayObstacle: category === "OBSTACLE" || det.confidence < 0.6,
      customProperties: {
        sourceDetectionId: det.id,
        rawCategory: det.category,
      },
    };
  });
}
