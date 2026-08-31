import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";

if (existsSync(".env.test.local")) loadEnvFile(".env.test.local");
const required = [
  "TEST_SUPABASE_URL",
  "TEST_SUPABASE_PUBLISHABLE_KEY",
  "TEST_SUPABASE_PROJECT_REF",
  "TEST_ALLOWED_EMAIL",
  "TEST_ALLOWED_PASSWORD",
];
if (
  process.env.TEST_TARGET_ACK !== "isolated-test-only" ||
  required.some((key) => !process.env[key])
) {
  console.error(
    "BLOCKED: live Auth browser tests need an acknowledged isolated project and synthetic account configuration.",
  );
  process.exit(1);
}
// Invoke Node directly so Windows command-shim fallback cannot hide config failures.
const result = spawnSync(
  process.execPath,
  [
    fileURLToPath(import.meta.resolve("@playwright/test/cli")),
    "test",
    "--config",
    "playwright.auth.config.ts",
  ],
  { stdio: "inherit", env: process.env },
);
process.exit(result.status ?? 1);
