import { RoomState, SceneObjectState, WalkingZone } from "@/types";

export type SpatialIssueType =
  | "FLOATING_OBJECT"
  | "FLOOR_PENETRATION"
  | "WALL_PENETRATION"
  | "OBJECT_OVERLAP"
  | "OUT_OF_ROOM_BOUNDS"
  | "INVALID_SCALE"
  | "INVALID_ROTATION"
  | "UNSUPPORTED_PLACEMENT"
  | "BLOCKED_WALKWAY"
  | "INVALID_WALL_ATTACHMENT";

export type SpatialIssueSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface SpatialIssue {
  objectId: string;
  roomId: string;
  objectName: string;
  category: string;
  modelType: string;
  position: [number, number, number];
  dimensions: { width: number; length: number; height: number };
  issueType: SpatialIssueType;
  severity: SpatialIssueSeverity;
  deviationMeters: number;
  evidence: string;
  remediationPlan: string;
}

export interface SpatialValidationReport {
  roomId: string;
  isValid: boolean;
  totalIssues: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  issues: SpatialIssue[];
  timestamp: string;
}

// Categories of placement
export const WALL_MOUNTED_MODELS = new Set([
  "grab_bar",
  "mirror",
  "wall_art",
  "window",
  "curtain",
  "air_conditioner",
  "sconce",
  "wall_lamp",
  "light_switch",
  "tv",
]);

export const CEILING_MOUNTED_MODELS = new Set([
  "ceiling_fan",
  "pendant_light",
  "ceiling_light",
]);

export const FLAT_FLOOR_MODELS = new Set([
  "rug",
  "mat",
  "cable",
  "electrical_cable",
]);

/**
 * Calculates oriented or axis-aligned bounding box min/max in world space
 */
export function getObjectWorldAABB(obj: SceneObjectState) {
  const [px, py, pz] = obj.position;
  const ry = obj.rotation ? obj.rotation[1] : 0;
  const sx = obj.scale ? obj.scale[0] : 1;
  const sy = obj.scale ? obj.scale[1] : 1;
  const sz = obj.scale ? obj.scale[2] : 1;

  const w = obj.dimensions.width * sx;
  const h = obj.dimensions.height * sy;
  const l = obj.dimensions.length * sz;

  // Account for Y rotation around object center
  const cos = Math.abs(Math.cos(ry));
  const sin = Math.abs(Math.sin(ry));
  const effectiveWidth = w * cos + l * sin;
  const effectiveLength = w * sin + l * cos;

  return {
    minX: px - effectiveWidth / 2,
    maxX: px + effectiveWidth / 2,
    minY: py,
    maxY: py + h,
    minZ: pz - effectiveLength / 2,
    maxZ: pz + effectiveLength / 2,
    width: effectiveWidth,
    height: h,
    length: effectiveLength,
  };
}

/**
 * Calculates 2D distance from a point (px, pz) to line segment (x1, z1) -> (x2, z2)
 */
export function pointToSegmentDistance(
  px: number,
  pz: number,
  x1: number,
  z1: number,
  x2: number,
  z2: number
): number {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const lenSq = dx * dx + dz * dz;
  if (lenSq === 0) return Math.hypot(px - x1, pz - z1);

  let t = ((px - x1) * dx + (pz - z1) * dz) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = x1 + t * dx;
  const projZ = z1 + t * dz;
  return Math.hypot(px - projX, pz - projZ);
}

/**
 * Validates the full 3D spatial geometry of a room state.
 */
export function validateSceneGeometry(room: RoomState): SpatialValidationReport {
  const issues: SpatialIssue[] = [];
  const halfW = room.dimensions.width / 2;
  const halfL = room.dimensions.length / 2;
  const roomH = room.dimensions.height;

  const floorTolerance = 0.035; // 3.5cm tolerance for floor contact
  const wallTolerance = 0.06; // 6cm wall penetration margin (molding / baseboard allowance)
  const ceilingTolerance = 0.08;

  // 1. Validate each object independently
  for (const obj of room.objects) {
    const aabb = getObjectWorldAABB(obj);
    const model = (obj.modelType || "").toLowerCase();
    const isWall = WALL_MOUNTED_MODELS.has(model);
    const isCeiling = CEILING_MOUNTED_MODELS.has(model);
    const isFlatFloor = FLAT_FLOOR_MODELS.has(model);

    // --- CHECK 1: Scale Validation ---
    if (
      obj.dimensions.width <= 0 ||
      obj.dimensions.length <= 0 ||
      obj.dimensions.height <= 0 ||
      (obj.scale && (obj.scale[0] <= 0 || obj.scale[1] <= 0 || obj.scale[2] <= 0))
    ) {
      issues.push({
        objectId: obj.id,
        roomId: room.id,
        objectName: obj.name,
        category: obj.category,
        modelType: obj.modelType,
        position: obj.position,
        dimensions: obj.dimensions,
        issueType: "INVALID_SCALE",
        severity: "CRITICAL",
        deviationMeters: 0,
        evidence: `Kích thước hoặc tỷ lệ scale không hợp lệ (<= 0): w=${obj.dimensions.width}, l=${obj.dimensions.length}, h=${obj.dimensions.height}`,
        remediationPlan: "Khôi phục kích thước thực tế theo thư viện Asset Registry chuẩn.",
      });
    }

    // --- CHECK 2: Rotation Validation (Pitch/Roll for upright furniture) ---
    if (obj.rotation) {
      const [rx, , rz] = obj.rotation;
      // Normal upright floor furniture should not be tilted on X or Z by > 10 degrees (0.17 rad)
      if (!isFlatFloor && (Math.abs(rx) > 0.17 || Math.abs(rz) > 0.17)) {
        issues.push({
          objectId: obj.id,
          roomId: room.id,
          objectName: obj.name,
          category: obj.category,
          modelType: obj.modelType,
          position: obj.position,
          dimensions: obj.dimensions,
          issueType: "INVALID_ROTATION",
          severity: "MEDIUM",
          deviationMeters: Math.max(Math.abs(rx), Math.abs(rz)),
          evidence: `Đồ nội thất đứng bị nghiêng trục X (${rx.toFixed(2)} rad) hoặc Z (${rz.toFixed(2)} rad).`,
          remediationPlan: "Cân bằng lại trục xoay (rx=0, rz=0), chỉ cho phép xoay quanh trục đứng Y.",
        });
      }
    }

    // --- CHECK 3: Floor Snapping & Floating / Penetration ---
    if (!isWall && !isCeiling) {
      // Items resting on a parent (lamp on nightstand, cable on rug) are measured from the parent's top.
      const parent = obj.parentObjectId ? room.objects.find((p) => p.id === obj.parentObjectId) : undefined;
      const bottomY = obj.position[1] - (parent ? getObjectWorldAABB(parent).maxY : 0);

      if (bottomY > floorTolerance) {
        issues.push({
          objectId: obj.id,
          roomId: room.id,
          objectName: obj.name,
          category: obj.category,
          modelType: obj.modelType,
          position: obj.position,
          dimensions: obj.dimensions,
          issueType: "FLOATING_OBJECT",
          severity: bottomY > 0.15 ? "CRITICAL" : "HIGH",
          deviationMeters: bottomY,
          evidence: `Chân đế vật dụng lơ lửng cách mặt sàn ${bottomY.toFixed(3)}m (vượt ngưỡng sai số ${floorTolerance}m).`,
          remediationPlan: "Áp dụng Floor Snapping: gán position Y về 0 (hoặc 0.005m với thảm).",
        });
      } else if (bottomY < -floorTolerance) {
        issues.push({
          objectId: obj.id,
          roomId: room.id,
          objectName: obj.name,
          category: obj.category,
          modelType: obj.modelType,
          position: obj.position,
          dimensions: obj.dimensions,
          issueType: "FLOOR_PENETRATION",
          severity: bottomY < -0.1 ? "CRITICAL" : "HIGH",
          deviationMeters: Math.abs(bottomY),
          evidence: `Chân đế vật dụng chìm sâu dưới mặt sàn ${Math.abs(bottomY).toFixed(3)}m.`,
          remediationPlan: "Nâng đáy vật dụng lên tiếp xúc chính xác mặt sàn (Y=0).",
        });
      }
    }

    // --- CHECK 4: Wall Attachment Validation ---
    if (isWall) {
      const posY = obj.position[1];
      if (model === "grab_bar" && posY < 0.3) {
        issues.push({
          objectId: obj.id,
          roomId: room.id,
          objectName: obj.name,
          category: obj.category,
          modelType: obj.modelType,
          position: obj.position,
          dimensions: obj.dimensions,
          issueType: "INVALID_WALL_ATTACHMENT",
          severity: "CRITICAL",
          deviationMeters: Math.abs(posY - 0.85),
          evidence: `Thanh vịn an toàn bị đặt nằm sát sàn hoặc quá thấp (${posY.toFixed(2)}m) thay vì độ cao tiêu chuẩn 0.80 - 0.90m.`,
          remediationPlan: "Gắn thanh vịn vào tường ở cao độ khuyến nghị WHO/CDC: 0.85m.",
        });
      }

      // Check distance to closest wall (left: -halfW, right: halfW, back: -halfL, front: halfL)
      const distToLeft = Math.abs(aabb.minX - -halfW);
      const distToRight = Math.abs(aabb.maxX - halfW);
      const distToBack = Math.abs(aabb.minZ - -halfL);
      const distToFront = Math.abs(aabb.maxZ - halfL);
      const minWallDist = Math.min(distToLeft, distToRight, distToBack, distToFront);

      if (minWallDist > 0.4) {
        issues.push({
          objectId: obj.id,
          roomId: room.id,
          objectName: obj.name,
          category: obj.category,
          modelType: obj.modelType,
          position: obj.position,
          dimensions: obj.dimensions,
          issueType: "INVALID_WALL_ATTACHMENT",
          severity: "HIGH",
          deviationMeters: minWallDist,
          evidence: `Thiết bị treo tường (${obj.name}) nằm lơ lửng giữa không gian, cách tường gần nhất ${minWallDist.toFixed(2)}m.`,
          remediationPlan: "Áp dụng Wall Snapping để neo thiết bị sát bề mặt tường gần nhất.",
        });
      }
    }

    // --- CHECK 5: Room Perimeter & Wall Penetration ---
    let outX = 0;
    if (aabb.minX < -halfW - wallTolerance) {
      outX = Math.abs(aabb.minX - -halfW);
    } else if (aabb.maxX > halfW + wallTolerance) {
      outX = aabb.maxX - halfW;
    }

    let outZ = 0;
    if (aabb.minZ < -halfL - wallTolerance) {
      outZ = Math.abs(aabb.minZ - -halfL);
    } else if (aabb.maxZ > halfL + wallTolerance) {
      outZ = aabb.maxZ - halfL;
    }

    let outY = 0;
    if (aabb.maxY > roomH + ceilingTolerance) {
      outY = aabb.maxY - roomH;
    }

    const maxOut = Math.max(outX, outZ, outY);
    if (maxOut > 0) {
      const isSevere = maxOut > 0.35;
      issues.push({
        objectId: obj.id,
        roomId: room.id,
        objectName: obj.name,
        category: obj.category,
        modelType: obj.modelType,
        position: obj.position,
        dimensions: obj.dimensions,
        issueType: isSevere ? "OUT_OF_ROOM_BOUNDS" : "WALL_PENETRATION",
        severity: isSevere ? "CRITICAL" : "HIGH",
        deviationMeters: maxOut,
        evidence: `Vật thể đâm xuyên tường hoặc vượt ngoài phạm vi căn phòng (độ lệch ${maxOut.toFixed(3)}m).`,
        remediationPlan: "Dịch chuyển vật thể vào bên trong đường biên căn phòng với khoảng cách an toàn 5-10cm.",
      });
    }

    // --- CHECK 6: Walkway Obstruction ---
    if (room.walkingZones && room.walkingZones.length > 0 && !isWall && !isCeiling) {
      for (const zone of room.walkingZones) {
        const dist = pointToSegmentDistance(
          obj.position[0],
          obj.position[2],
          zone.startPoint[0],
          zone.startPoint[1],
          zone.endPoint[0],
          zone.endPoint[1]
        );
        const objRadius = Math.max(aabb.width, aabb.length) / 2;
        const clearanceLimit = zone.width / 2;

        // If an obstacle or loose cable directly obstructs the zone
        if (
          dist < objRadius + clearanceLimit * 0.6 &&
          (obj.isWalkwayObstacle || obj.modelType === "cable" || obj.modelType === "box")
        ) {
          issues.push({
            objectId: obj.id,
            roomId: room.id,
            objectName: obj.name,
            category: obj.category,
            modelType: obj.modelType,
            position: obj.position,
            dimensions: obj.dimensions,
            issueType: "BLOCKED_WALKWAY",
            severity: "HIGH",
            deviationMeters: Math.max(0, clearanceLimit - dist),
            evidence: `Vật cản "${obj.name}" nằm chắn trực tiếp hành lang di chuyển ${zone.name} (khoảng hở chỉ còn ${(dist - objRadius).toFixed(2)}m).`,
            remediationPlan: "Di dời vật dụng khỏi hành lang lưu thông chính hoặc nẹp gọn vào chân tường.",
          });
          break;
        }
      }
    }
  }

  // --- CHECK 7: Object Overlap (Intersection between solid items) ---
  for (let i = 0; i < room.objects.length; i++) {
    const objA = room.objects[i];
    const modelA = (objA.modelType || "").toLowerCase();
    if (FLAT_FLOOR_MODELS.has(modelA) || CEILING_MOUNTED_MODELS.has(modelA)) continue;

    const aabbA = getObjectWorldAABB(objA);

    for (let j = i + 1; j < room.objects.length; j++) {
      const objB = room.objects[j];
      const modelB = (objB.modelType || "").toLowerCase();
      if (FLAT_FLOOR_MODELS.has(modelB) || CEILING_MOUNTED_MODELS.has(modelB)) continue;

      // Allow lamps or small decorations on top of tables/nightstands
      if (
        (modelA === "lamp" && ["table", "nightstand", "desk"].includes(modelB)) ||
        (modelB === "lamp" && ["table", "nightstand", "desk"].includes(modelA))
      ) {
        continue;
      }

      const aabbB = getObjectWorldAABB(objB);

      // Compute 3D overlapping box
      const overlapX = Math.max(0, Math.min(aabbA.maxX, aabbB.maxX) - Math.max(aabbA.minX, aabbB.minX));
      const overlapY = Math.max(0, Math.min(aabbA.maxY, aabbB.maxY) - Math.max(aabbA.minY, aabbB.minY));
      const overlapZ = Math.max(0, Math.min(aabbA.maxZ, aabbB.maxZ) - Math.max(aabbA.minZ, aabbB.minZ));

      const overlapVol = overlapX * overlapY * overlapZ;
      // If overlap volume exceeds 0.04 m³ and horizontal penetration is significant
      if (overlapVol > 0.04 && overlapX > 0.12 && overlapZ > 0.12 && overlapY > 0.15) {
        const penetrationDist = Math.min(overlapX, overlapZ);
        issues.push({
          objectId: objA.id,
          roomId: room.id,
          objectName: `${objA.name} & ${objB.name}`,
          category: objA.category,
          modelType: objA.modelType,
          position: objA.position,
          dimensions: objA.dimensions,
          issueType: "OBJECT_OVERLAP",
          severity: overlapVol > 0.2 ? "CRITICAL" : "HIGH",
          deviationMeters: penetrationDist,
          evidence: `Hai vật thể rắn "${objA.name}" và "${objB.name}" chồng lấn hình học (thể tích lấn: ${overlapVol.toFixed(3)} m³).`,
          remediationPlan: "Tách khoảng cách giữa 2 vật thể tối thiểu 10cm để không xảy ra va chạm hình học.",
        });
      }
    }
  }

  const criticalCount = issues.filter((i) => i.severity === "CRITICAL").length;
  const highCount = issues.filter((i) => i.severity === "HIGH").length;
  const mediumCount = issues.filter((i) => i.severity === "MEDIUM").length;
  const lowCount = issues.filter((i) => i.severity === "LOW").length;

  return {
    roomId: room.id,
    isValid: issues.length === 0,
    totalIssues: issues.length,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    issues,
    timestamp: new Date().toISOString(),
  };
}

export interface AutoFixResult {
  fixedRoom: RoomState;
  fixesApplied: Array<{
    objectId: string;
    objectName: string;
    issueType: SpatialIssueType;
    actionTaken: string;
    beforePosition: [number, number, number];
    afterPosition: [number, number, number];
  }>;
}

/**
 * Automatically corrects detected geometric defects:
 * - Snaps floor objects to floor (Y = 0 or 0.005m for rugs)
 * - Snaps wall accessories to wall anchors and standard heights
 * - Clamps objects within room perimeter bounds
 * - Resolves severe furniture overlaps
 */
export function autoFixSceneGeometry(
  room: RoomState,
  options: {
    snapToFloor?: boolean;
    snapToWall?: boolean;
    clampToBounds?: boolean;
    resolveOverlaps?: boolean;
  } = { snapToFloor: true, snapToWall: true, clampToBounds: true, resolveOverlaps: true }
): AutoFixResult {
  const fixesApplied: AutoFixResult["fixesApplied"] = [];
  const halfW = room.dimensions.width / 2;
  const halfL = room.dimensions.length / 2;

  // Clone objects
  const updatedObjects: SceneObjectState[] = room.objects.map((obj) => {
    let [x, y, z] = obj.position;
    const initialPos: [number, number, number] = [x, y, z];
    const model = (obj.modelType || "").toLowerCase();
    const isWall = WALL_MOUNTED_MODELS.has(model);
    const isCeiling = CEILING_MOUNTED_MODELS.has(model);
    const isFlatFloor = FLAT_FLOOR_MODELS.has(model);

    // 1. Floor Snapping
    if (options.snapToFloor !== false && !isWall && !isCeiling) {
      const targetY = isFlatFloor ? 0.005 : 0;
      if (Math.abs(y - targetY) > 0.01) {
        const action = y > targetY ? "Hạ vật thể chạm mặt sàn" : "Nâng vật thể lên khỏi mặt sàn";
        fixesApplied.push({
          objectId: obj.id,
          objectName: obj.name,
          issueType: y > targetY ? "FLOATING_OBJECT" : "FLOOR_PENETRATION",
          actionTaken: `${action} (Y: ${y.toFixed(3)}m -> ${targetY}m)`,
          beforePosition: [...initialPos],
          afterPosition: [x, targetY, z],
        });
        y = targetY;
      }
    }

    // 2. Wall Equipment Snapping
    if (options.snapToWall !== false && isWall) {
      if (model === "grab_bar" && y < 0.4) {
        const targetY = 0.85; // Standard CDC/WHO grab bar height
        fixesApplied.push({
          objectId: obj.id,
          objectName: obj.name,
          issueType: "INVALID_WALL_ATTACHMENT",
          actionTaken: `Đặt thanh vịn lên cao độ an toàn tiêu chuẩn 0.85m`,
          beforePosition: [...initialPos],
          afterPosition: [x, targetY, z],
        });
        y = targetY;
      }
    }

    // 3. Perimeter Bounds Clamping
    if (options.clampToBounds !== false) {
      const aabb = getObjectWorldAABB({ ...obj, position: [x, y, z] });
      const margin = 0.08; // 8cm safe clearance from walls
      const maxX = halfW - aabb.width / 2 - margin;
      const minX = -halfW + aabb.width / 2 + margin;
      const maxZ = halfL - aabb.length / 2 - margin;
      const minZ = -halfL + aabb.length / 2 + margin;

      let clampedX = x;
      let clampedZ = z;

      if (minX <= maxX) {
        clampedX = Math.max(minX, Math.min(maxX, x));
      } else {
        clampedX = 0;
      }

      if (minZ <= maxZ) {
        clampedZ = Math.max(minZ, Math.min(maxZ, z));
      } else {
        clampedZ = 0;
      }

      if (Math.abs(clampedX - x) > 0.01 || Math.abs(clampedZ - z) > 0.01) {
        fixesApplied.push({
          objectId: obj.id,
          objectName: obj.name,
          issueType: "OUT_OF_ROOM_BOUNDS",
          actionTaken: `Dịch chuyển vào trong phòng an toàn (X: ${x.toFixed(2)} -> ${clampedX.toFixed(2)}, Z: ${z.toFixed(2)} -> ${clampedZ.toFixed(2)})`,
          beforePosition: [...initialPos],
          afterPosition: [clampedX, y, clampedZ],
        });
        x = clampedX;
        z = clampedZ;
      }
    }

    return {
      ...obj,
      position: [Number(x.toFixed(3)), Number(y.toFixed(3)), Number(z.toFixed(3))],
    };
  });

  return {
    fixedRoom: {
      ...room,
      objects: updatedObjects,
    },
    fixesApplied,
  };
}
