import { describe, it, expect } from "vitest";
import {
  validateSceneGeometry,
  autoFixSceneGeometry,
  getObjectWorldAABB,
  pointToSegmentDistance,
} from "@/lib/reconstruction/spatialValidationEngine";
import { RoomState, SceneObjectState } from "@/types";
import {
  MOCK_BEDROOM_ROOM,
  MOCK_BATHROOM_ROOM,
  MOCK_LIVINGROOM_ROOM,
  PHOTOREALISTIC_DOLLHOUSE_ROOM,
} from "@/data/mockRooms";

describe("Spatial Validation Engine — Phase 2 Geometry Audit", () => {
  it("Room A (Phòng ngủ chuẩn): Validates standard bedroom geometry without false alarms", () => {
    const report = validateSceneGeometry(MOCK_BEDROOM_ROOM);
    // Standard mock bedroom has floor objects with Y=0 and rug with Y=0.005 (well within 3.5cm tolerance)
    expect(report.criticalCount).toBe(0);
    // Should detect walking zone obstruction from the loose cable/box placed deliberately in mock room
    const blockedIssues = report.issues.filter((i) => i.issueType === "BLOCKED_WALKWAY");
    expect(blockedIssues.length).toBeGreaterThan(0);
  });

  it("Room B (Phòng ngủ có vật thể lơ lửng): Detects FLOATING_OBJECT when Y > 3.5cm tolerance and auto-fixes it", () => {
    const floatingRoom: RoomState = {
      ...MOCK_BEDROOM_ROOM,
      id: "room-floating-test",
      objects: [
        ...MOCK_BEDROOM_ROOM.objects,
        {
          id: "floating-chair",
          roomId: "room-floating-test",
          name: "Ghế đẩu lơ lửng",
          category: "FURNITURE",
          modelType: "chair",
          position: [0.5, 0.45, 0.5], // Floating 45cm above floor!
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          dimensions: { width: 0.5, length: 0.5, height: 0.8 },
        },
      ],
    };

    const report = validateSceneGeometry(floatingRoom);
    const floatingIssue = report.issues.find(
      (i) => i.objectId === "floating-chair" && i.issueType === "FLOATING_OBJECT"
    );
    expect(floatingIssue).toBeDefined();
    expect(floatingIssue?.severity).toBe("CRITICAL");
    expect(floatingIssue?.deviationMeters).toBeCloseTo(0.45);

    // Auto-fix test
    const { fixedRoom, fixesApplied } = autoFixSceneGeometry(floatingRoom);
    const fixedChair = fixedRoom.objects.find((o) => o.id === "floating-chair");
    expect(fixedChair?.position[1]).toBe(0); // Snapped to floor Y=0!

    const fixedReport = validateSceneGeometry(fixedRoom);
    const remainingFloating = fixedReport.issues.find(
      (i) => i.objectId === "floating-chair" && i.issueType === "FLOATING_OBJECT"
    );
    expect(remainingFloating).toBeUndefined();
  });

  it("Room C (Phòng có vật thể chìm dưới sàn): Detects FLOOR_PENETRATION and lifts object to floor level", () => {
    const submergedRoom: RoomState = {
      ...MOCK_BEDROOM_ROOM,
      id: "room-submerged-test",
      objects: [
        {
          id: "submerged-bed",
          roomId: "room-submerged-test",
          name: "Giường ngủ chìm",
          category: "FURNITURE",
          modelType: "bed",
          position: [0, -0.25, 0], // Sunk 25cm into the floor!
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          dimensions: { width: 1.8, length: 2.0, height: 0.8 },
        },
      ],
    };

    const report = validateSceneGeometry(submergedRoom);
    const penIssue = report.issues.find((i) => i.issueType === "FLOOR_PENETRATION");
    expect(penIssue).toBeDefined();
    expect(penIssue?.deviationMeters).toBeCloseTo(0.25);

    const { fixedRoom } = autoFixSceneGeometry(submergedRoom);
    expect(fixedRoom.objects[0].position[1]).toBe(0);
  });

  it("Room D (Phòng có vật xuyên tường hoặc ngoài biên): Detects OUT_OF_ROOM_BOUNDS and clamps inside", () => {
    const outRoom: RoomState = {
      ...MOCK_BEDROOM_ROOM,
      id: "room-out-bounds-test",
      dimensions: { width: 4.0, length: 4.0, height: 2.8 },
      objects: [
        {
          id: "out-wardrobe",
          roomId: "room-out-bounds-test",
          name: "Tủ quần áo xuyên tường ngoài",
          category: "FURNITURE",
          modelType: "wardrobe",
          position: [2.8, 0, 0], // Room width is 4.0 -> halfW=2.0. Center at 2.8 with width 0.8 extends to 3.2m!
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          dimensions: { width: 0.8, length: 1.5, height: 2.0 },
        },
      ],
    };

    const report = validateSceneGeometry(outRoom);
    const wallIssue = report.issues.find((i) => i.issueType === "OUT_OF_ROOM_BOUNDS");
    expect(wallIssue).toBeDefined();

    const { fixedRoom } = autoFixSceneGeometry(outRoom);
    const fixedObj = fixedRoom.objects[0];
    const halfW = 2.0;
    const aabb = getObjectWorldAABB(fixedObj);
    expect(aabb.maxX).toBeLessThanOrEqual(halfW + 0.01);
  });

  it("Room E (Phòng có thanh vịn đặt sai độ cao): Detects INVALID_WALL_ATTACHMENT and adjusts to 0.85m", () => {
    const badGrabBarRoom: RoomState = {
      ...MOCK_BATHROOM_ROOM,
      id: "room-bad-grabbar-test",
      objects: [
        {
          id: "bad-grab-bar",
          roomId: "room-bad-grabbar-test",
          name: "Thanh vịn đặt sát sàn",
          category: "SAFETY_DEVICE",
          modelType: "grab_bar",
          position: [-1.4, 0.05, 0], // Grab bar only 5cm off floor!
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          dimensions: { width: 0.1, length: 0.6, height: 0.1 },
        },
      ],
    };

    const report = validateSceneGeometry(badGrabBarRoom);
    const grabIssue = report.issues.find((i) => i.issueType === "INVALID_WALL_ATTACHMENT");
    expect(grabIssue).toBeDefined();

    const { fixedRoom } = autoFixSceneGeometry(badGrabBarRoom);
    const fixedGrabBar = fixedRoom.objects[0];
    expect(fixedGrabBar.position[1]).toBe(0.85); // Adjusted to standard 0.85m!
  });

  it("Room F (Phòng có 2 đồ vật rắn chồng lấn hình học): Detects OBJECT_OVERLAP", () => {
    const overlapRoom: RoomState = {
      ...MOCK_BEDROOM_ROOM,
      id: "room-overlap-test",
      objects: [
        {
          id: "bed-1",
          roomId: "room-overlap-test",
          name: "Giường ngủ",
          category: "FURNITURE",
          modelType: "bed",
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          dimensions: { width: 1.8, length: 2.0, height: 0.8 },
        },
        {
          id: "table-1",
          roomId: "room-overlap-test",
          name: "Bàn trà đè lên giường",
          category: "FURNITURE",
          modelType: "coffee_table",
          position: [0.3, 0, 0.3], // Directly overlapping bed!
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          dimensions: { width: 1.0, length: 1.0, height: 0.5 },
        },
      ],
    };

    const report = validateSceneGeometry(overlapRoom);
    const overlapIssue = report.issues.find((i) => i.issueType === "OBJECT_OVERLAP");
    expect(overlapIssue).toBeDefined();
    expect(overlapIssue?.severity).toBe("CRITICAL");
  });

  it("Room G (Phòng có kích thước hoặc tỷ lệ âm): Detects INVALID_SCALE", () => {
    const invalidScaleRoom: RoomState = {
      ...MOCK_BEDROOM_ROOM,
      id: "room-invalid-scale",
      objects: [
        {
          id: "bad-scale-obj",
          roomId: "room-invalid-scale",
          name: "Đồ vật lỗi tỷ lệ",
          category: "FURNITURE",
          modelType: "chair",
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, -1, 1], // Negative scale!
          dimensions: { width: 0.5, length: 0.5, height: -0.8 }, // Negative height!
        },
      ],
    };

    const report = validateSceneGeometry(invalidScaleRoom);
    const scaleIssue = report.issues.find((i) => i.issueType === "INVALID_SCALE");
    expect(scaleIssue).toBeDefined();
    expect(scaleIssue?.severity).toBe("CRITICAL");
  });

  it("Room H (Dollhouse Reference Scene): Validates architectural showcase room with multi-zones", () => {
    const report = validateSceneGeometry(PHOTOREALISTIC_DOLLHOUSE_ROOM);
    // Must have 0 critical geometry bugs
    expect(report.criticalCount).toBe(0);
    // Ensure all 10+ objects have valid coordinates within 7.5m x 5.2m x 2.7m room envelope
    expect(report.issues.filter((i) => i.issueType === "OUT_OF_ROOM_BOUNDS").length).toBe(0);
  });
});
