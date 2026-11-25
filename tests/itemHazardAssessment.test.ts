import { describe, it, expect, afterEach, vi } from "vitest";
import {
  analyzeItemHazardFromImage,
  getDemoItemAssessment,
  ItemAssessmentUnavailableError,
  SAMPLE_ITEM_PRESETS,
} from "../src/lib/vision/itemHazardAnalyzer";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Item Hazard Assessment (no fabricated scores)", () => {
  it("without Gemini returns 'chưa xác định' error, never a filename/hint-selected template", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    for (const [name, hint] of [
      ["tham-trai-san.jpg", "thảm"],
      ["day-dien.jpg", "dây điện"],
      ["unknown.jpg", ""],
    ]) {
      const p = analyzeItemHazardFromImage(Buffer.from("x"), name, "image/jpeg", hint);
      await expect(p).rejects.toBeInstanceOf(ItemAssessmentUnavailableError);
      await expect(p).rejects.toThrow(/Chưa xác định/);
    }
  });

  it("with a Gemini key but provider unreachable/failing (SDK load or call error) also returns 'chưa xác định'", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    // SDK talks over fetch: make every call fail (429-like) without touching the network.
    const fetchMock = vi.fn().mockRejectedValue(new Error("429 quota"));
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      analyzeItemHazardFromImage(Buffer.from("x"), "a.jpg", "image/jpeg", "thảm")
    ).rejects.toBeInstanceOf(ItemAssessmentUnavailableError);
  }, 30000);

  it("explicit presets are flagged demo:true and labelled DEMO", () => {
    const demo = getDemoItemAssessment("rug");
    expect(demo?.demo).toBe(true);
    expect(demo?.modelProvider).toContain("DEMO");
    expect(demo?.modelProvider).not.toContain("Clinical Intelligence");
    expect(getDemoItemAssessment("not-a-category")).toBeNull();
    expect(getDemoItemAssessment("__proto__")).toBeNull();
  });

  it("every UI preset maps to a demo template", () => {
    expect(SAMPLE_ITEM_PRESETS.length).toBeGreaterThanOrEqual(3);
    for (const preset of SAMPLE_ITEM_PRESETS) {
      expect(getDemoItemAssessment(preset.category)?.demo).toBe(true);
    }
  });
});
