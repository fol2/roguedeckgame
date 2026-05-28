import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.js"],
    setupFiles: ["tests/setup-node-env.ts"],
    pool: "threads",
    isolate: false,
    maxWorkers: 4,
    testTimeout: 20_000,
    hookTimeout: 20_000,
    teardownTimeout: 5_000
  }
});
