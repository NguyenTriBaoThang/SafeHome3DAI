import { ASSET_REGISTRY, AssetRegistryEntry } from "@/data/assetRegistry";
import { SceneObjectState } from "@/types";

export interface MatchAssetRequest {
  category: string;
  name?: string;
  estimatedDimensions?: {
    width: number;
    length: number;
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
  const normCat = (req.category || "").toLowerCase().trim();
  const normName = (req.name || "").toLowerCase().trim();

  // 1. Direct Category Mapping Candidates
  const categoryMap: Record<string, string[]> = {
    bed: ["double_bed_photoreal"],
    nightstand: ["bedside_table_lamp", "side_table"],
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
    if (req.estimatedDimensions && entry.nominalDimensions) {
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
    const scaleZ = Math.min(Math.max(est.length / nom.length, 0.7), 1.4);

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

  // 3. Fallback to calibrated procedural models (rug, cable, chair, etc.)
  const fallbackDimensions: Record<
    string,
    { width: number; length: number; height: number }
  > = {
    rug: { width: 1.2, length: 1.6, height: 0.02 },
    cable: { width: 0.12, length: 1.4, height: 0.03 },
    chair: { width: 0.55, length: 0.55, height: 0.85 },
    coffee_table: { width: 0.7, length: 0.7, height: 0.45 },
    box: { width: 0.4, length: 0.4, height: 0.3 },
    lamp: { width: 0.3, length: 0.3, height: 1.4 },
    sofa: { width: 1.8, length: 0.9, height: 0.8 },
  };

  const defaultDims = fallbackDimensions[normCat] || {
    width: 0.8,
    length: 0.8,
    height: 0.8,
  };
  const finalDims = req.estimatedDimensions || defaultDims;

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
