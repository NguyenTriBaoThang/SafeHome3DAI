import { beforeEach, describe, expect, it, vi } from "vitest";
import { executeCopilotTool } from "@/lib/ai/copilotToolRegistry";

const database = vi.hoisted(() => ({ survey: vi.fn(), scenarios: vi.fn() }));
vi.mock("@/lib/database/prisma", () => ({ prisma: {
  surveyRoom: { findFirst: database.survey },
  simulationScenario: { findMany: database.scenarios },
} }));

describe("Copilot tools use persisted data", () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it("reports the saved survey status and answer count", async () => {
    database.survey.mockResolvedValue({ status: "IN_PROGRESS", profile: { completenessScore: 37 }, _count: { answers: 3 } });
    const result = await executeCopilotTool("getSurveyProgress", {}, "room-bedroom-01");
    expect(database.survey).toHaveBeenCalledWith(expect.objectContaining({ where: { linked3dRoomId: "room-bedroom-01" } }));
    expect(result.data).toEqual({ completed: false, status: "IN_PROGRESS", answeredCount: 3, completenessScore: 37 });
  });

  it("does not invent completed progress when no linked survey exists", async () => {
    database.survey.mockResolvedValue(null);
    const result = await executeCopilotTool("getSurveyProgress", {});
    expect(result.success).toBe(false);
    expect(result.data).toBeUndefined();
  });

  it("returns only the saved scenarios for the requested room", async () => {
    const scenarios = [{ id: "saved-scenario", name: "Chiếu sáng mới", isBaseline: false }];
    database.scenarios.mockResolvedValue(scenarios);
    const result = await executeCopilotTool("getAvailableScenarios", { roomId: "room-bathroom-01" });
    expect(database.scenarios).toHaveBeenCalledWith(expect.objectContaining({ where: { roomId: "room-bathroom-01" } }));
    expect(result.data).toEqual(scenarios);
  });

  it("does not report an improvement without two saved assessments", async () => {
    database.scenarios.mockResolvedValue([{ id: "baseline", isBaseline: true, assessments: [{ safetyScore: 42 }] }]);
    const result = await executeCopilotTool("compareScenarioResults", {});
    expect(result.success).toBe(false);
    expect(result.data).toBeUndefined();
    expect(result.clientAction).toBeUndefined();
  });

  it("does not claim a scenario was loaded when preview is unavailable", async () => {
    const result = await executeCopilotTool("previewScenario", { scenarioId: "saved-scenario" });
    expect(result.success).toBe(false);
    expect(result.clientAction).toMatchObject({ type: "NAVIGATE", payload: { route: "/scenario-simulator" } });
  });

  it("reports a database error without inventing comparison scores", async () => {
    database.scenarios.mockRejectedValue(new Error("database unavailable"));
    const result = await executeCopilotTool("compareScenarioResults", {});
    expect(result.success).toBe(false);
    expect(result.data).toBeUndefined();
    expect(result.clientAction).toBeUndefined();
  });
});
