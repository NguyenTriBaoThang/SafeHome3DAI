import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/database/prisma";
import { INITIAL_ROOMS } from "@/data/mockRooms";
import type { RoomState } from "@/types";

const size = z.number().finite().positive().max(100);
const vector = z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]);
const dimensions = z.object({ width: size, length: size, height: size });
const object = z.object({
  id: z.string().min(1), roomId: z.string(), name: z.string().min(1).max(300),
  category: z.enum(["FURNITURE", "RUG", "CABLE", "LIGHTING", "SAFETY_DEVICE", "OBSTACLE", "DECORATION", "ARCHITECTURE"]),
  modelType: z.string().min(1).max(100), position: vector, rotation: vector, scale: vector, dimensions,
  isLoose: z.boolean().optional(), isSlippery: z.boolean().optional(), isFixed: z.boolean().optional(),
  isActive: z.boolean().optional(), isWalkwayObstacle: z.boolean().optional(),
}).passthrough();
export const photoRoomSchema = z.object({
  id: z.string().min(1), name: z.string().min(2).max(300),
  roomType: z.enum(["BEDROOM", "BATHROOM", "LIVING_ROOM"]), evidenceStatus: z.literal("PHOTO_DRAFT"),
  dimensions, floorMaterial: z.enum(["WOOD", "CERAMIC_TILE", "NON_SLIP_VINYL"]),
  lightingLevel: z.number().finite().min(0).max(100000), isWet: z.boolean(), isSlipResistant: z.boolean(),
  grabBarsCount: z.number().int().min(0), walkingZones: z.array(z.object({ id: z.string(), name: z.string(),
    startPoint: z.tuple([z.number().finite(), z.number().finite()]), endPoint: z.tuple([z.number().finite(), z.number().finite()]),
    width: size, importance: z.enum(["CRITICAL", "FREQUENT", "SECONDARY"]) })).max(100),
  objects: z.array(object).max(500),
}).passthrough();
export const createSimulationSchema = z.object({
  name: z.string().trim().min(2).max(300), roomType: z.enum(["BEDROOM", "BATHROOM", "LIVING_ROOM"]),
  width: size.optional(), length: size.optional(), height: size.optional(), roomState: photoRoomSchema.optional(),
  // Blob URLs expire when the browser closes and cannot represent a saved photo.
  photoUrl: z.never().optional(),
}).strict();

export async function createSimulation(data: z.infer<typeof createSimulationSchema>) {
  const template = INITIAL_ROOMS.find(r => r.roomType === data.roomType && r.layoutType !== "DOLLHOUSE_MULTI_ZONE")!;
  const input = data.roomState || { ...structuredClone(template), dimensions: {
    width: data.width ?? template.dimensions.width, length: data.length ?? template.dimensions.length, height: data.height ?? template.dimensions.height,
  } };
  const id = randomUUID();
  const state = { ...input, id, name: data.name,
    objects: input.objects.map(o => ({ ...o, id: randomUUID(), roomId: id })) } as RoomState;
  return prisma.$transaction(async tx => {
    const project = await tx.project.create({ data: { name: "Mô phỏng 3D" } });
    const home = await tx.home.create({ data: { projectId: project.id, name: "Không gian mô phỏng" } });
    await tx.room.create({ data: { id, homeId: home.id, name: state.name, roomType: state.roomType,
      ...state.dimensions, floorMaterial: state.floorMaterial, lightingLevel: state.lightingLevel,
      isWet: state.isWet, isSlipResistant: state.isSlipResistant, grabBarsCount: state.grabBarsCount,
      sceneObjects: { create: state.objects.map(o => ({ id: o.id, name: o.name, category: o.category, modelType: o.modelType,
        positionX: o.position[0], positionY: o.position[1], positionZ: o.position[2],
        rotationX: o.rotation[0], rotationY: o.rotation[1], rotationZ: o.rotation[2],
        scaleX: o.scale[0], scaleY: o.scale[1], scaleZ: o.scale[2], ...o.dimensions,
        isLoose: o.isLoose ?? false, isSlippery: o.isSlippery ?? false, isFixed: o.isFixed ?? false,
        isWalkwayObstacle: o.isWalkwayObstacle ?? false, isActive: o.isActive ?? true })) },
      scenarios: { create: { name: "Bản dựng đã lưu", isBaseline: true, snapshots: { create: { snapshotData: JSON.stringify(state) } } } },
    } });
    return state;
  });
}

/** Restore geometry and its provenance together; never reconstruct an empty room from a card. */
export function restoreSimulation(room: any): RoomState {
  const json = room.scenarios?.[0]?.snapshots?.[0]?.snapshotData;
  if (json) {
    const state = JSON.parse(json);
    if (state.id !== room.id || !Array.isArray(state.objects)) throw new Error("Bản dựng đã lưu không hợp lệ.");
    return state;
  }
  // Older rows have no reliable measurement provenance, so keep their geometry as a draft.
  return { id: room.id, name: room.name, roomType: room.roomType, evidenceStatus: "PHOTO_DRAFT",
    dimensions: { width: room.width, length: room.length, height: room.height }, floorMaterial: room.floorMaterial,
    lightingLevel: room.lightingLevel, isWet: room.isWet, isSlipResistant: room.isSlipResistant,
    grabBarsCount: room.grabBarsCount, walkingZones: [], objects: room.sceneObjects.map((o: any) => ({
      id: o.id, roomId: room.id, name: o.name, category: o.category, modelType: o.modelType,
      position: [o.positionX, o.positionY, o.positionZ], rotation: [o.rotationX, o.rotationY, o.rotationZ], scale: [o.scaleX, o.scaleY, o.scaleZ],
      dimensions: { width: o.width, length: o.length, height: o.height }, isLoose: o.isLoose, isFixed: o.isFixed,
      isSlippery: o.isSlippery, isWalkwayObstacle: o.isWalkwayObstacle, isActive: o.isActive,
    })) };
}

export const snapshotInclude = { scenarios: { orderBy: { updatedAt: "desc" as const }, take: 1,
  include: { snapshots: { orderBy: { createdAt: "desc" as const }, take: 1 } } }, sceneObjects: true };
