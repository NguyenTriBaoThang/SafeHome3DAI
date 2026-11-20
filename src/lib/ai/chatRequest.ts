import { z } from "zod";

const id = z.string().trim().min(1).max(200);
const vector = z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]);
const dimensions = z.object({
  width: z.number().positive().max(1000),
  length: z.number().positive().max(1000),
  height: z.number().positive().max(1000),
});

// Only accept fields needed by the deterministic environmental assessment.
// Scores and findings are recomputed on the server, never accepted from clients.
export const ChatRoomStateSchema = z.object({
  id,
  name: z.string().min(1).max(200),
  roomType: z.enum(["BEDROOM", "BATHROOM", "LIVING_ROOM", "DOLLHOUSE"]),
  dimensions,
  floorMaterial: z.enum(["WOOD", "CERAMIC_TILE", "NON_SLIP_VINYL"]),
  lightingLevel: z.number().finite().min(0).max(100000),
  isWet: z.boolean(),
  isSlipResistant: z.boolean(),
  grabBarsCount: z.number().int().min(0).max(1000),
  walkingZones: z.array(z.object({
    id,
    name: z.string().max(200),
    startPoint: z.tuple([z.number().finite(), z.number().finite()]),
    endPoint: z.tuple([z.number().finite(), z.number().finite()]),
    width: z.number().positive(),
    importance: z.enum(["CRITICAL", "FREQUENT", "SECONDARY"]),
  })).max(100),
  objects: z.array(z.object({
    id,
    roomId: id,
    name: z.string().min(1).max(200),
    category: z.enum(["FURNITURE", "RUG", "CABLE", "LIGHTING", "SAFETY_DEVICE", "OBSTACLE", "DECORATION", "ARCHITECTURE"]),
    modelType: z.string().min(1).max(100),
    position: vector,
    rotation: vector,
    scale: vector,
    dimensions,
    isFixed: z.boolean().optional(),
    isLoose: z.boolean().optional(),
    isSlippery: z.boolean().optional(),
    isWalkwayObstacle: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })).max(500),
});

export const ChatRequestSchema = z.object({
  message: z.string().trim().min(1, "Tin nhắn không được để trống").max(3000, "Tin nhắn quá dài"),
  conversationId: id.optional(),
  roomId: id.optional(),
  roomState: ChatRoomStateSchema.optional(),
}).refine((value) => !value.roomState || !value.roomId || value.roomState.id === value.roomId, {
  message: "Trạng thái phòng không khớp mã phòng đang chọn.",
  path: ["roomState", "id"],
});
