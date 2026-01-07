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

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json", "json-summary"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/server.ts", // Server startup file (not unit-testable)
        "src/app.ts", // App assembly (tested via integration tests)
        "src/infra/**", // External infrastructure connections
      ],
      // Coverage thresholds (enforce minimum coverage)
      thresholds: {
        lines: 80,
        functions: 85,
        branches: 65, // Slightly lower - edge cases are harder to test
        statements: 80,
      },
    },
  },
});
