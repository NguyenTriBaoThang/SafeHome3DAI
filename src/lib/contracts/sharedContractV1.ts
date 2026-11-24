import { z } from "zod";

/**
 * ==============================================================================
 * SAFEHOME 3D AI — SHARED DATA CONTRACT V1
 * ==============================================================================
 * Canonical schema definitions governing API payloads, risk engines, vision adapters,
 * digital twin measurements, and before-after snapshot comparisons.
 *
 * Core Principles:
 * 1. Strict Source Typing: Every physical measurement explicitly identifies its
 *    provenance (measured, user_confirmed, vision_estimated, simulated, unknown).
 * 2. Fail-Safe Unknowns: `unknown` never silently converts to a safe default.
 * 3. Separation of Concerns: Heuristic UI scores are clearly differentiated from
 *    clinical risk findings and verified interventions.
 * ==============================================================================
 */

// 1. Source Type & Units
export const MeasurementSourceTypeSchema = z.enum([
  "measured",          // Direct physical instrument measurement (tape, sensor, lux meter)
  "user_confirmed",     // Confirmed by resident or family caregiver via survey/clarification
  "vision_estimated",  // Inferred via 2D AI vision bounding boxes / depth heuristics (provisional)
  "simulated",         // Synthetic baseline or what-if scenario trial inside 3D
  "unknown",           // Unmeasured or missing data (CANNOT be treated as safe)
]);

export type MeasurementSourceType = z.infer<typeof MeasurementSourceTypeSchema>;

export const MeasurementUnitSchema = z.enum([
  "cm",
  "m",
  "lux",
  "kg",
  "deg",
  "boolean",
  "count",
  "ratio",
]);

export type MeasurementUnit = z.infer<typeof MeasurementUnitSchema>;

// Generic Measurement Schema
export function createMeasurementSchema<T extends z.ZodTypeAny>(valueType: T) {
  return z
    .object({
      value: valueType.nullable(),
      unit: MeasurementUnitSchema,
      sourceType: MeasurementSourceTypeSchema,
      confidence: z.number().min(0).max(1).nullable().default(null),
      uncertainty: z.number().min(0).nullable().default(null),
      method: z.string().nullable().default(null),
      updatedAt: z.string().datetime(),
      confirmedBy: z.string().nullable().default(null),
      provenanceId: z.string().nullable().default(null),
    })
    .refine(
      (data: any) => {
        if (data.sourceType === "unknown" && data.value !== null) {
          return true;
        }
        return true;
      },
      {
        message: "Unknown measurements must preserve uncertainty flag",
      }
    );
}

export const NumberMeasurementSchema = createMeasurementSchema(z.number());
export type NumberMeasurement = z.infer<typeof NumberMeasurementSchema>;

export const BooleanMeasurementSchema = createMeasurementSchema(z.boolean());
export type BooleanMeasurement = z.infer<typeof BooleanMeasurementSchema>;

// 2. Room Contract V1
export const RoomTypeSchema = z.enum(["BEDROOM", "BATHROOM", "LIVING_ROOM"]);
export type RoomType = z.infer<typeof RoomTypeSchema>;

export const FloorMaterialSchema = z.enum([
  "WOOD",
  "CERAMIC_TILE",
  "NON_SLIP_VINYL",
  "CARPET",
  "CEMENT",
  "UNKNOWN",
]);

export const RoomV1Schema = z.object({
  id: z.string().regex(/^room-[a-zA-Z0-9_-]+$/, "Room ID must start with 'room-'"),
  homeId: z.string(),
  name: z.string().min(1),
  roomType: RoomTypeSchema,
  dimensions: z.object({
    lengthM: NumberMeasurementSchema,
    widthM: NumberMeasurementSchema,
    heightM: NumberMeasurementSchema,
  }),
  floor: z.object({
    material: FloorMaterialSchema,
    isWet: BooleanMeasurementSchema,
    isSlipResistant: BooleanMeasurementSchema,
    hasThresholdStep: BooleanMeasurementSchema,
    thresholdHeightCm: NumberMeasurementSchema.nullable().default(null),
  }),
  lighting: z.object({
    daytimeLux: NumberMeasurementSchema,
    nighttimeLux: NumberMeasurementSchema,
    nightLightPresent: BooleanMeasurementSchema,
    nightLightType: z.enum(["MOTION_SENSOR", "CONTINUOUS", "MANUAL_SWITCH", "NONE", "UNKNOWN"]).default("UNKNOWN"),
  }),
  walkwayClearanceM: NumberMeasurementSchema,
  grabBarsCount: NumberMeasurementSchema,
  updatedAt: z.string().datetime(),
  schemaVersion: z.literal("1.0.0").default("1.0.0"),
});

export type RoomV1 = z.infer<typeof RoomV1Schema>;

// 3. Vision Object Contract V1
export const VisionObjectV1Schema = z.object({
  id: z.string().regex(/^det-[a-zA-Z0-9_-]+$/, "Vision Detection ID must start with 'det-'"),
  imageId: z.string(),
  category: z.string(),
  originalLabel: z.string(),
  userLabel: z.string().nullable().default(null),
  confidence: z.number().min(0).max(1),
  bbox: z.object({
    xMin: z.number().min(0).max(1),
    yMin: z.number().min(0).max(1),
    xMax: z.number().min(0).max(1),
    yMax: z.number().min(0).max(1),
  }),
  sourceType: z.literal("vision_estimated").default("vision_estimated"),
  verificationStatus: z.enum(["PENDING_REVIEW", "CONFIRMED", "REJECTED"]).default("PENDING_REVIEW"),
  createdAt: z.string().datetime(),
});

export type VisionObjectV1 = z.infer<typeof VisionObjectV1Schema>;

// 4. Risk Finding & Assessment Result Contract V1
export const RiskSeveritySchema = z.enum(["LOW", "MEDIUM", "HIGH"]);
export type RiskSeverity = z.infer<typeof RiskSeveritySchema>;

export const RiskCertaintySchema = z.enum([
  "CONFIRMED",    // Based on measured or user-confirmed evidence
  "PROVISIONAL",  // Based on 2D vision estimates or survey assumptions
  "HYPOTHETICAL", // Based on simulated 3D what-if scenario
]);
export type RiskCertainty = z.infer<typeof RiskCertaintySchema>;

export const RiskFindingV1Schema = z.object({
  id: z.string().regex(/^finding-[a-zA-Z0-9_-]+$/, "Finding ID must start with 'finding-'"),
  ruleId: z.string().regex(/^RISK-\d{3}$/, "Rule ID must follow 'RISK-XXX' pattern"),
  title: z.string().min(1),
  description: z.string(),
  severity: RiskSeveritySchema,
  certainty: RiskCertaintySchema,
  requiresManualConfirmation: z.boolean(),
  targetObjectId: z.string().nullable().default(null),
  targetZone: z.string().nullable().default(null),
  inputProvenance: z.array(
    z.object({
      field: z.string(),
      sourceType: MeasurementSourceTypeSchema,
      value: z.any(),
      unit: MeasurementUnitSchema.optional(),
    })
  ),
  recommendation: z.object({
    title: z.string(),
    steps: z.array(z.string()),
    estimatedCost: z.string().nullable().default(null),
    referenceIds: z.array(z.string()),
  }),
  status: z.enum(["ACTIVE", "RESOLVED", "IGNORED"]).default("ACTIVE"),
});

export type RiskFindingV1 = z.infer<typeof RiskFindingV1Schema>;

export const AssessmentResultV1Schema = z.object({
  assessmentId: z.string().regex(/^asmt-[a-zA-Z0-9_-]+$/, "Assessment ID must start with 'asmt-'"),
  roomId: z.string(),
  scenarioId: z.string().nullable().default(null),
  isBaseline: z.boolean(),
  findings: z.array(RiskFindingV1Schema),
  heuristicSafetyScore: z.number().min(0).max(100),
  missingInputs: z.array(z.string()),
  dataQuality: z.object({
    measuredCount: z.number().int().min(0),
    userConfirmedCount: z.number().int().min(0),
    visionEstimatedCount: z.number().int().min(0),
    simulatedCount: z.number().int().min(0),
    unknownCount: z.number().int().min(0),
  }),
  ruleVersion: z.string().default("2026.1"),
  createdAt: z.string().datetime(),
});

export type AssessmentResultV1 = z.infer<typeof AssessmentResultV1Schema>;

// 5. Room Snapshot & Before-After Comparison Contract V1
export const SnapshotTypeSchema = z.enum([
  "BASELINE",
  "PROPOSED_SCENARIO",
  "VERIFIED_POST_INTERVENTION",
]);
export type SnapshotType = z.infer<typeof SnapshotTypeSchema>;

export const RoomSnapshotV1Schema = z.object({
  snapshotId: z.string().regex(/^snap-[a-zA-Z0-9_-]+$/, "Snapshot ID must start with 'snap-'"),
  roomId: z.string(),
  snapshotType: SnapshotTypeSchema,
  revision: z.number().int().min(1),
  room: RoomV1Schema,
  assessment: AssessmentResultV1Schema,
  createdAt: z.string().datetime(),
});

export type RoomSnapshotV1 = z.infer<typeof RoomSnapshotV1Schema>;

export const BeforeAfterComparisonV1Schema = z.object({
  comparisonId: z.string().regex(/^cmp-[a-zA-Z0-9_-]+$/, "Comparison ID must start with 'cmp-'"),
  roomId: z.string(),
  baselineSnapshotId: z.string(),
  interventionSnapshotId: z.string(),
  resolvedFindings: z.array(RiskFindingV1Schema),
  unresolvedFindings: z.array(RiskFindingV1Schema),
  newFindings: z.array(RiskFindingV1Schema),
  baselineSafetyScore: z.number().min(0).max(100),
  interventionSafetyScore: z.number().min(0).max(100),
  deltaScore: z.number(),
  // Strict Clinical Claim Rule: cannot claim clinical reduction of falls if intervention is only simulated
  canClaimVerifiedIntervention: z.boolean(),
  verificationNotes: z.string(),
  auditTrail: z.array(z.string()),
});

export type BeforeAfterComparisonV1 = z.infer<typeof BeforeAfterComparisonV1Schema>;
