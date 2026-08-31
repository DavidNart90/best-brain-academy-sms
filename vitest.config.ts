import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: [
        "src/lib/permissions/*.ts",
        "src/lib/env.ts",
        "src/features/auth/schemas.ts",
        "src/utils/money.ts",
      ],
      exclude: ["**/*.test.*"],
      thresholds: { lines: 90, branches: 85, functions: 90, statements: 90 },
      reporter: ["text", "json-summary", "html"],
    },
  },
});
