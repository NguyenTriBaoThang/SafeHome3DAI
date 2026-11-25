import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

describe("Task B11 — Evaluation Protocol & Reproducible Analysis Script", () => {
  const pythonCmd = process.platform === "win32" ? "python" : "python3";
  const scriptPath = path.resolve("scripts/evaluation/b11_experiment_analysis.py");

  it("1. Emits blocked_awaiting_field_data with null MAE/SUS when real field data are absent", () => {
    const out = execFileSync(pythonCmd, [scriptPath], { encoding: "utf8" });
    const parsed = JSON.parse(out.trim());
    expect(parsed.status).toBe("blocked_awaiting_field_data");
    expect(parsed.sampleCounts.participantsWithSus).toBe(0);

    const summary = JSON.parse(fs.readFileSync(path.resolve("reports/b11_evaluation_summary.json"), "utf8"));
    expect(summary.tracks["3_measurementMaeCm"].maeCm).toBeNull();
    expect(summary.tracks["4_usabilityAndEducationalOutcome"].susMean).toBeNull();
    expect(summary.clinicalClaimsGuard.fallRateReductionProven).toBe(false);
    expect(summary.clinicalClaimsGuard.clinicalDiagnosisSupported).toBe(false);
  });

  it("2. Computes confusion matrix, not_assessable separation, MAE(cm), bootstrap CI, and exact SUS on a synthetic fixture", () => {
    const pyCheck = [
      "import json, sys",
      "sys.path.insert(0, 'scripts/evaluation')",
      "import b11_experiment_analysis as m",
      "records = [",
      "  {'riskId': 'RISK-001', 'truth': 'present', 'predicted': 'present'},",
      "  {'riskId': 'RISK-001', 'truth': 'absent', 'predicted': 'present'},",
      "  {'riskId': 'RISK-001', 'truth': 'not_assessable', 'predicted': 'absent'},",
      "  {'riskId': 'RISK-004', 'truth': 'present', 'predicted': 'unknown'},",
      "]",
      "res = m.build_experiment_summary(",
      "  hazard_records=records,",
      "  paired_f1_deltas=[0.1, 0.2],",
      "  measurement_pairs_cm=[(50.0, 48.0), (88.0, 90.0)],",
      "  sus_questionnaires=[[5,1,5,1,5,1,5,1,5,1]],",
      "  data_label='SYNTHETIC_UNIT_TEST',",
      ")",
      "print(json.dumps(res))",
    ].join("\n");

    const raw = execFileSync(pythonCmd, ["-c", pyCheck], { encoding: "utf8" });
    const res = JSON.parse(raw);

    // Truth not_assessable & unknown pred must NOT be turned into FP/TN/FN!
    const risk1 = res.tracks["2_hazardScreening"].perRisk["RISK-001"];
    expect(risk1.confusion).toEqual({ tp: 1, fp: 1, fn: 0, tn: 0 });
    expect(risk1.notAssessableTruthCount).toBe(1);
    expect(res.tracks["2_hazardScreening"].perRisk["RISK-004"].abstainedPredCount).toBe(1);

    // MAE(|50-48|, |88-90|) = 2.0 cm
    expect(res.tracks["3_measurementMaeCm"].maeCm).toBe(2);
    expect(res.tracks["3_measurementMaeCm"].ci.exploratoryWarning).toBe(true);

    // Perfect SUS response [5,1,5,1,...] -> 100.0
    expect(res.tracks["4_usabilityAndEducationalOutcome"].susMean).toBe(100);
  });
});
