import { describe, expect, it } from "vitest";
import { buildVerifiedPhotoDraft } from "@/lib/vision/photoSceneDraft";
import { useSimulationStore } from "@/stores/useSimulationStore";
import type { VisionDetection } from "@/lib/vision/types";
const detection = (id: string, verificationStatus: VisionDetection["verificationStatus"]) => ({ id, category: "rug", originalLabel: "rug", verificationStatus,
  bbox: { xMin: .1, yMin: .1, xMax: .9, yMax: .9 } } as VisionDetection);
describe("Photo geometry never becomes a measured environmental assessment", () => {
  it("excludes rejected and pending objects and requires human confirmation", () => {
    expect(() => buildVerifiedPhotoDraft([detection("pending", "PENDING_REVIEW")], "BEDROOM", "")).toThrow();
    const room = buildVerifiedPhotoDraft([detection("yes", "CONFIRMED"), detection("edited", "CORRECTED"), detection("no", "REJECTED")], "BATHROOM", "fixture");
    expect(room.objects).toHaveLength(2); expect(room.objects.every(o => o.isLoose === undefined)).toBe(true);
    useSimulationStore.getState().loadReconstructedRoom(room);
    expect(useSimulationStore.getState().currentAssessment?.safetyScore).toBeNull();
    useSimulationStore.getState().setFloorWetness(true);
    const assessment = useSimulationStore.getState().runSimulation();
    expect(assessment.safetyScore).toBeNull(); expect(assessment.findings).toEqual([]);
    expect(useSimulationStore.getState().comparison).toBeNull();
  });
});
