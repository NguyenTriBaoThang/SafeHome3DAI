import { defineConfig } from "vitest/config";
import path from "path";
import { randomUUID } from "node:crypto";

const databaseFile = path.resolve(".scratch", "vitest", randomUUID(), "suite.db");

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 40000,
    hookTimeout: 40000,
    maxWorkers: 2,
    globalSetup: ["./tests/globalSetup.ts"],
    env: { DATABASE_URL: `file:${databaseFile.replace(/\\/g, "/")}`, SAFEHOME_ISOLATED_TESTS: "1" },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
