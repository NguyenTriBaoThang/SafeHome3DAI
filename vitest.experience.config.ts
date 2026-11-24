import config from "./vitest.config";

// Geometry/store/provider tests do not need the suite's temporary database setup.
export default { ...config, test: {
  ...config.test,
  globalSetup: [],
  include: ["tests/**/*.test.ts"],
  exclude: ["tests/workflowIntegration.test.ts", "tests/surveyIntegration.test.ts"],
  maxWorkers: 2,
} };
