import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as scan } from "@/app/api/vision/scan-photo/route";
import { POST as analyze } from "@/app/api/vision/images/[imageId]/analyze/route";
import { CATEGORY_TAXONOMY } from "@/lib/vision/taxonomy";

const database = vi.hoisted(() => ({ roomImage: { findUnique: vi.fn(), create: vi.fn() },
  visionAnalysis: { create: vi.fn() }, objectDetection: { create: vi.fn() },
  visionObservation: { create: vi.fn() }, visionClarification: { create: vi.fn() } }));
const storage = vi.hoisted(() => ({ persist: vi.fn().mockResolvedValue({ fileUrl: "/uploads/vision/fixture.jpg", filename: "fixture.jpg" }) }));
vi.mock("@/lib/database/prisma", () => ({ prisma: database }));
vi.mock("@/lib/vision/visionPersistence", () => ({ persistVisionAnalysis: storage.persist }));
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 2, 0xff, 0xd9]);
const payload = () => ({ contract_version: 1, source: "LOCAL_FINE_TUNED_DETECTOR", risk_supported: false,
  model_sha256: "b".repeat(64), trained_classes: ["bed"], untrained_classes: Object.keys(CATEGORY_TAXONOMY).filter(c => c !== "bed"),
  objects: [{ category: "bed", bbox: { xMin: .1, yMin: .1, xMax: .9, yMax: .9 }, confidence: .8 }] });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.clearAllMocks(); });
beforeEach(() => { storage.persist.mockResolvedValue({ fileUrl: "/uploads/vision/fixture.jpg", filename: "fixture.jpg" }); });

describe("Vision API contracts without database or paid requests", () => {
  it("returns compatible detections plus explicit provenance and unknown risks", async () => {
    vi.stubEnv("VISION_PROVIDER", "local");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(payload())));
    const response = await scan(new Request("http://localhost/api/vision/scan-photo", { method: "POST", body: jpeg }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ provider: "local", engine: "LOCAL_FINE_TUNED_DETECTOR", risk_supported: false });
    expect(body.detections[0]).toMatchObject({ category: "bed", source: "OBJECT_DETECTOR", verificationStatus: "PENDING_REVIEW" });
    expect(body.risks["RISK-004"].present).toBe("unknown");
  });
  it("accepts a real successful zero-object result", async () => {
    vi.stubEnv("VISION_PROVIDER", "local");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ ...payload(), objects: [] })));
    const response = await scan(new Request("http://localhost/scan", { method: "POST", body: jpeg }));
    expect(response.status).toBe(200);
    expect((await response.json()).detections).toEqual([]);
  });
  it("returns 503 without synthetic furniture when the selected service is offline", async () => {
    vi.stubEnv("VISION_PROVIDER", "local");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const response = await scan(new Request("http://localhost/scan", { method: "POST", body: jpeg }));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
  });
  it.each([undefined, "not an image"])("rejects empty or non-image bodies", async body => {
    const response = await scan(new Request("http://localhost/scan", { method: "POST", body }));
    expect(response.status).toBe(400);
  });
  it("enforces the streamed byte limit even without Content-Length", async () => {
    const response = await scan(new Request("http://localhost/scan", { method: "POST", body: new Uint8Array(10 * 1024 * 1024 + 1) }));
    expect(response.status).toBe(413);
  });
  it("does not persist a fabricated successful analysis after inference failure", async () => {
    vi.stubEnv("VISION_PROVIDER", "gemini"); vi.stubEnv("GEMINI_API_KEY", "");
    const response = await analyze(new NextRequest("http://localhost/analyze", { method: "POST",
      body: JSON.stringify({ consent: true, imageBufferBase64: Buffer.from(jpeg).toString("base64"), caption: "table" }) }),
      { params: Promise.resolve({ imageId: "img-user-failed" }) });
    expect(response.status).toBe(503);
    expect((await response.json()).success).toBe(false);
    expect(database.visionAnalysis.create).not.toHaveBeenCalled();
  });
  it("routes persisted-image analysis to the selected provider and retains provenance", async () => {
    vi.stubEnv("VISION_PROVIDER", "local");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(payload())));
    database.roomImage.findUnique.mockResolvedValue({ id: "img-user-ok" });
    database.visionAnalysis.create.mockImplementation(async ({ data }) => data);
    const response = await analyze(new NextRequest("http://localhost/analyze", { method: "POST",
      body: JSON.stringify({ consent: true, imageBufferBase64: Buffer.from(jpeg).toString("base64"), roomId: "r" }) }),
      { params: Promise.resolve({ imageId: "img-user-ok" }) });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toMatchObject({ provider: "local", risk_supported: false, modelSha256: "b".repeat(64) });
    expect(body.data.detections[0]).toMatchObject({ imageId: "img-user-ok", analysisId: body.data.id });
    expect(storage.persist).toHaveBeenCalledTimes(1);
  });
});
