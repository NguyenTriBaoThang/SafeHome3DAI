import { describe, it, expect, beforeEach } from "vitest";
import {
  getSafeHomeSystemContext,
  formatSystemContextPrompt,
  resolveContextReference,
} from "@/lib/ai/safeHomeContextService";
import { executeCopilotTool, COPILOT_TOOLS } from "@/lib/ai/copilotToolRegistry";
import { processCopilotChat } from "@/lib/ai/geminiChatService";
import { useSimulationStore } from "@/stores/useSimulationStore";

describe("SafeHome AI Copilot 2.0 Test Suite", () => {
  beforeEach(() => {
    useSimulationStore.getState().restoreBaseline();
  });

  describe("1. SafeHomeContextService", () => {
    it("should retrieve full system context with resident profile and room inventory", () => {
      const ctx = getSafeHomeSystemContext("room-bedroom-01");

      expect(ctx).toBeDefined();
      expect(ctx.activeRoomId).toBe("room-bedroom-01");
      expect(ctx.residentProfile.name).toBe("Bác Nam");
      expect(ctx.residentProfile.age).toBe(75);
      expect(ctx.rooms.length).toBeGreaterThanOrEqual(2);

      const bedroom = ctx.rooms.find((r) => r.id === "room-bedroom-01");
      expect(bedroom).toBeDefined();
      expect(bedroom?.objects.length).toBeGreaterThan(0);
      expect(bedroom?.hazards.length).toBeGreaterThan(0);
      expect(bedroom?.safetyScore).toBeGreaterThanOrEqual(0);
      expect(bedroom?.safetyScore).toBeLessThanOrEqual(100);
    });

    it("should format rich system prompt for LLM injection", () => {
      const ctx = getSafeHomeSystemContext("room-bedroom-01");
      const prompt = formatSystemContextPrompt(ctx);

      expect(prompt).toContain("Bác Nam");
      expect(prompt).toContain("75 tuổi");
      expect(prompt).toContain("DANH MỤC ĐỒ NỘI THẤT");
      expect(prompt).toContain("CÁC MỐI NGUY TÉ NGÃ");
    });

    it("should resolve context references (pronouns, 3D intents, objects)", () => {
      const ctx = getSafeHomeSystemContext("room-bedroom-01");

      const resRug = resolveContextReference("Hãy cho tôi xem tấm thảm này trên 3D", ctx);
      expect(resRug.inferredIntent).toBe("FOCUS_3D");
      expect(resRug.resolvedTargetId).toBe("obj-rug-01");

      const resCable = resolveContextReference("Tại sao dây điện lại nguy hiểm?", ctx);
      expect(resCable.inferredIntent).toBe("EXPLAIN_WHY");
      expect(resCable.resolvedTargetId).toBe("obj-cable-01");

      const resBathroom = resolveContextReference("Chuyển sang nhà vệ sinh xem thế nào", ctx);
      expect(resBathroom.resolvedRoomId).toContain("bath");
    });
  });

  describe("2. Copilot Tool Registry", () => {
    it("should declare 15 typed tools", () => {
      expect(COPILOT_TOOLS.length).toBe(15);
      const toolNames = COPILOT_TOOLS.map((t) => t.name);
      expect(toolNames).toContain("getCurrentRoom");
      expect(toolNames).toContain("getRoomObjects");
      expect(toolNames).toContain("focus3DObject");
      expect(toolNames).toContain("focus3DRoom");
      expect(toolNames).toContain("set3DCameraMode");
      expect(toolNames).toContain("compareScenarioResults");
    });

    it("should execute getCurrentRoom tool", async () => {
      const res = await executeCopilotTool("getCurrentRoom", {}, "room-bedroom-01");
      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
      expect(res.data.id).toBe("room-bedroom-01");
      expect(res.data.safetyScore).toBeDefined();
    });

    it("should execute focus3DObject tool and return clientAction", async () => {
      const res = await executeCopilotTool("focus3DObject", { objectId: "obj-rug-01" }, "room-bedroom-01");
      expect(res.success).toBe(true);
      expect(res.clientAction).toBeDefined();
      expect(res.clientAction?.type).toBe("FOCUS_3D_OBJECT");
      expect(res.clientAction?.payload.objectId).toBe("obj-rug-01");
    });

    it("should execute set3DCameraMode tool", async () => {
      const res = await executeCopilotTool("set3DCameraMode", { mode: "TOP" }, "room-bedroom-01");
      expect(res.success).toBe(true);
      expect(res.clientAction?.type).toBe("SET_CAMERA_MODE");
      expect(res.clientAction?.payload.mode).toBe("TOP");
    });

    it("should execute compareScenarioResults tool", async () => {
      const res = await executeCopilotTool("compareScenarioResults", {}, "room-bedroom-01");
      expect(res.success).toBe(true);
      expect(res.data.beforeScore).toBe(28);
      expect(res.data.afterScore).toBe(100);
      expect(res.data.delta).toBe(72);
    });
  });

  describe("3. Copilot Chat Service & RAG Integration", () => {
    it("should answer clinical fall hazard question with evidence citations", async () => {
      const res = await processCopilotChat({
        message: "Tại sao thảm trải sàn không cố định lại nguy hiểm cho người cao tuổi?",
        roomId: "room-bedroom-01",
      });

      expect(res.answer).toBeDefined();
      expect(res.answer.length).toBeGreaterThan(50);
      expect(res.citations.length).toBeGreaterThan(0);
      expect(res.evidenceStatus).toBe("SUPPORTED");
      expect(res.citations[0].publisher).toBeDefined();
      expect(res.suggestedFollowUps.length).toBeGreaterThan(0);
    });

    it("should attach tool action when user asks to see object on 3D", async () => {
      const res = await processCopilotChat({
        message: "Hãy cho tôi xem tấm thảm nguy hiểm trên 3D",
        roomId: "room-bedroom-01",
      });

      expect(res.toolInvocations.length).toBeGreaterThan(0);
      const focusTool = res.toolInvocations.find((t) => t.tool === "focus3DObject");
      expect(focusTool).toBeDefined();
      expect(focusTool?.clientAction?.payload.objectId).toBe("obj-rug-01");
    });
  });

  describe("4. 3D Copilot Action Bridge", () => {
    it("should execute FOCUS_OBJECT action on simulation store", () => {
      const store = useSimulationStore.getState();

      const result = store.executeCopilotAction({
        action: "FOCUS_OBJECT",
        targetId: "obj-rug-01",
        timestamp: Date.now(),
      });

      expect(result.success).toBe(true);
      const updatedState = useSimulationStore.getState();
      expect(updatedState.selectedObjectId).toBe("obj-rug-01");
      expect(updatedState.cameraFocusPoint).toBeDefined();
      expect(updatedState.cameraPreset).toBe("INTERIOR");
      expect(updatedState.showHazardOverlay).toBe(true);
    });

    it("should execute SET_CAMERA_MODE action on simulation store", () => {
      const store = useSimulationStore.getState();

      const result = store.executeCopilotAction({
        action: "SET_CAMERA_MODE",
        mode: "WALKTHROUGH",
        timestamp: Date.now(),
      });

      expect(result.success).toBe(true);
      expect(useSimulationStore.getState().cameraPreset).toBe("WALKTHROUGH");
    });
  });
});

