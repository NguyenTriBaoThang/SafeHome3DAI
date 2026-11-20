import config from "./vitest.config";

// These tests use pure geometry and an in-memory store. Do not run the default
// database setup, which modifies the developer's SQLite database.
export default { ...config, test: {
  ...config.test,
  globalSetup: [],
  include: ["tests/**/*.test.ts"],
  exclude: ["tests/workflowIntegration.test.ts", "tests/surveyIntegration.test.ts"],
  maxWorkers: 2,
  minWorkers: 1,
} };
