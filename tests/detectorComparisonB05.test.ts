import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createVisionProvider } from "@/lib/vision/providers";

describe("Task B05 — Detector Comparison, Not-Ready Guard & Non-Silent Provider Selection", () => {
  it("1. Produces honest not_ready comparison report when verified dataset and ONNX artifact are absent", () => {
    const scriptPath = path.resolve("scripts/ml/b05_benchmark_comparison.py");
    expect(fs.existsSync(scriptPath)).toBe(true);

    const pythonCmd = process.platform === "win32" ? "python" : "python3";
    const out = execFileSync(pythonCmd, [scriptPath], { encoding: "utf8" });
    const parsedReadiness = JSON.parse(out.trim());
    expect(parsedReadiness.status).toBe("not_ready");
    expect(parsedReadiness.verifiedTrainImages).toBe(0);
    expect(parsedReadiness.onnxArtifactPresent).toBe(false);

    const reportPath = path.resolve("reports/b05_comparison.json");
    expect(fs.existsSync(reportPath)).toBe(true);
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));

    expect(report.selectedBaseline.checkpoint).toBe("PekingU/rtdetr_r18vd");
    expect(report.selectedBaseline.license).toBe("Apache-2.0");
    expect(report.policyGuards.equatesObjectMapToHazardRecall).toBe(false);
    expect(report.policyGuards.usesAiLabelsAsGroundTruth).toBe(false);
    expect(report.ablationTracks.map((t: { stage: string }) => t.stage)).toEqual([
      "1_object_only",
      "2_plus_survey_confirmation",
      "3_canonical_risk_rules",
    ]);
  });

  it("2. Rejects invalid VISION_PROVIDER cleanly and never silently swaps gemini <-> local", () => {
    expect(createVisionProvider("gemini").name).toBe("gemini");
    expect(createVisionProvider("local").name).toBe("local");
    expect(() => createVisionProvider("yolov8_fake")).toThrow(/VISION_PROVIDER/);
  });

  it("3. Documents honest not_ready state and RT-DETR Apache-2.0 choice in B05 report", () => {
    const md = fs.readFileSync(path.resolve("docs/collaboration/B05_DETECTOR_BASELINE_REPORT.md"), "utf8");
    expect(md).toContain("not_ready");
    expect(md).toContain("PekingU/rtdetr_r18vd");
    expect(md).toContain("Apache-2.0");
    expect(md).toContain("70,92%");
  });
});
