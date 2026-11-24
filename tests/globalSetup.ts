import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { TestProject } from "vitest/node";

export async function setup({ config }: TestProject) {
  const url = config.env.DATABASE_URL;
  if (typeof url !== "string" || !url.startsWith("file:")) throw new Error("Missing isolated test database");
  const filename = path.resolve(url.slice(5));
  const root = path.resolve(".scratch", "vitest");
  const relative = path.relative(root, filename);
  if (relative.startsWith("..") || path.isAbsolute(relative) || path.basename(filename) !== "suite.db") {
    throw new Error("Refusing to initialize a database outside .scratch/vitest");
  }
  const directory = path.dirname(filename);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(filename, "", { flag: "wx" });
  try {
    execFileSync(process.execPath, [path.resolve("node_modules/prisma/build/index.js"), "db", "push", "--skip-generate"], {
      env: { ...process.env, DATABASE_URL: url }, stdio: "pipe", windowsHide: true, timeout: 60000,
    });
  } catch (error) {
    fs.rmSync(directory, { recursive: true, force: true });
    throw error;
  }
  return () => fs.rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

