import { afterEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { GeminiProvider } from "@/lib/vision/providers/GeminiProvider";
import { STRUCTURED_CONFIG as config, generateStructuredRoom, validateStructuredResponse } from "@/lib/vision/providers/structuredGemini";
import { RISK_IDS } from "@/lib/vision/providers/contracts";

const sdk = vi.hoisted(() => ({ options: {} as any, generate: vi.fn() }));
vi.mock("@google/genai", () => ({ GoogleGenAI: class {
  models = { generateContent: sdk.generate };
  constructor(options: unknown) { sdk.options = options; }
} }));
const jpeg = Buffer.from([255, 216, 255, 224, 0, 2, 255, 217]);
const bbox = { xMin: .1, yMin: .2, xMax: .8, yMax: .9 };
const payload = () => ({ objects: [{ category: "bed", bbox: { ...bbox }, confidence: .82, evidence: "Visible bed" }],
  risks: Object.fromEntries(RISK_IDS.map(id => [id, { present: "unknown", visible: "unknown", applicable: config.rooms.bedroom.applicable[id], severity: "UNKNOWN", evidence: "Needs confirmation" }])) });
function configured() { vi.stubEnv("GEMINI_API_KEY", "test-key"); vi.stubEnv("GEMINI_MODEL", "fixture-model"); }
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); sdk.generate.mockReset(); });

describe("Ported structured Gemini serving recipe", () => {
  it("preserves the frozen structured seed, threshold and reproducible configuration digest", () => {
    expect(config.reference_winner).toBe("structured"); expect(config.seed).toBe(20261122);
    expect(config.object_threshold).toBe(.5); expect(config.temperature).toBe(.1);
    const sorted = (value: any): any => Array.isArray(value) ? value.map(sorted) : value && typeof value === "object" ?
      Object.fromEntries(Object.keys(value).sort().map(key => [key, sorted(value[key])])) : value;
    const { content_sha256, ...body } = config;
    expect(createHash("sha256").update(JSON.stringify(sorted(body))).digest("hex")).toBe(content_sha256);
    expect(createHash("sha256").update(fs.readFileSync("src/lib/risk/riskRuleRegistry.ts")).digest("hex")).toBe(config.registry_sha256);
  });
  it("uses JSON Schema, a bounded timeout, fixed seed, one attempt and only the current image", async () => {
    configured();
    sdk.generate.mockResolvedValue({ text: JSON.stringify(payload()), candidates: [{ finishReason: "STOP" }], modelVersion: "fixture-build" });
    const result = await new GeminiProvider().analyze(jpeg);
    const request = sdk.generate.mock.calls[0][0];
    expect(request.config).toMatchObject({ responseMimeType: "application/json", seed: config.seed, temperature: config.temperature });
    expect(request.config.responseJsonSchema).toEqual(config.rooms.bedroom.schema);
    expect(request.contents).toHaveLength(1);
    expect(request.contents[0].parts[0].text).toBe(config.rooms.bedroom.prompt);
    expect(sdk.options.httpOptions).toEqual({ timeout: 60000, retryOptions: { attempts: 1 } });
    expect(result.providerMetadata).toMatchObject({ recipeId: config.recipe_id, modelVersion: "fixture-build", objectThreshold: .5 });
    expect(result.detections[0]).toMatchObject({ bbox, category: "bed", confidence: .82, verificationStatus: "PENDING_REVIEW" });
  });
  it("strips JPEG EXIF before sending the image and uses actual MIME", async () => {
    configured();
    const generator = vi.fn().mockResolvedValue({ payload: payload(), modelVersion: "fixture" });
    const image = Buffer.from([255, 216, 255, 225, 0, 8, 69, 120, 105, 102, 0, 0, 255, 217]);
    await new GeminiProvider(generator).analyze(image, "image/png");
    expect(generator.mock.calls[0][0].image.includes(Buffer.from("Exif"))).toBe(false);
    expect(generator.mock.calls[0][0].mimeType).toBe("image/jpeg");
  });
  it("accepts genuinely empty objects and keeps confirmed risks unknown", async () => {
    configured();
    const result = await new GeminiProvider(vi.fn().mockResolvedValue({ payload: { ...payload(), objects: [] }, modelVersion: "fixture" })).analyze(jpeg);
    expect(result.detections).toEqual([]);
    expect(result.risk_supported).toBe(false);
    expect(Object.values(result.risks).every(risk => risk.present === "unknown")).toBe(true);
  });
  it("keeps supported AI risk suggestions separate from human confirmation", async () => {
    configured();
    const value = payload(); value.risks["RISK-001"] = { present: true as any, visible: true as any, applicable: true, severity: "HIGH", evidence: "Visible curled rug edge" };
    const result = await new GeminiProvider(vi.fn().mockResolvedValue({ payload: value, modelVersion: "fixture" })).analyze(jpeg);
    expect(result.riskCandidates?.["RISK-001"].present).toBe(true);
    expect(result.risks["RISK-001"].present).toBe("unknown");
    expect(result.observations.some(o => o.requiresConfirmation && o.evidenceJson?.riskId === "RISK-001")).toBe(true);
  });
  it.each(["RISK-003", "RISK-004", "RISK-005", "RISK-007", "RISK-008"] as const)("rejects invented measurements for %s", id => {
    const value = payload(); value.risks[id].present = true as any;
    expect(() => validateStructuredResponse(value, "bedroom")).toThrow();
  });
  it.each([{}, { objects: [] }, { ...payload(), objects: [{ category: "invalid", bbox, confidence: .9, evidence: "x" }] },
    { ...payload(), objects: [{ category: "bed", bbox: { ...bbox, xMax: NaN }, confidence: .9, evidence: "x" }] },
    { ...payload(), objects: [{ category: "bed", bbox, confidence: 2, evidence: "x" }] }])("rejects malformed output", value => {
    expect(() => validateStructuredResponse(value, "bedroom")).toThrow();
  });
  it("does not coerce string false or missing risks into negative labels", () => {
    const value = payload(); value.risks["RISK-001"].present = "false";
    expect(() => validateStructuredResponse(value, "bedroom")).toThrow();
    delete (value.risks as any)["RISK-002"];
    expect(() => validateStructuredResponse(value, "bedroom")).toThrow();
  });
  it.each(["MAX_TOKENS", "SAFETY", undefined])("rejects blocked or truncated generation %s", async finishReason => {
    configured(); sdk.generate.mockResolvedValue({ text: JSON.stringify(payload()), candidates: [{ finishReason }] });
    await expect(new GeminiProvider().analyze(jpeg)).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });
  it("does not call a model when credentials are missing", async () => {
    vi.stubEnv("GEMINI_API_KEY", ""); const generator = vi.fn();
    await expect(new GeminiProvider(generator).analyze(jpeg)).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
    expect(generator).not.toHaveBeenCalled();
  });
  it.each(["0", "100", "bad", "120001"])("rejects invalid timeout %s", async timeout => {
    configured(); vi.stubEnv("VISION_TIMEOUT_MS", timeout);
    await expect(new GeminiProvider().analyze(jpeg)).rejects.toMatchObject({ code: "INVALID_CONFIG" });
  });
  it("reports network failure without falling back or leaking provider details", async () => {
    configured();
    await expect(new GeminiProvider(vi.fn().mockRejectedValue(new Error("private provider message"))).analyze(jpeg))
      .rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
  });
});
