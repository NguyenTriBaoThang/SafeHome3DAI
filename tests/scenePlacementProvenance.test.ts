import { describe, expect, it } from "vitest";
import type { RoomState, SceneObjectState } from "@/types";
import { MOCK_BEDROOM_ROOM, MOCK_BATHROOM_ROOM } from "@/data/mockRooms";
import { normalizeRoomPlacement, checkPlacement, RUG_LIFT_M } from "@/lib/reconstruction/scenePlacement";
import { getObjectWorldAABB, validateSceneGeometry } from "@/lib/reconstruction/spatialValidationEngine";
import {
  APPROX_ROOM_LABEL, bedHeightRuleInput, describeObjectValues, detectionIdOf, getBedHeights, isApproximateRoomModel, makeObjectId, roomModelLabel,
} from "@/lib/reconstruction/sceneProvenance";
import { reconstructSceneFromDetections } from "@/lib/reconstruction/spatialReconstructor";
import { convertSceneGraphToRoomState } from "@/lib/reconstruction/sceneToRoomAdapter";
import { buildVerifiedPhotoDraft } from "@/lib/vision/photoSceneDraft";
import { runEnvironmentalAssessment } from "@/features/risk-engine/rules";
import type { VisionDetection } from "@/lib/vision/types";

const obj = (id: string, modelType: string, position: [number, number, number], d: [number, number, number], extra: Partial<SceneObjectState> = {}): SceneObjectState => ({
  id, roomId: "r", name: id, category: "FURNITURE", modelType, position, rotation: [0, 0, 0], scale: [1, 1, 1],
  dimensions: { width: d[0], length: d[1], height: d[2] }, ...extra,
});
const room = (roomType: "BEDROOM" | "BATHROOM", dims: [number, number, number], objects: SceneObjectState[]): RoomState => ({
  id: `room-${roomType.toLowerCase()}-t`, name: "t", roomType, dimensions: { width: dims[0], length: dims[1], height: dims[2] },
  floorMaterial: "WOOD", lightingLevel: 100, isWet: false, isSlipResistant: true, grabBarsCount: 0, walkingZones: [], objects,
});

// Deliberately bad input: floating, sunk, wall items on the floor, items poking through walls.
const badBedroom = room("BEDROOM", [4.5, 5, 2.8], [
  obj("obj-bed-1", "bed", [0.7, 0.3, -1.1], [1.8, 2.0, 0.7]),
  obj("obj-nightstand-1", "nightstand", [-0.6, -0.1, -1.8], [0.5, 0.5, 0.6]),
  obj("obj-lamp-1", "lamp", [-0.6, 0, -1.8], [0.25, 0.25, 0.4]),
  obj("obj-rug-1", "rug", [0.9, 0, 0.7], [1.6, 1.8, 0.015]),
  obj("obj-cable-1", "cable", [1.0, 0.4, 0.7], [0.12, 1.2, 0.03]),
  obj("obj-chair-1", "chair", [-1.0, 0.2, 0.5], [0.5, 0.5, 0.8]),
  obj("obj-wardrobe-1", "wardrobe", [-2.6, 0, 0.8], [1.6, 0.7, 2.0], { rotation: [0, Math.PI / 2, 0] }),
  obj("obj-switch-1", "light_switch", [2.0, 0, 1.0], [0.09, 0.02, 0.12]),
  obj("obj-art-1", "wall_art", [0, 0, -2.4], [1.2, 0.04, 0.85]),
]);
const badBathroom = room("BATHROOM", [2.4, 2.6, 2.6], [
  obj("obj-toilet-1", "toilet", [-0.8, 0.2, -0.9], [0.4, 0.7, 0.7]),
  obj("obj-sink-1", "sink", [-0.9, -0.05, 0.9], [0.6, 0.5, 0.85]),
  obj("obj-grab_bar-1", "grab_bar", [-1.0, 0, -0.5], [0.6, 0.05, 0.05]),
  obj("obj-mirror-1", "mirror", [0, 0, 1.4], [0.6, 0.03, 0.8]),
  obj("obj-shower-1", "shower", [0.8, 0, -0.8], [1.0, 1.0, 1.9]),
]);

describe("B07 placement: bottom on support, wall items elevated, inside room", () => {
  for (const [name, bad] of [["bedroom", badBedroom], ["bathroom", badBathroom]] as const) {
    it(`${name}: input is actually bad, output has no problems`, () => {
      expect(checkPlacement(bad).length).toBeGreaterThan(0);
      const fixed = normalizeRoomPlacement(bad);
      expect(checkPlacement(fixed)).toEqual([]);
      const { width: W, length: L, height: H } = fixed.dimensions;
      for (const o of fixed.objects) {
        const b = getObjectWorldAABB(o);
        expect(b.minX, o.id).toBeGreaterThanOrEqual(-W / 2 - 1e-6);
        expect(b.maxX, o.id).toBeLessThanOrEqual(W / 2 + 1e-6);
        expect(b.minZ, o.id).toBeGreaterThanOrEqual(-L / 2 - 1e-6);
        expect(b.maxZ, o.id).toBeLessThanOrEqual(L / 2 + 1e-6);
        expect(b.maxY, o.id).toBeLessThanOrEqual(H + 1e-6);
      }
      expect(validateSceneGeometry(fixed).issues.filter((i) => ["FLOATING_OBJECT", "FLOOR_PENETRATION", "WALL_PENETRATION", "OUT_OF_ROOM_BOUNDS", "INVALID_WALL_ATTACHMENT"].includes(i.issueType))).toEqual([]);
    });
  }

  it("bedroom: floor items at y=0, rug lifted 5 mm, lamp on nightstand top, cable on rug, wall items at wall with height > 0", () => {
    const f = normalizeRoomPlacement(badBedroom);
    const by = (id: string) => f.objects.find((o) => o.id === id)!;
    for (const id of ["obj-bed-1", "obj-nightstand-1", "obj-chair-1", "obj-wardrobe-1"]) expect(by(id).position[1]).toBe(0);
    expect(by("obj-rug-1").position[1]).toBeCloseTo(RUG_LIFT_M, 5);
    const lamp = by("obj-lamp-1");
    expect(lamp.parentObjectId).toBe("obj-nightstand-1");
    expect(lamp.position[1]).toBeCloseTo(0.6, 3);
    expect(by("obj-cable-1").parentObjectId).toBe("obj-rug-1");
    expect(by("obj-cable-1").position[1]).toBeCloseTo(RUG_LIFT_M + 0.015, 3);
    const sw = by("obj-switch-1");
    expect(sw.position[1]).toBeGreaterThan(1);
    expect(getObjectWorldAABB(sw).maxX).toBeCloseTo(f.dimensions.width / 2, 1);
    const art = by("obj-art-1");
    expect(art.position[1]).toBeGreaterThan(1);
    expect(getObjectWorldAABB(art).minZ).toBeCloseTo(-f.dimensions.length / 2, 1);
  });

  it("bathroom: toilet/sink/shower on floor, grab bar and mirror on a wall at height > 0", () => {
    const f = normalizeRoomPlacement(badBathroom);
    const by = (id: string) => f.objects.find((o) => o.id === id)!;
    for (const id of ["obj-toilet-1", "obj-sink-1", "obj-shower-1"]) expect(by(id).position[1]).toBe(0);
    const grab = by("obj-grab_bar-1");
    expect(grab.position[1]).toBeGreaterThanOrEqual(0.8);
    expect(grab.position[1]).toBeLessThanOrEqual(0.95);
    expect(getObjectWorldAABB(grab).minX).toBeCloseTo(-f.dimensions.width / 2, 1);
    expect(by("obj-mirror-1").position[1]).toBeGreaterThan(0.5);
  });

  it("a wall item bigger than the room height is kept below the ceiling", () => {
    const f = normalizeRoomPlacement(room("BEDROOM", [3, 3, 2.2], [obj("obj-art-9", "wall_art", [0, 1.55, -1.4], [1.2, 0.04, 0.85])]));
    expect(getObjectWorldAABB(f.objects[0]).maxY).toBeLessThanOrEqual(2.2);
  });

  it("mock rooms still pass the same checks after normalization", () => {
    for (const r of [MOCK_BEDROOM_ROOM, MOCK_BATHROOM_ROOM]) expect(checkPlacement(normalizeRoomPlacement(r))).toEqual([]);
  });
});

describe("B07 bed heights: surface (mattress top) is never the total height", () => {
  const bed = obj("obj-bed-48", "bed", [0, 0, 0], [1.8, 2, 0.7], {
    customProperties: { bedSurfaceHeightCm: 48 }, provenance: { width: "simulated", length: "simulated", height: "simulated", position: "simulated", bedSurfaceHeight: "user_confirmed" },
  });
  it("48 cm surface / 70 cm total stay separate, rule input = 48", () => {
    const h = getBedHeights(bed);
    expect(h.bedSurfaceHeightCm).toBe(48);
    expect(h.totalBedHeightCm).toBe(70);
    const rule = bedHeightRuleInput(bed);
    expect(rule.value).toBe(48);
    expect(rule.unit).toBe("cm");
    expect(rule.sourceType).toBe("user_confirmed");
  });
  it("inspector rows label both heights and never show 70 as the surface height", () => {
    const rows = describeObjectValues(bed);
    expect(rows.find((r) => r.key === "bedSurfaceHeight")).toMatchObject({ label: "Cao mặt nệm", value: "48 cm", source: "user_confirmed" });
    expect(rows.find((r) => r.key === "totalBedHeight")).toMatchObject({ value: "70 cm", source: "simulated" });
    expect(rows.find((r) => r.key === "height")).toBeUndefined();
  });
  it("without a surface value the template ratio is used and marked simulated, not total height", () => {
    const tmpl = obj("obj-bed-t", "bed", [0, 0, 0], [1.8, 2, 0.7]);
    const h = getBedHeights(tmpl);
    expect(h.bedSurfaceHeightCm).not.toBe(70);
    expect(h.surfaceSource).toBe("simulated");
    expect(bedHeightRuleInput(tmpl).sourceType).toBe("simulated");
  });
  it("mock bedroom bed (surface 48, total 70) carries 48/70", () => {
    const mock = MOCK_BEDROOM_ROOM.objects.find((o) => o.modelType === "bed")!;
    expect(getBedHeights(mock)).toMatchObject({ bedSurfaceHeightCm: 48, totalBedHeightCm: 70 });
  });
});

const det = (id: string, category: string, bbox: [number, number, number, number], status: VisionDetection["verificationStatus"] = "CONFIRMED"): VisionDetection => ({
  id, analysisId: "an", imageId: "img", category: category as VisionDetection["category"], originalLabel: category, confidence: 0.8,
  bbox: { xMin: bbox[0], yMin: bbox[1], xMax: bbox[2], yMax: bbox[3] }, source: "AI_VISION" as VisionDetection["source"],
  verificationStatus: status, createdAt: "", updatedAt: "",
});
const dets = [
  det("det-bed-94a1", "bed", [0.05, 0.35, 0.55, 0.8]),
  det("det-rug-88b2", "rug", [0.3, 0.7, 0.8, 0.98]),
  det("det-cable-1c3d", "cable", [0.5, 0.8, 0.6, 0.97]),
  det("det-chair-7e8f", "chair", [0.75, 0.5, 0.95, 0.9]),
  det("det-nightstand-22aa", "nightstand", [0.55, 0.45, 0.7, 0.7]),
  det("det-gone-0000", "chair", [0.1, 0.1, 0.2, 0.2], "REJECTED"),
];

describe("B06 provenance tags", () => {
  it("defaults are simulated; manual room dims are user_confirmed; bbox-derived positions are vision_estimated", () => {
    const def = reconstructSceneFromDetections(dets, { roomType: "BEDROOM" });
    expect(def.dimensionProvenance).toEqual({ width: "simulated", length: "simulated", height: "simulated" });
    const manual = reconstructSceneFromDetections(dets, { roomType: "BEDROOM", manualDimensions: { width: 3.4, length: 4.1 } });
    expect(manual.dimensionProvenance).toEqual({ width: "user_confirmed", length: "user_confirmed", height: "simulated" });
    for (const o of def.objects) expect(o.provenance?.position).toBe("vision_estimated");
    expect(def.objects.every((o) => o.provenance && ["simulated", "vision_estimated"].includes(o.provenance.width))).toBe(true);
  });
  it("any non-measured value keeps the label 'mô phỏng gần đúng'; only fully confirmed models drop it", () => {
    const draft = buildVerifiedPhotoDraft(dets, "BEDROOM", "t", undefined, { manualDimensions: { width: 3.4, length: 4.1, height: 2.6 } });
    expect(isApproximateRoomModel(draft)).toBe(true);
    expect(roomModelLabel(draft)).toBe(APPROX_ROOM_LABEL);
    expect(roomModelLabel(MOCK_BEDROOM_ROOM)).toBe(APPROX_ROOM_LABEL);
    const confirmed: RoomState = {
      ...room("BEDROOM", [3, 3, 2.6], [obj("obj-bed-c", "bed", [0, 0, 0], [1.6, 2, 0.7], { provenance: { width: "measured", length: "user_confirmed", height: "measured", position: "user_confirmed" } })]),
      dimensionProvenance: { width: "measured", length: "measured", height: "user_confirmed" },
    };
    expect(isApproximateRoomModel(confirmed)).toBe(false);
    expect(isApproximateRoomModel({ ...confirmed, dimensionProvenance: { width: "measured", length: "vision_estimated", height: "measured" } })).toBe(true);
  });
});

describe("B07 objectId linkage det -> obj -> finding", () => {
  it("builds contract ids and keeps det -> obj mapping; rejected detections never appear", () => {
    expect(makeObjectId("Rug", "det-rug-88b2")).toBe("obj-rug-rug-88b2");
    const graph = reconstructSceneFromDetections(dets, { roomType: "BEDROOM" });
    expect(graph.objects.some((o) => o.sourceDetectionId === "det-gone-0000")).toBe(false);
    for (const o of graph.objects) {
      expect(o.id).toMatch(/^obj-[a-z0-9_]+-/);
      expect(o.sourceDetectionId).toMatch(/^det-/);
      expect(o.scale).toEqual([1, 1, 1]);
    }
    const state = convertSceneGraphToRoomState(graph);
    expect(checkPlacement(state)).toEqual([]);
    for (const o of state.objects) expect(detectionIdOf(o)).toBe(dets.find((d) => o.id === makeObjectId(o.modelType, d.id))?.id);
  });
  it("a finding's targetObjectId resolves to the scene object built from that detection", () => {
    const state = convertSceneGraphToRoomState(reconstructSceneFromDetections(dets, { roomType: "BEDROOM" }));
    const findings = runEnvironmentalAssessment(state);
    const rugFinding = findings.find((f) => f.hazardType === "LOOSE_RUG");
    expect(rugFinding, "rug finding expected for a loose rug on the walkway").toBeDefined();
    const target = state.objects.find((o) => o.id === rugFinding!.targetObjectId)!;
    expect(target.id).toBe(makeObjectId("rug", "det-rug-88b2"));
    expect(detectionIdOf(target)).toBe("det-rug-88b2");
  });
});
