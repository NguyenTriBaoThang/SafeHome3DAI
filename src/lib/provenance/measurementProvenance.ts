import { z } from "zod";
import {
  MeasurementSourceType,
  MeasurementSourceTypeSchema,
  MeasurementUnit,
  MeasurementUnitSchema,
} from "@/lib/contracts/sharedContractV1";

/**
 * ==============================================================================
 * SAFEHOME 3D AI — MEASUREMENT PROVENANCE & LINEAGE ENGINE (TASK A02)
 * ==============================================================================
 * Eliminates implicit assumptions for lux, walkway width, bed height, and friction.
 * Enforces strict provenance traceability, unknown flags, and clinical distinction
 * between sitting surface height and total structural furniture height.
 * ==============================================================================
 */

// 1. Strict Measurement Provenance Schema
export const ProvenanceRecordSchema = z.object({
  value: z.union([z.number(), z.boolean(), z.string()]).nullable(),
  unit: MeasurementUnitSchema,
  sourceType: MeasurementSourceTypeSchema,
  confidence: z.number().min(0).max(1).nullable().default(null),
  uncertainty: z.number().min(0).nullable().default(null),
  method: z.string().nullable().default(null),
  updatedAt: z.string().datetime(),
  confirmedBy: z.string().nullable().default(null),
  evidenceId: z.string().nullable().default(null),
  isLegacyAssumed: z.boolean().default(false),
});

export type ProvenanceRecord<T = any> = {
  value: T | null;
  unit: MeasurementUnit;
  sourceType: MeasurementSourceType;
  confidence: number | null;
  uncertainty: number | null;
  method: string | null;
  updatedAt: string;
  confirmedBy: string | null;
  evidenceId: string | null;
  isLegacyAssumed: boolean;
};

// 2. Specialized Bed Dimensions Schema (Distinguishing 48cm sitting surface from 70cm total height)
export const BedDimensionsProvenanceSchema = z.object({
  // Mattress sitting surface height (WHO/CDC STEADI recommend 45-55cm, e.g. 48cm)
  bedSurfaceHeightCm: ProvenanceRecordSchema.refine(
    (rec) => rec.unit === "cm",
    { message: "bedSurfaceHeightCm must be measured in 'cm'" }
  ),
  // Total structural height including headboard (e.g. 70-85cm)
  totalBedHeightCm: ProvenanceRecordSchema.refine(
    (rec) => rec.unit === "cm",
    { message: "totalBedHeightCm must be measured in 'cm'" }
  ),
  lengthCm: ProvenanceRecordSchema.refine((rec) => rec.unit === "cm"),
  widthCm: ProvenanceRecordSchema.refine((rec) => rec.unit === "cm"),
});

export type BedDimensionsProvenance = z.infer<typeof BedDimensionsProvenanceSchema>;

// 3. Factory Constructors for Trusted Provenance
export function createMeasured<T>(
  value: T,
  unit: MeasurementUnit,
  method: string,
  confirmedBy?: string,
  uncertainty?: number,
  evidenceId?: string
): ProvenanceRecord<T> {
  return {
    value,
    unit,
    sourceType: "measured",
    confidence: 1.0,
    uncertainty: uncertainty ?? null,
    method,
    updatedAt: new Date().toISOString(),
    confirmedBy: confirmedBy ?? null,
    evidenceId: evidenceId ?? null,
    isLegacyAssumed: false,
  };
}

export function createUserConfirmed<T>(
  value: T,
  unit: MeasurementUnit,
  method: string = "resident_survey_interview",
  confirmedBy: string = "resident",
  evidenceId?: string
): ProvenanceRecord<T> {
  return {
    value,
    unit,
    sourceType: "user_confirmed",
    confidence: 0.9,
    uncertainty: null,
    method,
    updatedAt: new Date().toISOString(),
    confirmedBy,
    evidenceId: evidenceId ?? null,
    isLegacyAssumed: false,
  };
}

export function createVisionEstimated<T>(
  value: T,
  unit: MeasurementUnit,
  confidence: number,
  method: string = "ai_vision_bbox_depth_heuristic",
  evidenceId?: string
): ProvenanceRecord<T> {
  return {
    value,
    unit,
    sourceType: "vision_estimated",
    confidence: Math.max(0, Math.min(1, confidence)),
    uncertainty: null,
    method,
    updatedAt: new Date().toISOString(),
    confirmedBy: null,
    evidenceId: evidenceId ?? null,
    isLegacyAssumed: false,
  };
}

export function createSimulated<T>(
  value: T,
  unit: MeasurementUnit,
  scenarioId: string,
  method: string = "threejs_digital_twin_simulation"
): ProvenanceRecord<T> {
  return {
    value,
    unit,
    sourceType: "simulated",
    confidence: 1.0,
    uncertainty: null,
    method,
    updatedAt: new Date().toISOString(),
    confirmedBy: null,
    evidenceId: scenarioId,
    isLegacyAssumed: false,
  };
}

export function createUnknown<T>(
  unit: MeasurementUnit,
  missingRationale: string
): ProvenanceRecord<T> {
  return {
    value: null,
    unit,
    sourceType: "unknown",
    confidence: 0,
    uncertainty: null,
    method: missingRationale,
    updatedAt: new Date().toISOString(),
    confirmedBy: null,
    evidenceId: null,
    isLegacyAssumed: false,
  };
}

export function createLegacyAssumed<T>(
  value: T,
  unit: MeasurementUnit,
  historicalContext: string = "migrated_from_untyped_mock"
): ProvenanceRecord<T> {
  return {
    value,
    unit,
    sourceType: "simulated", // Downgraded from assumed measured
    confidence: 0.5,
    uncertainty: null,
    method: historicalContext,
    updatedAt: new Date().toISOString(),
    confirmedBy: null,
    evidenceId: null,
    isLegacyAssumed: true,
  };
}

// 4. Data Quality & Missing Inputs Aggregator
export interface DataQualitySummary {
  measuredCount: number;
  userConfirmedCount: number;
  visionEstimatedCount: number;
  simulatedCount: number;
  unknownCount: number;
  totalMeasurements: number;
  trustScore: number; // 0 to 100 based on proportion of verified (measured + user_confirmed) data
  missingCriticalInputs: string[];
}

export function computeDataQuality(
  records: Array<{ fieldName: string; record: ProvenanceRecord<any>; isCritical?: boolean }>
): DataQualitySummary {
  let measuredCount = 0;
  let userConfirmedCount = 0;
  let visionEstimatedCount = 0;
  let simulatedCount = 0;
  let unknownCount = 0;
  const missingCriticalInputs: string[] = [];

  for (const { fieldName, record, isCritical } of records) {
    switch (record.sourceType) {
      case "measured":
        measuredCount++;
        break;
      case "user_confirmed":
        userConfirmedCount++;
        break;
      case "vision_estimated":
        visionEstimatedCount++;
        break;
      case "simulated":
        simulatedCount++;
        break;
      case "unknown":
      default:
        unknownCount++;
        if (isCritical) {
          missingCriticalInputs.push(fieldName);
        }
        break;
    }
  }

  const total = records.length;
  const trustWeight =
    total > 0
      ? (measuredCount * 1.0 + userConfirmedCount * 0.85 + visionEstimatedCount * 0.4 + simulatedCount * 0.2) / total
      : 0;

  return {
    measuredCount,
    userConfirmedCount,
    visionEstimatedCount,
    simulatedCount,
    unknownCount,
    totalMeasurements: total,
    trustScore: Math.round(trustWeight * 100),
    missingCriticalInputs,
  };
}

// 5. Source Hierarchy & Rules Matrix
export const PROVENANCE_SOURCE_HIERARCHY = {
  measured: {
    level: 1,
    label: "Đo đạc vật lý thực địa",
    clinicalCredibility: "HIGH",
    allowedClaims: "Can claim actual physical condition",
  },
  user_confirmed: {
    level: 2,
    label: "Người dùng / Gia đình xác nhận",
    clinicalCredibility: "MEDIUM_HIGH",
    allowedClaims: "Can claim self-reported historical condition",
  },
  vision_estimated: {
    level: 3,
    label: "AI Vision ước lượng từ ảnh 2D",
    clinicalCredibility: "PROVISIONAL",
    allowedClaims: "Must display as provisional estimate with confidence badge",
  },
  simulated: {
    level: 4,
    label: "Mô phỏng Digital Twin 3D",
    clinicalCredibility: "HYPOTHETICAL",
    allowedClaims: "Cannot claim physical reduction of falls in real world",
  },
  unknown: {
    level: 5,
    label: "Chưa khảo sát / Chưa có số đo",
    clinicalCredibility: "NONE",
    allowedClaims: "Must flag as unassessed; cannot assume safe",
  },
} as const;

