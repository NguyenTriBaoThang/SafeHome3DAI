import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const { archive } = createRequire(import.meta.url)("../scripts/accounts/archive.cjs");
let directory: string;
afterEach(() => { if (directory && path.dirname(directory) === path.resolve(".scratch") && path.basename(directory).startsWith("archive-test-")) fs.rmSync(directory, { recursive: true, force: true }); });
describe("Offline backup and restoration", () => {
  it("restores exact file bytes, refuses overwrites, tampering and escaping paths", () => {
    fs.mkdirSync(".scratch", { recursive: true }); directory = fs.mkdtempSync(path.resolve(".scratch/archive-test-"));
    const source = path.join(directory, "source"), backup = path.join(directory, "backup"), restored = path.join(directory, "restored");
    fs.mkdirSync(source); fs.writeFileSync(path.join(source, "accounts.db"), "fixture-only");
    fs.mkdirSync(path.join(source, "families")); fs.writeFileSync(path.join(source, "families", "fixture.jpg"), Buffer.from([1,2,3]));
    expect(archive("backup", source, backup).verified).toBe(true);
    expect(archive("restore", backup, restored).files).toBe(2);
    expect(fs.readFileSync(path.join(restored, "families/fixture.jpg"))).toEqual(Buffer.from([1,2,3]));
    expect(() => archive("restore", backup, restored)).toThrow();
    fs.writeFileSync(path.join(backup, "accounts.db"), "modified");
    expect(() => archive("restore", backup, path.join(directory, "tampered"))).toThrow(/checksum/);
    fs.writeFileSync(path.join(backup, "archive-manifest.json"), JSON.stringify({ version: 1, files: [{ path: "../outside" }] }));
    expect(() => archive("restore", backup, path.join(directory, "escape"))).toThrow();
  });
});
