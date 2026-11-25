import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as analyze } from "@/app/api/vision/images/[imageId]/analyze/route";
import { POST as assessItem } from "@/app/api/vision/assess-item/route";
import {
  averageConfidence,
  bboxToPercentStyle,
  initialWorkflowDetections,
  runWorkflowVision,
} from "@/lib/vision/workflowVision";

const database = vi.hoisted(() => ({
  roomImage: { findUnique: vi.fn() },
  visionAnalysis: { create: vi.fn() },
}));
const storage = vi.hoisted(() => ({ persist: vi.fn() }));
vi.mock("@/lib/database/prisma", () => ({ prisma: database }));
vi.mock("@/lib/vision/visionPersistence", () => ({ persistVisionAnalysis: storage.persist }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const file = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 2, 0xff, 0xd9])], { type: "image/jpeg" });
const json = (body: unknown, status = 200) => Response.json(body, { status });
const uploadOk = () => json({ success: true, data: { id: "img-1", fileUrl: "/api/vision/images/img-1/file" } }, 201);
const base = { file, roomId: "r1", roomType: "BEDROOM" };

describe("workflow step 3: initial state", () => {
  it("starts with no detections and nothing confirmed", () => {
    expect(initialWorkflowDetections()).toEqual([]);
    expect(averageConfidence(initialWorkflowDetections())).toBeNull();
  });
  it("average confidence ignores rejected and is null without data", () => {
    const mk = (confidence: number, verificationStatus: any) => ({ confidence, verificationStatus });
    expect(averageConfidence([mk(0.5, "PENDING_REVIEW"), mk(0.9, "REJECTED"), mk(0.7, "CONFIRMED")])).toBeCloseTo(0.6);
  });
});

describe("bbox overlay mapping", () => {
  // Overlay wrapper hugs the rendered image, so normalized coords map to percent of it
  // regardless of aspect ratio (portrait, landscape, letterboxed in a wider container).
  it.each([
    ["landscape 4:3", { xMin: 0.1, yMin: 0.2, xMax: 0.6, yMax: 0.8 }],
    ["portrait 3:4", { xMin: 0.1, yMin: 0.2, xMax: 0.6, yMax: 0.8 }],
    ["letterboxed 21:9", { xMin: 0.1, yMin: 0.2, xMax: 0.6, yMax: 0.8 }],
  ])("%s maps to percent of the rendered image", (_n, bbox) => {
    const s = bboxToPercentStyle(bbox);
    expect(s.left).toBe("10%");
    expect(s.top).toBe("20%");
    expect(parseFloat(s.width)).toBeCloseTo(50);
    expect(parseFloat(s.height)).toBeCloseTo(60);
  });
  it("applies to a pixel rect: 800x600 image -> 80px,120px / 400x360", () => {
    const s = bboxToPercentStyle({ xMin: 0.1, yMin: 0.2, xMax: 0.6, yMax: 0.8 });
    const W = 800, H = 600;
    expect((parseFloat(s.left) / 100) * W).toBeCloseTo(80);
    expect((parseFloat(s.top) / 100) * H).toBeCloseTo(120);
    expect((parseFloat(s.width) / 100) * W).toBeCloseTo(400);
    expect((parseFloat(s.height) / 100) * H).toBeCloseTo(360);
  });
  it("clamps out-of-range boxes to the image", () => {
    const s = bboxToPercentStyle({ xMin: -0.2, yMin: 0.5, xMax: 1.4, yMax: 0.9 });
    expect(s.left).toBe("0%");
    expect(parseFloat(s.width)).toBeCloseTo(100);
  });
});

describe("runWorkflowVision (client orchestration, mocked fetch)", () => {
  it("no consent: nothing is sent, provider never reached", async () => {
    const f = vi.fn();
    const out = await runWorkflowVision({ ...base, consent: false, fetchImpl: f as any });
    expect(out.kind).toBe("no_consent");
    expect(f).not.toHaveBeenCalled();
  });

  it.each([429, 500, 503])("analyze HTTP %i -> chưa xác định, zero detections", async (status) => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(uploadOk())
      .mockResolvedValueOnce(json({ success: false, error: "Nhà cung cấp lỗi", code: "PROVIDER_UNAVAILABLE" }, status));
    const out = await runWorkflowVision({ ...base, consent: true, fetchImpl: f as any });
    expect(out.kind).toBe("unknown");
    expect(out).not.toHaveProperty("detections");
    if (out.kind === "unknown") {
      expect(out.message).toMatch(/^Chưa xác định/);
      expect(out.retryable).toBe(true);
    }
  });

  it("analyze timeout -> unknown + retryable", async () => {
    const timeout = Object.assign(new Error("timeout"), { name: "TimeoutError" });
    const f = vi.fn().mockResolvedValueOnce(uploadOk()).mockRejectedValueOnce(timeout);
    const out = await runWorkflowVision({ ...base, consent: true, fetchImpl: f as any });
    expect(out).toMatchObject({ kind: "unknown", retryable: true });
  });

  it("provider not configured (503 INVALID_CONFIG) -> unknown", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(uploadOk())
      .mockResolvedValueOnce(json({ success: false, error: "Chưa cấu hình GEMINI_API_KEY", code: "INVALID_CONFIG" }, 503));
    const out = await runWorkflowVision({ ...base, consent: true, fetchImpl: f as any });
    expect(out.kind).toBe("unknown");
  });

  it("server-side consent refusal (403) -> no_consent, not an error", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(uploadOk())
      .mockResolvedValueOnce(json({ success: false, code: "CONSENT_REQUIRED", error: "Chưa đồng ý" }, 403));
    const out = await runWorkflowVision({ ...base, consent: true, fetchImpl: f as any });
    expect(out.kind).toBe("no_consent");
  });

  it("success: every detection arrives unconfirmed even if the payload says otherwise", async () => {
    const det = (id: string) => ({
      id, category: "bed", originalLabel: "Giường", confidence: 0.8, source: "OBJECT_DETECTOR",
      bbox: { xMin: 0.1, yMin: 0.1, xMax: 0.5, yMax: 0.5 }, verificationStatus: "CONFIRMED",
    });
    const f = vi
      .fn()
      .mockResolvedValueOnce(uploadOk())
      .mockResolvedValueOnce(json({ success: true, data: { detections: [det("a"), det("b")], clarifications: [] } }));
    const out = await runWorkflowVision({ ...base, consent: true, fetchImpl: f as any });
    expect(out.kind).toBe("ok");
    if (out.kind === "ok") {
      expect(out.detections).toHaveLength(2);
      expect(out.detections.every((d) => d.verificationStatus === "PENDING_REVIEW")).toBe(true);
      expect(out.demo).toBe(false);
    }
  });
});

describe("analyze route: consent and provider failures", () => {
  const call = (body: object) =>
    analyze(new NextRequest("http://localhost/analyze", { method: "POST", body: JSON.stringify(body) }), {
      params: Promise.resolve({ imageId: "img-1" }),
    });

  it("no third-party consent -> 403 and the provider is never called", async () => {
    vi.stubEnv("VISION_PROVIDER", "local");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    database.roomImage.findUnique.mockResolvedValue({ id: "img-1", roomId: "r1", storageKey: "x.jpg", consentStatus: false });
    const res = await call({ roomId: "r1", roomType: "BEDROOM", consent: false });
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("CONSENT_REQUIRED");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storage.persist).not.toHaveBeenCalled();
  });

  it.each([
    ["429", () => Promise.resolve(new Response("rate", { status: 429 }))],
    ["500", () => Promise.resolve(new Response("boom", { status: 500 }))],
    ["timeout", () => Promise.reject(Object.assign(new Error("t"), { name: "TimeoutError" }))],
  ])("provider %s -> 503, nothing persisted", async (_n, impl) => {
    vi.stubEnv("VISION_PROVIDER", "local");
    vi.stubGlobal("fetch", vi.fn().mockImplementation(impl));
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 2, 0xff, 0xd9]).toString("base64");
    const res = await call({ roomId: "r1", roomType: "BEDROOM", consent: true, imageBufferBase64: jpeg });
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.data).toBeUndefined();
    expect(storage.persist).not.toHaveBeenCalled();
  });

  it("provider not configured (gemini without key) -> 503, nothing persisted", async () => {
    vi.stubEnv("VISION_PROVIDER", "gemini");
    vi.stubEnv("GEMINI_API_KEY", "");
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 2, 0xff, 0xd9]).toString("base64");
    const res = await call({ roomId: "r1", roomType: "BEDROOM", consent: true, imageBufferBase64: jpeg });
    expect(res.status).toBe(503);
    expect(storage.persist).not.toHaveBeenCalled();
  });
});

describe("assess-item route", () => {
  const post = (body: object) =>
    assessItem(
      new Request("http://localhost/api/vision/assess-item", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      })
    );

  it("no Gemini -> 503 chưa xác định, no score or template", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const res = await post({
      imageBase64: Buffer.from("not-a-real-image").toString("base64"),
      itemHint: "thảm trải sàn",
      fileName: "rug.jpg",
      consent: true,
    });
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body).toMatchObject({ success: false, code: "PROVIDER_UNAVAILABLE", status: "UNKNOWN" });
    expect(body.error).toMatch(/Chưa xác định/);
    expect(body.assessment).toBeUndefined();
    expect(JSON.stringify(body)).not.toMatch(/riskScore|86/);
  });

  it("explicit preset is returned only as demo:true and never calls a provider", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const res = await post({ presetCategory: "rug" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.demo).toBe(true);
    expect(body.assessment.demo).toBe(true);
    expect(body.assessment.modelProvider).toContain("DEMO");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect((await post({ presetCategory: "nope" })).status).toBe(400);
  });
});
