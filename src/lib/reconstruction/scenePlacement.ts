import type { RoomState, SceneObjectState } from "@/types";
import { CEILING_MOUNTED_MODELS, FLAT_FLOOR_MODELS, WALL_MOUNTED_MODELS, getObjectWorldAABB } from "./spatialValidationEngine";

/**
 * Placement convention (all metres, y up, origin = floor centre of the room):
 *   +x right, +z toward the entrance / camera, back wall at z = -length/2.
 *   Object pivot = bottom centre of its footprint; position[1] is the BOTTOM of the object.
 *   rotation y = 0 means the object's front faces +z. Wall items face into the room.
 * This module only snaps and clamps. It is not a physics engine.
 */

/** Bottom edge height (m) of wall fixtures when no better value is known. */
export const WALL_MOUNT_BOTTOM_M: Record<string, number> = {
  grab_bar: 0.85, light_switch: 1.15, mirror: 1.0, wall_art: 1.45, window: 0.9,
  tv: 0.9, sconce: 1.5, wall_lamp: 1.5,
};
/** Rests on the floor but is lifted slightly so it does not z-fight with it. */
export const RUG_LIFT_M = 0.005;
const WALL_GAP = 0.005;
const FLOOR_ITEM_MARGIN = 0.02;

/** Table-top items and the furniture that can carry them. */
export const SURFACE_ITEM_MODELS = new Set(["lamp", "plant", "box"]);
const SUPPORT_MODELS = new Set(["nightstand", "side_table", "table", "desk", "coffee_table", "cabinet", "media_console", "bench"]);
const wallMounted = (m: string) => WALL_MOUNTED_MODELS.has(m);
const modelOf = (o: SceneObjectState) => (o.modelType || "").toLowerCase();
const topOf = (o: SceneObjectState) => getObjectWorldAABB(o).maxY;

/** Link small table-top items to the support under their centre; cables lie on the rug they cross. */
export function assignSupportParents(objects: SceneObjectState[]): SceneObjectState[] {
  return objects.map((o) => {
    const m = modelOf(o);
    const isTableTop = SURFACE_ITEM_MODELS.has(m) && o.dimensions.height <= 0.75;
    const isCable = m === "cable" || m === "electrical_cable";
    if (!isTableTop && !isCable) return o;
    const [x, , z] = o.position;
    const candidates = objects.filter((p) => {
      if (p.id === o.id) return false;
      const pm = modelOf(p);
      if (!(isCable ? pm === "rug" : SUPPORT_MODELS.has(pm) && p.dimensions.height <= 1.1)) return false;
      const b = getObjectWorldAABB(p);
      return x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ;
    });
    if (!candidates.length) return o.parentObjectId ? { ...o, parentObjectId: undefined } : o;
    const dist = (p: SceneObjectState) => Math.hypot(p.position[0] - x, p.position[2] - z);
    const nearest = candidates.sort((a, b) => dist(a) - dist(b))[0];
    return { ...o, parentObjectId: nearest.id };
  });
}

type Wall = "left" | "right" | "back" | "front";
const WALL_YAW: Record<Wall, number> = { left: Math.PI / 2, right: -Math.PI / 2, back: 0, front: Math.PI };

function nearestWall(o: SceneObjectState, halfW: number, halfL: number): Wall {
  const b = getObjectWorldAABB(o);
  const d: Record<Wall, number> = { left: b.minX + halfW, right: halfW - b.maxX, back: b.minZ + halfL, front: halfL - b.maxZ };
  return (Object.keys(d) as Wall[]).reduce((best, w) => (Math.abs(d[w]) < Math.abs(d[best]) ? w : best), "back");
}

function placeOne(o: SceneObjectState, room: RoomState, byId: Map<string, SceneObjectState>): SceneObjectState {
  const m = modelOf(o);
  const { width: W, length: L, height: H } = room.dimensions;
  const halfW = W / 2;
  const halfL = L / 2;
  let [x, y, z] = o.position;
  let rot = o.rotation;

  if (CEILING_MOUNTED_MODELS.has(m)) {
    y = Math.max(0, H - o.dimensions.height);
  } else if (wallMounted(m)) {
    const wall = nearestWall(o, halfW, halfL);
    rot = [0, WALL_YAW[wall], 0];
    const b = getObjectWorldAABB({ ...o, rotation: rot });
    if (wall === "left") x = -halfW + b.width / 2 + WALL_GAP;
    if (wall === "right") x = halfW - b.width / 2 - WALL_GAP;
    if (wall === "back") z = -halfL + b.length / 2 + WALL_GAP;
    if (wall === "front") z = halfL - b.length / 2 - WALL_GAP;
    const wantBottom =
      m === "curtain" ? H - o.dimensions.height - 0.06
      : m === "air_conditioner" ? H - o.dimensions.height - 0.15
      : y > 0.01 ? y
      : WALL_MOUNT_BOTTOM_M[m] ?? 1.0;
    y = Math.max(0, Math.min(wantBottom, H - o.dimensions.height - 0.02));
  } else if (o.parentObjectId && byId.has(o.parentObjectId)) {
    y = topOf(byId.get(o.parentObjectId)!);
  } else {
    y = FLAT_FLOOR_MODELS.has(m) ? RUG_LIFT_M : 0;
  }

  // Keep the rotated footprint inside the room (no wall clipping).
  const b = getObjectWorldAABB({ ...o, position: [x, y, z], rotation: rot });
  const margin = wallMounted(m) ? 0 : FLOOR_ITEM_MARGIN;
  const limX = Math.max(0, halfW - b.width / 2 - margin);
  const limZ = Math.max(0, halfL - b.length / 2 - margin);
  x = Math.max(-limX, Math.min(limX, x));
  z = Math.max(-limZ, Math.min(limZ, z));
  const r = (v: number) => Number(v.toFixed(3));
  return { ...o, position: [r(x), r(y), r(z)], rotation: rot };
}

/** Snap every object to its support (floor, parent top, wall, ceiling) and keep footprints inside the room. */
export function normalizeRoomPlacement(room: RoomState): RoomState {
  const withParents = assignSupportParents(room.objects);
  const byId = new Map(withParents.map((o) => [o.id, o]));
  // Supports first so children read their final top.
  const order = [...withParents].sort((a, b) => Number(Boolean(a.parentObjectId)) - Number(Boolean(b.parentObjectId)));
  const placed = new Map<string, SceneObjectState>();
  for (const o of order) {
    const p = placeOne(o, room, byId);
    placed.set(o.id, p);
    byId.set(o.id, p);
  }
  return { ...room, objects: withParents.map((o) => placed.get(o.id)!) };
}

export interface PlacementProblem { objectId: string; problem: "support" | "wall_height" | "wall_clip" }

/** Pure check used by tests and QA: bottom on its support, wall items elevated, AABB inside the room. */
export function checkPlacement(room: RoomState, tol = 0.02): PlacementProblem[] {
  const out: PlacementProblem[] = [];
  const byId = new Map(room.objects.map((o) => [o.id, o]));
  const { width: W, length: L, height: H } = room.dimensions;
  for (const o of room.objects) {
    const m = modelOf(o);
    const b = getObjectWorldAABB(o);
    const parent = o.parentObjectId ? byId.get(o.parentObjectId) : undefined;
    if (wallMounted(m)) {
      if (b.minY <= 0.05 || b.maxY > H + tol) out.push({ objectId: o.id, problem: "wall_height" });
    } else if (CEILING_MOUNTED_MODELS.has(m)) {
      if (Math.abs(b.maxY - H) > tol) out.push({ objectId: o.id, problem: "support" });
    } else {
      const want = parent ? topOf(parent) : FLAT_FLOOR_MODELS.has(m) ? RUG_LIFT_M : 0;
      if (Math.abs(b.minY - want) > tol) out.push({ objectId: o.id, problem: "support" });
    }
    if (b.minX < -W / 2 - tol || b.maxX > W / 2 + tol || b.minZ < -L / 2 - tol || b.maxZ > L / 2 + tol)
      out.push({ objectId: o.id, problem: "wall_clip" });
  }
  return out;
}
