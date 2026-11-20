import { RoomState } from "@/types";
import { getObjectWorldAABB, FLAT_FLOOR_MODELS, WALL_MOUNTED_MODELS, CEILING_MOUNTED_MODELS } from "@/lib/reconstruction/spatialValidationEngine";

export function canWalkTo(room: RoomState, x: number, z: number, radius = 0.16) {
  if (Math.abs(x) > room.dimensions.width / 2 - radius || Math.abs(z) > room.dimensions.length / 2 - radius) return false;
  if (room.layoutType === "DOLLHOUSE_MULTI_ZONE") {
    const walls = [
      [-0.68, -0.52, -2.8, -0.4], [-0.68, -0.52, 0.6, 2.4],
      [1.22, 1.38, -2.8, 0.4], [1.22, 1.38, 1.3, 2.4],
      [-0.6, 0.9, 0.53, 0.67],
    ];
    if (walls.some(([minX, maxX, minZ, maxZ]) => x + radius > minX && x - radius < maxX && z + radius > minZ && z - radius < maxZ)) return false;
  }
  return !room.objects.some((object) => {
    if (FLAT_FLOOR_MODELS.has(object.modelType) || WALL_MOUNTED_MODELS.has(object.modelType) || CEILING_MOUNTED_MODELS.has(object.modelType)) return false;
    const box = getObjectWorldAABB(object);
    return box.maxY > 0.25 && box.minY < 1.8 && x + radius > box.minX && x - radius < box.maxX && z + radius > box.minZ && z - radius < box.maxZ;
  });
}

export function walkStart(room: RoomState): [number, number, number] {
  for (const path of room.walkingZones) {
    for (const [x, z] of [path.startPoint, path.endPoint]) if (canWalkTo(room, x, z)) return [x, 1.55, z];
  }
  for (let z = room.dimensions.length / 2 - 0.3; z > -room.dimensions.length / 2; z -= 0.3) {
    for (let x = -room.dimensions.width / 2 + 0.3; x < room.dimensions.width / 2; x += 0.3) if (canWalkTo(room, x, z)) return [x, 1.55, z];
  }
  return [0, 1.55, 0];
}
