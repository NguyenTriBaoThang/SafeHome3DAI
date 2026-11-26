import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

// OPEN-05: API routes must not echo raw `error.message` in responses of unexpected
// (generic 500/503) failures. Use buildSafeErrorPayload() instead.
//
// Allowlist (typed/domain errors with a deliberate user-facing message): a flagged line is
// allowed when one of the 6 lines above it (or itself) shows it is a typed-error branch:
//   - `error.code` / `error.statusCode`  (custom errors carrying code/status)
//   - `instanceof`                        (ConsentRequiredError, VisionProviderError, ...)
//   - `known`                             (scan-photo: `known ? error.message : fallback`)
const RAW_MESSAGE = /\b(error|err)\??\.message\b|String\((error|err)\)/;
const TYPED_ERROR_HINT = /error\.code|error\.statusCode|instanceof|\bknown\b/;

function routeFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? routeFiles(p) : e.name === "route.ts" ? [p] : [];
  });
}

describe("API routes do not leak raw error.message (OPEN-05)", () => {
  it("only typed-error branches may return error.message", () => {
    const offenders: string[] = [];
    for (const file of routeFiles(path.join(process.cwd(), "src/app/api"))) {
      const lines = fs.readFileSync(file, "utf8").split("\n");
      lines.forEach((line, i) => {
        if (!RAW_MESSAGE.test(line)) return;
        // Only care about values placed into a response body: `error:`/`details:`/`message:` keys or ternary values.
        if (!/(error|details|message)\s*:|\?\s*(error|err)\.message/.test(line) && !/^\s*(error|err)\.message/.test(line)) return;
        // Internal audit-log `details:` (recordAuditEvent...) is not a response body.
        if (/details:/.test(line) && lines.slice(Math.max(0, i - 8), i).some((l) => /recordAuditEvent/.test(l))) return;
        const window = lines.slice(Math.max(0, i - 6), i + 1).join("\n");
        if (!TYPED_ERROR_HINT.test(window)) offenders.push(`${path.relative(process.cwd(), file)}:${i + 1}: ${line.trim()}`);
      });
    }
    expect(offenders).toEqual([]);
  });
});
