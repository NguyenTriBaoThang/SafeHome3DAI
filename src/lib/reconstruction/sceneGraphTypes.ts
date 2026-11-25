import { z } from "zod";
import { MeasurementSourceTypeSchema as SourceTypeSchema } from "@/lib/contracts/sharedContractV1";

/**
 * Zod Schema for Semantic 3D Scene Object
 */
export const SemanticSceneObjectSchema = z.object({
  id: z.string(),
  category: z.string(),
  name: z.string(),
  assetId: z.string(),
  glbPath: z.string().optional(),
  position: z.tuple([z.number(), z.number(), z.number()]),
  rotation: z.tuple([z.number(), z.number(), z.number()]),
  scale: z.tuple([z.number(), z.number(), z.number()]).default([1, 1, 1]),
  dimensions: z.object({
    width: z.number().positive(),
    length: z.number().positive(),
    height: z.number().positive(),
  }),
  surfaceColor: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  detectionConfidence: z.number().min(0).max(1).default(0.85),
  measurementStatus: z.enum(["estimated", "calibrated", "user_verified"]).default("estimated"),
  verified: z.boolean().default(false),
  isFixed: z.boolean().default(false),
  isLoose: z.boolean().optional(),
  isWalkwayObstacle: z.boolean().optional(),
  isSlippery: z.boolean().optional(),
  riskIds: z.array(z.string()).default([]),
  sourceDetectionId: z.string().optional(),
  sourceImageId: z.string().optional(),
  provenance: z.object({
    width: SourceTypeSchema, length: SourceTypeSchema, height: SourceTypeSchema, position: SourceTypeSchema,
  }).optional(),
});

export type SemanticSceneObject = z.infer<typeof SemanticSceneObjectSchema>;

/**
 * Zod Schema for Room Envelope Dimensions
 */
export const RoomEnvelopeDimensionsSchema = z.object({
  width: z.number().min(1.5).max(20),   // X axis in meters
  length: z.number().min(1.5).max(20),  // Z axis in meters
  height: z.number().min(2.0).max(6.0), // Y axis in meters
  unit: z.literal("m").default("m"),
});

export type RoomEnvelopeDimensions = z.infer<typeof RoomEnvelopeDimensionsSchema>;

/**
 * Zod Schema for Semantic 3D Scene Graph
 */
export const SemanticSceneGraphSchema = z.object({
  sceneId: z.string(),
  roomType: z.enum(["BEDROOM", "BATHROOM", "LIVING_ROOM", "DOLLHOUSE"]),
  geometrySource: z.enum([
    "ai_vision_reconstructed",
    "survey_calibrated",
    "manual_blueprint",
    "dollhouse_reference",
  ]),
  dimensions: RoomEnvelopeDimensionsSchema,
  /** Per-axis source of the envelope size: user-entered = user_confirmed, defaults = simulated. */
  dimensionProvenance: z.object({ width: SourceTypeSchema, length: SourceTypeSchema, height: SourceTypeSchema }).optional(),
  floorProperties: z.object({
    material: z.enum(["WOOD", "CERAMIC_TILE", "NON_SLIP_VINYL"]),
    isSlipResistant: z.boolean().default(false),
    isWet: z.boolean().default(false),
  }),
  lightingLevelLux: z.number().min(10).max(1000).default(150),
  objects: z.array(SemanticSceneObjectSchema),
  metadata: z.object({
    sourceImages: z.array(z.string()),
    calibrationAnchor: z.string().optional(),
    reconstructionTimestamp: z.string(),
    version: z.string().default("2.0.0"),
    notes: z.string().optional(),
  }),
});

export type SemanticSceneGraph = z.infer<typeof SemanticSceneGraphSchema>;
