import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Task A12 — CI Quality Gates, Release Artifacts & Documentation Audit", () => {
  it("1. Passes automated CI quality gates script (secrets, migrations, contracts, route auth, README scope)", () => {
    const out = execFileSync(process.execPath, [path.resolve("scripts/ci/quality-gates.cjs")], {
      encoding: "utf8",
    });
    expect(out).toContain("Gate Failures             : 0");
    expect(out).toContain("ALL CI QUALITY GATES PASSED.");
  });

  it("2. Verifies release checklist, deployment/rollback runbook, and risk register & limitations exist and declare scope honestly", () => {
    const checklist = fs.readFileSync(path.resolve("docs/release/RELEASE_CHECKLIST_A12.md"), "utf8");
    const runbook = fs.readFileSync(path.resolve("docs/release/DEPLOYMENT_ROLLBACK_RUNBOOK.md"), "utf8");
    const riskReg = fs.readFileSync(path.resolve("docs/release/RISK_REGISTER_AND_LIMITATIONS.md"), "utf8");

    expect(checklist.toLowerCase()).toContain("hỗ trợ đánh giá yếu tố môi trường");
    expect(checklist).toContain("Chờ B12 ký xác nhận");

    expect(runbook).toContain("Gemini Downtime");
    expect(runbook).toContain("ENABLE_EXTERNAL_LLM=false");
    expect(runbook).toContain("archive.cjs backup");
    expect(runbook).toContain("archive.cjs restore");

    expect(riskReg).toContain("0 blocker P0");
    expect(riskReg).toContain("Bảng Hạn Chế Hệ Thống");
    expect(riskReg).toContain("38 ảnh Wikimedia Commons");
  });
});
