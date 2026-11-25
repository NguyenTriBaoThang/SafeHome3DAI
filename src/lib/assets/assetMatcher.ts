import { ASSET_REGISTRY, AssetRegistryEntry } from "@/data/assetRegistry";
import { SceneObjectState } from "@/types";

export interface MatchAssetRequest {
  category: string;
  name?: string;
  estimatedDimensions?: {
    width: number;
    length?: number;
    height: number;
  };
  colorHex?: string;
}

export interface MatchedAssetResult {
  assetId: string;
  glbPath?: string;
  modelType: string;
  dimensions: {
    width: number;
    length: number;
    height: number;
  };
  scale: [number, number, number];
  materialVariant?: string;
  isProceduralFallback: boolean;
  matchScore: number;
  description: string;
}

/**
 * Intelligent Asset Matching Engine
 * Matches AI Vision detected entities to the most appropriate realistic 3D model
 * from ASSET_REGISTRY or provides an ergonomically calibrated procedural fallback.
 */
export function matchAssetForDetection(
  req: MatchAssetRequest
): MatchedAssetResult {
  let normCat = (req.category || "").toLowerCase().trim();
  const normName = (req.name || "").toLowerCase().trim();

  // Smart taxonomy normalization
  if (normCat === "side_table" || normName.includes("tủ tab") || normName.includes("bàn góc sofa")) {
    normCat = "side_table";
  } else if (normName.includes("đôn") || normName.includes("bench") || normCat === "bench") {
    normCat = "bench";
  } else if (
    (normName.includes("bàn trà") && !normName.includes("bàn / bàn trà")) ||
    normName.includes("coffee") ||
    normCat === "coffee_table"
  ) {
    normCat = "coffee_table";
  } else if (normName.includes("sofa") || normCat === "sofa") {
    normCat = "sofa";
  } else if (normName.includes("kệ tv") || normName.includes("media") || normCat === "media_console") {
    normCat = "media_console";
  } else if (normName.includes("tranh") || normName.includes("painting") || normCat === "wall_art") {
    normCat = "wall_art";
  } else if (normName.includes("quạt trần") || normName.includes("ceiling fan") || normCat === "ceiling_fan") {
    normCat = "ceiling_fan";
  } else if (normName.includes("điều hòa") || normName.includes("máy lạnh") || normName.includes("air conditioner") || normCat === "air_conditioner") {
    normCat = "air_conditioner";
  } else if (normName.includes("lam gỗ") || normName.includes("nan gỗ") || normName.includes("vách ngăn") || normName.includes("partition") || normCat === "slat_partition") {
    normCat = "slat_partition";
  } else if (normName.includes("rèm") || normName.includes("curtain") || normCat === "curtain") {
    normCat = "curtain";
  } else if (
    normCat === "cabinet" &&
    req.estimatedDimensions &&
    req.estimatedDimensions.height <= 0.78 &&
    req.estimatedDimensions.width >= 0.95 &&
    (!normName.includes("tủ quần áo") || normName.includes("tủ quần áo / tủ đồ"))
  ) {
    // Wide, low sideboard / console along a wall reads as a media console rather than a tall chest.
    normCat = "media_console";
  } else if (
    normCat === "table" &&
    (normName.includes("trang điểm") ||
      normName.includes("làm việc") ||
      normName.includes("vanity") ||
      normName.includes("desk") ||
      (req.estimatedDimensions && req.estimatedDimensions.width >= 0.72))
  ) {
    normCat = "desk";
  } else if (
    normCat === "chair" &&
    (normName.includes("đẩu") ||
      normName.includes("stool") ||
      (req.estimatedDimensions &&
        req.estimatedDimensions.height <= 0.6 &&
        req.estimatedDimensions.width <= 0.7))
  ) {
    normCat = "stool";
  } else if (normCat === "electrical_cable") {
    normCat = "cable";
  }

  // 1. Direct Category Mapping Candidates
  const categoryMap: Record<string, string[]> = {
    bed: ["double_bed_photoreal"],
    nightstand: ["bedside_table_lamp", "side_table"],
    side_table: ["side_table"],
    "side table": ["side_table", "bedside_table_lamp"],
    table: ["side_table", "bedside_table_lamp"],
    wardrobe: ["walkin_closet_system", "drawer_cabinet"],
    closet: ["walkin_closet_system", "drawer_cabinet"],
    cabinet: ["drawer_cabinet", "walkin_closet_system"],
    toilet: ["toilet_modern"],
    sink: ["bathroom_vanity"],
    vanity: ["bathroom_vanity"],
    shower: ["shower_enclosure"],
    grab_bar: ["safety_grab_bar"],
    "grab bar": ["safety_grab_bar"],
    plant: ["potted_plant"],
    "potted plant": ["potted_plant"],
    painting: ["framed_wall_art"],
    art: ["framed_wall_art"],
    window: ["modern_window"],
  };

  const candidateIds = categoryMap[normCat] || [];
  // Prefer procedural chest/wardrobe sizing for compact cabinets unless tall enough for a full wardrobe.
  if (normCat === "cabinet" && (!req.estimatedDimensions || req.estimatedDimensions.height <= 1.25)) {
    candidateIds.length = 0;
  }

  let bestEntry: AssetRegistryEntry | null = null;
  let bestScore = 0;

  for (const id of candidateIds) {
    const entry = ASSET_REGISTRY[id];
    if (!entry) continue;

    let score = 0.8; // base match

    // Name similarity bonus
    if (normName && entry.name.toLowerCase().includes(normName)) {
      score += 0.15;
    }

    // Aspect ratio similarity bonus
    if (req.estimatedDimensions?.length && entry.nominalDimensions) {
      const reqRatio =
        req.estimatedDimensions.width /
        Math.max(req.estimatedDimensions.length, 0.1);
      const entryRatio =
        entry.nominalDimensions.width /
        Math.max(entry.nominalDimensions.length, 0.1);
      const ratioDiff = Math.abs(reqRatio - entryRatio);
      if (ratioDiff < 0.3) {
        score += 0.05;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestEntry = entry;
    }
  }

  // 2. If matched to a high-quality GLB in registry
  if (bestEntry) {
    const nom = bestEntry.nominalDimensions;
    const est = req.estimatedDimensions || nom;

    // Calculate clamped scale factors (avoid excessive distortion)
    const scaleX = Math.min(Math.max(est.width / nom.width, 0.7), 1.4);
    const scaleY = Math.min(Math.max(est.height / nom.height, 0.7), 1.4);
    const scaleZ = Math.min(Math.max((est.length ?? nom.length) / nom.length, 0.7), 1.4);

    return {
      assetId: bestEntry.id,
      glbPath: bestEntry.glbPath,
      modelType: normCat,
      dimensions: {
        width: Number((nom.width * scaleX).toFixed(2)),
        height: Number((nom.height * scaleY).toFixed(2)),
        length: Number((nom.length * scaleZ).toFixed(2)),
      },
      scale: [scaleX, scaleY, scaleZ],
      materialVariant: bestEntry.materialVariants[0]?.id,
      isProceduralFallback: false,
      matchScore: bestScore,
      description: bestEntry.description,
    };
  }

  // 3. Fallback to calibrated procedural models with realistic ergonomic dimensions
  const fallbackDimensions: Record<
    string,
    { width: number; length: number; height: number }
  > = {
    rug: { width: 2.2, length: 2.8, height: 0.02 },
    cable: { width: 0.12, length: 1.4, height: 0.03 },
    chair: { width: 0.52, length: 0.52, height: 0.82 },
    coffee_table: { width: 1.25, length: 0.65, height: 0.42 },
    bench: { width: 1.25, length: 0.45, height: 0.44 },
    stool: { width: 0.42, length: 0.42, height: 0.44 },
    desk: { width: 1.0, length: 0.48, height: 0.76 },
    cabinet: { width: 0.82, length: 0.46, height: 0.86 },
    light_switch: { width: 0.09, length: 0.02, height: 0.12 },
    box: { width: 0.5, length: 0.5, height: 0.45 },
    lamp:
      req.estimatedDimensions && req.estimatedDimensions.height <= 0.85
        ? { width: 0.28, length: 0.28, height: 0.44 }
        : { width: 0.35, length: 0.35, height: 1.48 },
    sofa: { width: 2.4, length: 0.92, height: 0.82 },
    media_console: { width: 1.8, length: 0.42, height: 0.48 },
    wall_art: { width: 1.5, length: 0.04, height: 0.85 },
    ceiling_fan: { width: 1.25, length: 1.25, height: 0.42 },
    air_conditioner: { width: 0.88, length: 0.24, height: 0.3 },
    slat_partition: { width: 0.12, length: 1.45, height: 2.7 },
    curtain: { width: 0.14, length: 2.2, height: 2.65 },
  };

  const defaultDims = fallbackDimensions[normCat] || {
    width: 0.75,
    length: 0.55,
    height: 0.75,
  };
  const clampDim = (val: number | undefined, fallback: number, minScale = 0.7, maxScale = 1.45) => {
    if (typeof val !== "number" || !Number.isFinite(val)) return fallback;
    return Number(Math.max(fallback * minScale, Math.min(fallback * maxScale, val)).toFixed(2));
  };
  const finalDims =
    normCat === "rug"
      ? {
          width: clampDim(req.estimatedDimensions?.width, defaultDims.width, 0.55, 1.5),
          length: clampDim(req.estimatedDimensions?.length, defaultDims.length, 0.55, 1.4),
          height: defaultDims.height,
        }
      : {
          width: clampDim(req.estimatedDimensions?.width, defaultDims.width),
          length: clampDim(req.estimatedDimensions?.length, defaultDims.length),
          height: clampDim(req.estimatedDimensions?.height, defaultDims.height),
        };

  return {
    assetId: `procedural_${normCat}`,
    glbPath: undefined,
    modelType: normCat,
    dimensions: finalDims,
    scale: [1, 1, 1],
    isProceduralFallback: true,
    matchScore: 0.6,
    description: `Mô hình dựng hình học chi tiết PBR cho ${req.name || normCat}`,
  };
}
