import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { POST as create, GET as list } from "@/app/api/simulations/route";
import { GET as detail, DELETE as remove } from "@/app/api/simulations/[id]/route";
import { POST as workflow } from "@/app/api/workflow/save-state/route";
import { POST as evaluate } from "@/app/api/risk-assessment/evaluate/route";
import { createSimulation } from "@/lib/simulations/persistence";
import { INITIAL_ROOMS } from "@/data/mockRooms";
import { ChatRequestSchema } from "@/lib/ai/chatRequest";
import { getSafeHomeSystemContext, formatSystemContextPrompt } from "@/lib/ai/safeHomeContextService";
import { executeCopilotTool } from "@/lib/ai/copilotToolRegistry";
import { runAndPersistAssessment, invalidateRoomAssessments, loadAssessmentSnapshot, getLatestAssessmentForRoom } from "@/lib/risk/assessmentManager";

const request = (body: unknown) => new NextRequest("http://localhost/api/simulations", { method: "POST", body: JSON.stringify(body) });
const draft = () => ({ ...structuredClone(INITIAL_ROOMS.find(r => r.roomType === "BEDROOM")!), evidenceStatus: "PHOTO_DRAFT" as const, name: "Bản dựng kiểm thử" });
afterEach(() => vi.restoreAllMocks());

describe("Whole-system regression: persistence and unknown evidence", () => {
  it("restores all objects, transforms and draft provenance from SQLite, then deletes the saved room", async () => {
    const state = draft();
    state.objects[0].position = [1.25, .4, -1.8];
    const response = await create(request({ name: state.name, roomType: state.roomType, roomState: state }));
    expect(response.status).toBe(201);
    const saved = (await response.json()).data;
    const context = { params: Promise.resolve({ id: saved.id }) };
    const restored = (await (await detail(new Request("http://localhost"), context)).json()).data;
    expect(restored.evidenceStatus).toBe("PHOTO_DRAFT");
    expect(restored.objects).toHaveLength(state.objects.length);
    expect(restored.objects[0].position).toEqual([1.25, .4, -1.8]);
    const card = (await (await list()).json()).data.find((r: any) => r.id === saved.id);
    expect(card.safetyScore).toBeNull(); expect(card.targetResident).toBeNull();
    expect((await evaluate(request(restored))).status).toBe(422);
    expect((await remove(new Request("http://localhost", { method: "DELETE" }), context)).status).toBe(200);
    expect((await detail(new Request("http://localhost"), context)).status).toBe(404);
  });
  it("rolls back project/home creation when writing the room fails", async () => {
    const count = await prisma.project.count();
    const state = draft();
    (state.objects[0] as any).name = undefined;
    await expect(createSimulation({ name: state.name, roomType: "BEDROOM", roomState: state } as any)).rejects.toThrow();
    expect(await prisma.project.count()).toBe(count);
  });
  it("does not replace a database failure with a successful list of demo rooms", async () => {
    vi.spyOn(prisma.room, "findMany").mockRejectedValueOnce(new Error("database unavailable"));
    const response = await list();
    expect(response.status).toBe(503); expect((await response.json()).success).toBe(false);
  });
  it("rejects expiring blob URLs and invalid geometry before saving", async () => {
    expect((await create(request({ name: "Ảnh chưa lưu", roomType: "BEDROOM", photoUrl: "blob:temporary" }))).status).toBe(400);
    expect((await create(request({ name: "Phòng không hợp lệ", roomType: "BEDROOM", width: -4 }))).status).toBe(400);
  });
  it("prevents the legacy demo workflow from writing sample patient and scene data", async () => {
    const before = await prisma.project.count();
    expect((await workflow()).status).toBe(410);
    expect(await prisma.project.count()).toBe(before);
  });
  it("keeps the photo flag through chat validation and excludes fictitious measurements and medical facts", async () => {
    const state = draft();
    const parsed = ChatRequestSchema.parse({ message: "Đánh giá phòng này", roomId: state.id, roomState: state });
    const context = getSafeHomeSystemContext(state.id, parsed.roomState);
    expect(context.rooms).toHaveLength(1);
    expect(context.rooms[0]).toMatchObject({ evidenceStatus: "PHOTO_DRAFT", dimensions: null, lightingLevel: null, isWet: null, safetyScore: null });
    expect(context.residentProfile.age).toBeNull(); expect(context.residentProfile.healthConditions).toEqual([]);
    const prompt = formatSystemContextPrompt(context);
    expect(prompt).toContain("CHƯA XÁC MINH"); expect(prompt).not.toContain("Bác Nam"); expect(prompt).not.toContain("200 Lux");
    const tool = await executeCopilotTool("getRiskAssessment", {}, state.id, context);
    expect(tool.data.safetyScore).toBeNull(); expect(tool.data.totalHazards).toBeNull();
  });
  it("restores a persisted risk report after its memory cache is cleared", async () => {
    const state = await createSimulation({ name: "Mô phỏng kiểm thử", roomType: "BEDROOM" });
    const snapshot = await runAndPersistAssessment(state);
    expect(snapshot.persisted).toBe(true);
    invalidateRoomAssessments(state.id);
    expect(await loadAssessmentSnapshot(snapshot.id)).toEqual(expect.objectContaining({ id: snapshot.id, findings: snapshot.findings }));
    invalidateRoomAssessments(state.id);
    expect((await getLatestAssessmentForRoom(state.id))?.id).toBe(snapshot.id);
    await prisma.room.delete({ where: { id: state.id } });
    invalidateRoomAssessments(state.id);
  });
});
