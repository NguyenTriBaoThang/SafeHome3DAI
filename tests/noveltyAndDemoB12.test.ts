import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Task B12 — Novelty Matrix, Verified Literature DOIs & Demo Script Guards", () => {
  it("1. Documents all 5 reference studies with verified DOIs and avoids unsubstantiated claims", () => {
    const novelty = fs.readFileSync(
      path.resolve("docs/release/B12_NOVELTY_MATRIX_AND_SOURCES.md"),
      "utf8"
    );

    expect(novelty).toContain("10.1016/j.jbi.2019.103135");
    expect(novelty).toContain("10.1177/15691861231155994");
    expect(novelty).toContain("10.1186/s12911-025-03149-7");
    expect(novelty).toContain("10.2196/77591");
    expect(novelty).toContain("10.1177/09287329261498665");

    expect(novelty).not.toMatch(/duy nhất trên thị trường(?!\*\*|"|\s|\))/i);
    expect(novelty).toContain("PHOTO_DRAFT");
  });

  it("2. Provides 3-minute demo script, offline video backup label, and 20 honest Q&A items", () => {
    const demoDoc = fs.readFileSync(
      path.resolve("docs/release/B12_DEMO_SCRIPT_AND_QA_BANK.md"),
      "utf8"
    );

    expect(demoDoc).toContain("OFFLINE DEMO VIDEO BACKUP");
    expect(demoDoc).toContain("ENABLE_EXTERNAL_LLM=false");
    expect(demoDoc).toContain("B09_BEDROOM_BASELINE_INPUT");
    expect(demoDoc).toContain("10. **");
    expect(demoDoc).toContain("20. **");
    expect(demoDoc).toContain("Chưa có (`0` người dùng thực địa)");
  });
});

