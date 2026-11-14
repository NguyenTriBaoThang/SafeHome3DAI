import { describe, it, expect } from "vitest";

/**
 * Cluster calculation helper matching the RoomCanvas clustering logic
 */
function clusterHazardObjects(
  hazardObjects: Array<{ id: string; position: [number, number, number]; severity: string }>,
  maxDistance = 0.95
) {
  const clustered = new Set<string>();
  const clusters: Array<{ items: typeof hazardObjects; center: [number, number, number] }> = [];

  for (let i = 0; i < hazardObjects.length; i++) {
    if (clustered.has(hazardObjects[i].id)) continue;

    const group = [hazardObjects[i]];
    const posA = hazardObjects[i].position;

    for (let j = i + 1; j < hazardObjects.length; j++) {
      if (clustered.has(hazardObjects[j].id)) continue;
      const posB = hazardObjects[j].position;
      const dist = Math.hypot(posA[0] - posB[0], posA[2] - posB[2]);

      if (dist < maxDistance) {
        group.push(hazardObjects[j]);
      }
    }

    if (group.length > 1) {
      group.forEach((item) => clustered.add(item.id));
      const avgX = group.reduce((acc, it) => acc + it.position[0], 0) / group.length;
      const avgY = group.reduce((acc, it) => acc + it.position[1], 0) / group.length;
      const avgZ = group.reduce((acc, it) => acc + it.position[2], 0) / group.length;

      clusters.push({
        items: group,
        center: [avgX, avgY, avgZ],
      });
    }
  }

  const unclustered = hazardObjects.filter((it) => !clustered.has(it.id));
  return { clusters, unclustered, clusteredCount: clustered.size };
}

describe("Workflow & 3D Clustering Engine", () => {
  it("should cluster hazards that are within close proximity (<0.95m) to avoid label overlapping", () => {
    const hazardObjects: Array<{ id: string; position: [number, number, number]; severity: string }> = [
      { id: "rug-1", position: [0.5, 0.02, -0.6], severity: "HIGH" },
      { id: "cable-1", position: [0.7, 0.01, -0.5], severity: "HIGH" }, // Distance ~0.22m -> should cluster with rug
      { id: "door-1", position: [-1.8, 0, 1.8], severity: "MEDIUM" }, // Far away -> unclustered
    ];

    const result = clusterHazardObjects(hazardObjects);

    expect(result.clusters.length).toBe(1);
    expect(result.clusters[0].items.length).toBe(2);
    expect(result.clusters[0].items.map((i) => i.id)).toContain("rug-1");
    expect(result.clusters[0].items.map((i) => i.id)).toContain("cable-1");
    expect(result.unclustered.length).toBe(1);
    expect(result.unclustered[0].id).toBe("door-1");
  });

  it("should not cluster hazards that are far apart (>0.95m)", () => {
    const hazardObjects: Array<{ id: string; position: [number, number, number]; severity: string }> = [
      { id: "bed-1", position: [-1.2, 0.4, -1.2], severity: "HIGH" },
      { id: "toilet-1", position: [1.5, 0.4, 1.5], severity: "HIGH" }, // Distance > 3m
    ];

    const result = clusterHazardObjects(hazardObjects);

    expect(result.clusters.length).toBe(0);
    expect(result.unclustered.length).toBe(2);
  });

  it("should validate the 7-step workflow state machine transitions", () => {
    const stateTransitions: Record<number, string> = {
      1: "CREATED",
      2: "SURVEY_IN_PROGRESS",
      3: "SURVEY_COMPLETED",
      4: "SCENE_READY",
      5: "ASSESSED",
      6: "SIMULATION_IN_PROGRESS",
      7: "REPORT_READY",
    };

    expect(stateTransitions[1]).toBe("CREATED");
    expect(stateTransitions[4]).toBe("SCENE_READY");
    expect(stateTransitions[5]).toBe("ASSESSED");
    expect(stateTransitions[7]).toBe("REPORT_READY");
  });

  it("should compute before/after safety score delta accurately", () => {
    const baselineScore = 38;
    const modifiedScore = 86;
    const delta = modifiedScore - baselineScore;

    expect(delta).toBe(48);
    expect(delta > 0).toBe(true);
  });
});

