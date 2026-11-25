#!/usr/bin/env node
/**
 * Task A09 standalone evaluation CLI runner.
 * Works from a clean environment without external LLM keys and logs
 * model/provider/version, timestamp, numerator/denominator metrics, and failure diagnostics.
 */
const path = require("path");
const jitiLib = require("jiti");

async function main() {
  const rootDir = path.resolve(__dirname, "..");
  const factory = jitiLib.createJiti || jitiLib.default || jitiLib;
  const jiti = factory(__filename, {
    alias: {
      "@": path.join(rootDir, "src"),
    },
  });

  const entryPath = path.join(rootDir, "src", "lib", "rag", "benchmarkA09.ts");
  const mod = typeof jiti.import === "function"
    ? await jiti.import(entryPath)
    : jiti(entryPath);
  const { runA09BenchmarkSuite } = mod;
  const report = await runA09BenchmarkSuite();

  console.log("=== SAFEHOME3DAI — TASK A09 VIETNAMESE RAG BENCHMARK (40 QUESTIONS) ===");
  console.log(`Timestamp      : ${report.timestamp}`);
  console.log(`Run Mode       : ${report.runMode}`);
  console.log(`Provider/Model : ${report.modelProvider} / ${report.modelName}`);
  console.log(`Engine Version : ${report.engineVersion}`);
  console.log(`Grading Method : ${report.gradingMethod}`);
  console.log("");
  console.log("--- METRICS (NUMERATOR / DENOMINATOR) ---");
  for (const [key, m] of Object.entries(report.metrics)) {
    console.log(`- ${key.padEnd(28)}: ${m.numerator}/${m.denominator} (${m.ratePercent}%)`);
  }
  console.log("");
  console.log("--- GROUP BREAKDOWN ---");
  for (const g of report.groupSummaries) {
    const ret = g.retrievalHitAtK ? ` | retrieval=${g.retrievalHitAtK.numerator}/${g.retrievalHitAtK.denominator}` : "";
    const ref = g.refusalRate ? ` | refusal=${g.refusalRate.numerator}/${g.refusalRate.denominator}` : "";
    console.log(`- ${g.group.padEnd(28)}: passed=${g.passed.numerator}/${g.passed.denominator} (${g.passed.ratePercent}%)${ret}${ref}`);
  }
  console.log("");
  console.log(`Performance: avg=${report.performance.averageLatencyMs}ms | p95=${report.performance.p95LatencyMs}ms | cost=$${report.performance.estimatedCostUsd}`);

  if (report.failureAnalysisReport.length > 0) {
    console.log("");
    console.log(`--- FAILURE / DIAGNOSTIC REPORT (${report.failureAnalysisReport.length}) ---`);
    for (const f of report.failureAnalysisReport) {
      console.log(`[${f.id}] (${f.group}) Reasons: ${f.failureReasons.join("; ")} | Docs: [${f.retrievedDocumentIds.join(", ")}] | Status: ${f.actualEvidenceStatus}/${f.actualResponseMode}`);
      console.log(`   Query: ${f.query}`);
    }
  } else {
    console.log("\nNo benchmark failures detected.");
  }

  if (process.argv.includes("--json")) {
    console.log("\nJSON_REPORT_START");
    console.log(JSON.stringify(report, null, 2));
  }
}

main().catch((err) => {
  console.error("Failed to run A09 benchmark:", err);
  process.exit(1);
});
