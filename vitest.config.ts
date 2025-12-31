import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Use a separate test environment
    environment: "node",

    // Global test timeout (10 seconds)
    testTimeout: 10000,

    // Run test FILES sequentially (critical for shared database)
    fileParallelism: false,

    // Run tests within files sequentially
    sequence: {
      concurrent: false,
    },

    // Setup file runs before all tests
    setupFiles: ["./tests/setup.ts"],

    // Include test files
    include: ["tests/**/*.test.ts"],

    // Coverage (optional but impressive)
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/server.ts"],
    },
  },
});
