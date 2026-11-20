import { beforeEach, describe, expect, it } from "vitest";
import { MOCK_BEDROOM_ROOM } from "@/data/mockRooms";
import { PHOTOREALISTIC_DOLLHOUSE_ROOM } from "@/data/dollhouseReferenceScene";
import { cloneRoom, assessRoom, applyIntervention, compareRooms, findingPosition, serializeExperience } from "@/lib/experience/homeExperience";
import { cameraPose, storyPose } from "@/lib/experience/camera";
import { canWalkTo, walkStart } from "@/lib/experience/navigation";
import { useSimulationStore } from "@/stores/useSimulationStore";
import { convertSceneGraphToRoomState } from "@/lib/reconstruction/sceneToRoomAdapter";
import { SemanticSceneGraphSchema } from "@/lib/reconstruction/sceneGraphTypes";

describe("Cinematic home scenarios", () => {
  it("uses deterministic findings and resolves a loose-rug finding without changing the baseline", () => {
    const baseline = cloneRoom(MOCK_BEDROOM_ROOM);
    const original = JSON.stringify(baseline);
    const after = applyIntervention(baseline, "SECURE_RUG");
    const comparison = compareRooms(baseline, after);
    expect(JSON.stringify(baseline)).toBe(original);
    expect(comparison.before).toEqual(assessRoom(baseline));
    expect(comparison.after).toEqual(assessRoom(after));
    expect(comparison.delta).toBe(comparison.after.score - comparison.before.score);
    expect(comparison.resolved.some((finding) => finding.targetObjectId === baseline.objects.find((object) => object.category === "RUG")?.id)).toBe(true);
  });

  it("keeps stable object IDs when moving a detected cable and recalculates its findings", () => {
    const after = applyIntervention(MOCK_BEDROOM_ROOM, "MOVE_CABLE");
    const original = MOCK_BEDROOM_ROOM.objects.find((object) => object.category === "CABLE")!;
    const moved = after.objects.find((object) => object.id === original.id)!;
    expect(moved.position).not.toEqual(original.position);
    expect(moved.isFixed).toBe(true);
    expect(after.objects.map((object) => object.id)).toEqual(MOCK_BEDROOM_ROOM.objects.map((object) => object.id));
    expect(assessRoom(after).findings.filter((finding) => finding.targetObjectId === original.id).length)
      .toBeLessThanOrEqual(assessRoom(MOCK_BEDROOM_ROOM).findings.filter((finding) => finding.targetObjectId === original.id).length);
  });

  it("adds intervention devices idempotently and distinguishes proposed geometry", () => {
    const once = applyIntervention(MOCK_BEDROOM_ROOM, "GRAB_BAR");
    const twice = applyIntervention(once, "GRAB_BAR");
    expect(twice.objects).toHaveLength(once.objects.length);
    expect(twice.grabBarsCount).toBe(once.grabBarsCount);
    expect(once.objects.at(-1)?.verified).toBe(false);
  });

  it("anchors hotspots to the actual finding object instead of hardcoded coordinates", () => {
    const room = cloneRoom(MOCK_BEDROOM_ROOM);
    const finding = assessRoom(room).findings.find((value) => value.targetObjectId)!;
    const object = room.objects.find((value) => value.id === finding.targetObjectId)!;
    object.position = [0.55, 0.2, -0.4];
    const marker = findingPosition(finding, room);
    expect(marker[0]).toBe(object.position[0]);
    expect(marker[2]).toBe(object.position[2]);
    expect(marker[1]).toBeGreaterThan(object.position[1]);
  });

  it("round-trips scene and baseline state without losing IDs, findings or dimensions", () => {
    const room = applyIntervention(PHOTOREALISTIC_DOLLHOUSE_ROOM, "MOVE_CABLE");
    const saved = JSON.parse(serializeExperience(room, PHOTOREALISTIC_DOLLHOUSE_ROOM));
    expect(saved.version).toBe(1);
    expect(saved.room).toEqual(room);
    expect(saved.baseline).toEqual(PHOTOREALISTIC_DOLLHOUSE_ROOM);
    expect(assessRoom(saved.room)).toEqual(assessRoom(room));
  });

  it("uses equivalent comparison framing and a continuous scroll camera timeline", () => {
    const room = PHOTOREALISTIC_DOLLHOUSE_ROOM;
    expect(cameraPose(room, "COMPARE")).toEqual(cameraPose(room, "DOLLHOUSE"));
    const end = storyPose(room, 0, 1, null, 1.5);
    const start = storyPose(room, 1, 0, null, 1.5);
    end.position.forEach((value, index) => expect(value).toBeCloseTo(start.position[index], 8));
    end.target.forEach((value, index) => expect(value).toBeCloseTo(start.target[index], 8));
    expect(end.fov).toBeCloseTo(start.fov, 8);
    expect(cameraPose(room, "DOLLHOUSE", null, 0.5).position[2]).toBeGreaterThan(cameraPose(room, "DOLLHOUSE", null, 1.5).position[2]);
  });

  it("blocks walkthrough movement through furniture and exterior walls", () => {
    const room = MOCK_BEDROOM_ROOM;
    const bed = room.objects.find((object) => object.modelType === "bed")!;
    expect(canWalkTo(room, bed.position[0], bed.position[2])).toBe(false);
    expect(canWalkTo(room, 100, 100)).toBe(false);
    const position = walkStart(room);
    expect(canWalkTo(room, position[0], position[2])).toBe(true);
  });

  it("preserves AI observation provenance and dimension uncertainty through the room adapter", () => {
    const graph = SemanticSceneGraphSchema.parse({
      sceneId: "vision-room", roomType: "BEDROOM", geometrySource: "ai_vision_reconstructed",
      dimensions: { width: 4, length: 5, height: 2.8 }, floorProperties: { material: "WOOD" }, lightingLevelLux: 100,
      objects: [{ id: "detection-stable", category: "RUG", name: "Thảm", assetId: "procedural_rug", position: [0, 0, 0], rotation: [0, 0, 0],
        dimensions: { width: 1, height: 0.02, length: 1 }, sourceImageId: "photo-1", sourceDetectionId: "det-1", measurementStatus: "estimated", verified: false }],
      metadata: { sourceImages: ["photo-1"], reconstructionTimestamp: new Date().toISOString() },
    });
    const object = convertSceneGraphToRoomState(graph).objects[0];
    expect(object.id).toBe("detection-stable");
    expect(object.customProperties).toMatchObject({ sourceImageId: "photo-1", sourceDetectionId: "det-1", measurementStatus: "estimated", confirmationStatus: "NEEDS_REVIEW" });
  });
});

describe("Apply experience scenarios to the existing simulation store", () => {
  beforeEach(() => { useSimulationStore.getState().switchRoom(MOCK_BEDROOM_ROOM.id); useSimulationStore.getState().restoreBaseline(); useSimulationStore.setState({ undoStack: [], redoStack: [] }); });
  it("applies a complete snapshot, recomputes risk and supports existing undo/redo", () => {
    const baseline = cloneRoom(useSimulationStore.getState().getCurrentRoom());
    const after = applyIntervention(baseline, "SECURE_RUG");
    useSimulationStore.getState().applyRoomSnapshot(after);
    expect(useSimulationStore.getState().currentAssessment?.safetyScore).toBe(assessRoom(after).score);
    useSimulationStore.getState().undo();
    expect(useSimulationStore.getState().getCurrentRoom()).toEqual(baseline);
    useSimulationStore.getState().redo();
    expect(useSimulationStore.getState().getCurrentRoom()).toEqual(after);
  });
  it("rejects applying a snapshot to a different room", () => {
    expect(() => useSimulationStore.getState().applyRoomSnapshot(PHOTOREALISTIC_DOLLHOUSE_ROOM)).toThrow();
  });
});
