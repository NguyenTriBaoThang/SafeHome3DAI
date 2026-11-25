export type RoomType = "BEDROOM" | "BATHROOM" | "LIVING_ROOM" | "DOLLHOUSE";

export type ObjectCategory =
  | "FURNITURE"
  | "RUG"
  | "CABLE"
  | "LIGHTING"
  | "SAFETY_DEVICE"
  | "OBSTACLE"
  | "DECORATION"
  | "ARCHITECTURE";

export type HazardSeverity = "LOW" | "MEDIUM" | "HIGH";

export type HazardType =
  | "LOOSE_RUG"
  | "CABLE_CROSSING"
  | "OBSTACLE_ROUTE"
  | "POOR_LIGHTING"
  | "WET_FLOOR"
  | "MISSING_GRAB_BAR"
  | "CLUTTERED_PATH"
  | "DANGEROUS_OBJECT_PLACEMENT";

import type { MeasurementSourceType } from "@/lib/contracts/sharedContractV1";

export interface SceneObjectProvenance {
  width: MeasurementSourceType;
  length: MeasurementSourceType;
  height: MeasurementSourceType;
  /** Vị trí x,z trong phòng. */
  position: MeasurementSourceType;
  /** Chiều cao mặt nệm (cm), chỉ với giường. Tách khỏi `height` (tổng chiều cao). */
  bedSurfaceHeight?: MeasurementSourceType;
}

export interface SceneObjectState {
  id: string;
  roomId: string;
  name: string;
  category: ObjectCategory;
  modelType: string;
  position: [number, number, number]; // [x, y, z] in meters
  rotation: [number, number, number]; // [rx, ry, rz] in radians
  scale: [number, number, number];
  dimensions: {
    width: number;
    length: number;
    height: number;
  };
  assetId?: string;
  glbPath?: string;
  verified?: boolean;
  surfaceColor?: string;
  materialVariant?: string;
  confidence?: number;
  safetyRecommendation?: string;
  /** Nguồn gốc từng giá trị hình học (enum A02). Thiếu = mẫu/mặc định = "simulated". */
  provenance?: SceneObjectProvenance;
  /** Id `det-*` của gợi ý thị giác đã sinh ra vật thể này (nếu có). */
  detectionId?: string;
  /** Vật thể đỡ bên dưới (bàn/tủ đầu giường). Đáy vật thể = đỉnh vật đỡ. */
  parentObjectId?: string;
  isWalkwayObstacle?: boolean;
  isFixed?: boolean;
  isLoose?: boolean;
  isSlippery?: boolean;
  isActive?: boolean;
  customProperties?: Record<string, any>;
}

export interface RoomZoneDefinition {
  id: string;
  name: string;
  type: "bedroom" | "walk_in_closet" | "bathroom" | "walkway";
  bounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
  floorType: "wood" | "tiles";
}

export interface WalkingZone {
  id: string;
  name: string;
  startPoint: [number, number]; // [x, z]
  endPoint: [number, number];   // [x, z]
  width: number;               // clearance width in meters (e.g. 0.9m)
  importance: "CRITICAL" | "FREQUENT" | "SECONDARY";
}

export interface RoomState {
  evidenceStatus?: "PHOTO_DRAFT";
  /** Nguồn gốc kích thước phòng. Thiếu = mẫu/mặc định = "simulated". */
  dimensionProvenance?: { width: MeasurementSourceType; length: MeasurementSourceType; height: MeasurementSourceType };
  sourceImageUrls?: string[];
  id: string;
  name: string;
  roomType: RoomType;
  layoutType?: "SINGLE_ROOM" | "DOLLHOUSE_MULTI_ZONE";
  zones?: RoomZoneDefinition[];
  dimensions: {
    width: number;
    length: number;
    height: number;
  };
  floorMaterial: "WOOD" | "CERAMIC_TILE" | "NON_SLIP_VINYL";
  lightingLevel: number; // Lux (chỉ coi là đo thật khi lightingProvenance là measured/user_confirmed)
  /** Nguồn gốc giá trị độ rọi phòng (A02/B08). Tách khỏi ánh sáng render 3D mô phỏng. */
  lightingProvenance?: MeasurementSourceType;
  /** Cường độ ánh sáng render 3D mô phỏng (hệ số Three.js, không phải lux vật lý). */
  sceneLightingIntensitySimulated?: number;
  isWet: boolean;
  isSlipResistant: boolean;
  grabBarsCount: number;
  walkingZones: WalkingZone[];
  objects: SceneObjectState[];
}

export interface HazardFindingResult {
  id: string;
  hazardType: HazardType;
  title: string;
  description: string;
  severityCategory: HazardSeverity;
  detectionRuleId: string;
  evidence: {
    measuredValue?: string | number;
    threshold?: string | number;
    rationale: string;
    affectedObjectId?: string;
    affectedObjectName?: string;
    coordinates?: [number, number, number];
  };
  recommendationText: string;
  targetObjectId?: string;
  targetArea?: {
    min: [number, number, number];
    max: [number, number, number];
  };
  status: "ACTIVE" | "RESOLVED" | "NEW";
  referenceIds: string[];
}

export interface AssessmentResult {
  id: string;
  roomId: string;
  scenarioId?: string;
  timestamp: string;
  totalHazards: number;
  resolvedHazards: number;
  remainingHazards: number;
  newHazards: number;
  safetyScore: number | null; // null when the scene has not been measured/verified
  assessmentStatus?: "NEEDS_VERIFICATION";
  findings: HazardFindingResult[];
  notes?: string;
}

export interface ScenarioComparison {
  baselineScenarioId: string;
  currentScenarioId: string;
  resolved: HazardFindingResult[];
  remaining: HazardFindingResult[];
  newlyIntroduced: HazardFindingResult[];
  baselineScore: number;
  currentScore: number;
  scoreDelta: number;
}

export interface KnowledgeSourceItem {
  id: string;
  title: string;
  organization: string; // WHO, CDC, BỘ Y TẾ VIỆT NAM, etc.
  url: string;
  publicationDate: string;
  retrievedAt: string;
  sourceStatus: "VERIFIED" | "CURATED";
  passages: {
    id: string;
    section: string;
    passageText: string;
    keywords: string[];
    relatedRules: string[];
  }[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  isFallback?: boolean;
  citations?: {
    sourceId: string;
    sourceTitle: string;
    organization: string;
    section: string;
    url: string;
  }[];
  retrievedPassageIds?: string[];
}

