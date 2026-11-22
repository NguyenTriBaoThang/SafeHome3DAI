import { afterEach, describe, expect, it, vi } from "vitest";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { createVisionProvider, GeminiProvider, LocalDetectorProvider, RISK_IDS, unknownRisks } from "@/lib/vision/providers";
import { normalizeBoundingBox } from "@/lib/vision/providers/normalization";
import { CATEGORY_TAXONOMY } from "@/lib/vision/taxonomy";
import { createUnverifiedPhotoAssessment } from "@/lib/vision/photoRiskAssessment";
import { ALL_VERSIONED_RULES } from "@/lib/risk/riskRuleRegistry";
import { runVisionAnalysis } from "@/lib/vision/visionProvider";
import { mapClarificationToRoomFacts } from "@/lib/vision/clarificationEngine";
import { createPhotoClarifications } from "@/lib/vision/photoClarifications";

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 2, 0xff, 0xd9]);
const box = { xMin: .1, yMin: .2, xMax: .8, yMax: .9 };
const categories = Object.keys(CATEGORY_TAXONOMY);
const payload = () => ({ contract_version: 1, source: "LOCAL_FINE_TUNED_DETECTOR", risk_supported: false,
  model_sha256: "a".repeat(64), trained_classes: ["bed"], untrained_classes: categories.filter(c => c !== "bed"),
  objects: [{ category: "bed", bbox: box, confidence: .83 }], risks: Object.fromEntries(RISK_IDS.map(id => [id, { present: false }])) });
const local = (value = payload()) => new LocalDetectorProvider("http://127.0.0.1:8766", vi.fn().mockResolvedValue(Response.json(value)));

afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("Provider geometry boundary", () => {
  it("normalizes explicit Gemini 1000 coordinates in yxyx order", () => {
    expect(normalizeBoundingBox([200, 100, 900, 800], "gemini1000")).toEqual(box);
  });
  it("reorders reversed corners and clips partial boxes", () => {
    expect(normalizeBoundingBox({ xMin: 1.2, yMin: .9, xMax: -.2, yMax: .2 }))
      .toEqual({ xMin: 0, yMin: .2, xMax: 1, yMax: .9 });
  });
  it.each([NaN, Infinity, -Infinity, "0.2", undefined, null])("rejects nonfinite or nonnumeric coordinate %s", value => {
    expect(() => normalizeBoundingBox({ ...box, xMin: value })).toThrow();
  });
  it.each([{}, [], [1, 2, 3], [1, 2, 3, 4, 5]])("rejects malformed Gemini vector %j", value => {
    expect(() => normalizeBoundingBox(value, "gemini1000")).toThrow();
  });
  it.each([{ ...box, xMax: .1 }, { xMin: 2, xMax: 3, yMin: .1, yMax: .8 }])("rejects degenerate/clipped-out boxes", value => {
    expect(() => normalizeBoundingBox(value)).toThrow();
  });
});

describe("Explicit selection and tri-state semantics", () => {
  it("defaults to Gemini and reads local selection from environment", () => {
    vi.stubEnv("VISION_PROVIDER", "");
    expect(createVisionProvider()).toBeInstanceOf(GeminiProvider);
    vi.stubEnv("VISION_PROVIDER", "local");
    expect(createVisionProvider()).toBeInstanceOf(LocalDetectorProvider);
  });
  it("rejects unsupported provider instead of silently falling back", () => {
    expect(() => createVisionProvider("typo")).toThrow();
  });
  it.each(["ftp://localhost", "http://user:secret@localhost", "http://localhost/detect", "http://localhost?token=x"])
    ("rejects invalid local origin %s", origin => expect(() => new LocalDetectorProvider(origin)).toThrow());
  it("keeps every missing/unlabeled risk unknown and does not share mutable entries", () => {
    const risks = unknownRisks();
    expect(Object.keys(risks)).toEqual([...RISK_IDS]);
    expect(Object.values(risks).every(r => r.present === "unknown" && r.severity === "UNKNOWN")).toBe(true);
    risks["RISK-001"].present = false;
    expect(unknownRisks()["RISK-001"].present).toBe("unknown");
    expect(risks["RISK-002"].present).toBe("unknown");
  });
  it.each(["BEDROOM", "BATHROOM"] as const)("does not invent safety scores or negative risks in %s", room => {
    const result = createUnverifiedPhotoAssessment(room);
    expect(result.safetyScore).toBeNull();
    expect(result.findings).toEqual([]);
    for (const rule of ALL_VERSIONED_RULES) {
      expect(result.ruleEvaluations.find(r => r.ruleId === rule.id)?.state).toBe(
        rule.applicableRoomTypes.includes(room) ? "NEEDS_VERIFICATION" : "NOT_APPLICABLE");
    }
    expect(result.needsVerificationCount).toBeGreaterThan(0);
  });
  it.each(["UNKNOWN", "unknown", "unlabeled", "", "   "])("does not convert unconfirmed bathroom answer %j into a confirmed fact", answer => {
    expect(mapClarificationToRoomFacts("room", "BATH_005", answer, "photo")).toEqual([]);
    expect(mapClarificationToRoomFacts("room", "BATH_003", answer, "photo")).toEqual([]);
  });
  it.each(["BEDROOM", "BATHROOM"])("retains survey questions with an unknown option for %s", room => {
    const questions = createPhotoClarifications("room", room);
    expect(questions.length).toBeGreaterThan(0);
    for (const question of questions) {
      expect(question.options.some(o => o.value === "UNKNOWN")).toBe(true);
      expect(question.status).toBe("PENDING");
      expect(mapClarificationToRoomFacts("room", question.surveyQuestionId, "UNKNOWN", question.id)).toEqual([]);
    }
  });
});

describe("Local detector contract", () => {
  it("maps ONNX objects into existing bbox/taxonomy and ignores unsupported risk claims", async () => {
    const result = await local().analyze(jpeg, undefined, { imageId: "image", analysisId: "analysis" });
    expect(result.detections[0]).toMatchObject({ imageId: "image", analysisId: "analysis", category: "bed", bbox: box,
      confidence: .83, source: "OBJECT_DETECTOR", verificationStatus: "PENDING_REVIEW" });
    expect(result.untrainedClasses).toHaveLength(17);
    expect(result.modelSha256).toBe("a".repeat(64));
    expect(Object.values(result.risks).every(r => r.present === "unknown")).toBe(true);
  });
  it.each([
    { contract_version: 0 }, { model_sha256: "bad" }, { risk_supported: true }, { untrained_classes: [] },
    { trained_classes: ["unlisted"] }, { objects: [{ category: "rug", bbox: box, confidence: .9 }] },
    { objects: [{ category: "bed", bbox: box, confidence: 2 }] },
    { objects: [{ category: "bed", bbox: { ...box, xMin: null }, confidence: .9 }] },
  ])("rejects malformed or unsupported response %j", async patch => {
    await expect(local({ ...payload(), ...patch } as ReturnType<typeof payload>).analyze(jpeg)).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });
  it("propagates service startup failure without cloud fallback", async () => {
    const transport = vi.fn().mockResolvedValue(new Response(null, { status: 503 }));
    await expect(new LocalDetectorProvider(undefined, transport).analyze(jpeg)).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it("handles timeout and malformed JSON safely", async () => {
    for (const transport of [vi.fn().mockRejectedValue(new Error("timeout")), vi.fn().mockResolvedValue(new Response("not JSON"))]) {
      await expect(new LocalDetectorProvider(undefined, transport).analyze(jpeg)).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
    }
  });
  it.each([Buffer.alloc(0), Buffer.from("text"), Buffer.alloc(10 * 1024 * 1024 + 1)])("rejects invalid input before contacting detector", async image => {
    const transport = vi.fn();
    await expect(new LocalDetectorProvider(undefined, transport).analyze(image)).rejects.toMatchObject({ code: "INVALID_IMAGE" });
    expect(transport).not.toHaveBeenCalled();
  });
  it("exchanges raw image bytes over real loopback HTTP (fixture, no model inference)", async () => {
    let received = Buffer.alloc(0);
    let contentType = "";
    const server = createServer(async (req, res) => {
      expect(req.url).toBe("/detect");
      for await (const chunk of req) received = Buffer.concat([received, chunk]);
      contentType = req.headers["content-type"] || "";
      res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(payload()));
    });
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    try {
      const result = await new LocalDetectorProvider(`http://127.0.0.1:${(server.address() as AddressInfo).port}`).analyze(jpeg);
      expect(received).toEqual(jpeg); expect(contentType).toBe("image/jpeg");
      expect(result.detections).toHaveLength(1);
    } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
  });
});

describe("Production upload versus demo", () => {
  it("requires explicit demo selection for image IDs without bytes", async () => {
    await expect(runVisionAnalysis("missing", "room")).rejects.toMatchObject({ code: "INVALID_IMAGE" });
    await expect(runVisionAnalysis("img-user-missing", "room", { demo: true })).rejects.toThrow();
    const demo = await runVisionAnalysis("img-demo-bed", "room", { demo: true });
    expect(demo.modelId).toBe("mock-demo-fallback-dataset");
    expect(demo.detections.every(d => d.source === "MOCK_DEMO")).toBe(true);
  });
  it("never uses a caption or demo layout when uploaded inference fails", async () => {
    vi.stubEnv("GEMINI_API_KEY", ""); vi.stubEnv("VISION_PROVIDER", "gemini");
    await expect(runVisionAnalysis("img-demo-bed", "room", { demo: true, caption: "table",
      imageBufferBase64: jpeg.toString("base64") })).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
  });
});
