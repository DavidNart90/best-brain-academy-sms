import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import approvedTarget from "./tests/fixtures/supabase-target.json" with { type: "json" };

if (existsSync(".env.test.local")) loadEnvFile(".env.test.local");

if (
  process.env.TEST_TARGET_ACK !== "isolated-test-only" ||
  !process.env.TEST_ALLOWED_EMAIL ||
  !process.env.TEST_ALLOWED_PASSWORD ||
  !process.env.TEST_SUPABASE_URL ||
  !process.env.TEST_SUPABASE_PROJECT_REF ||
  !process.env.TEST_SUPABASE_PUBLISHABLE_KEY
) {
  throw new Error(
    "BLOCKED: live Auth browser tests require a confirmed isolated Supabase test target and provisioned synthetic accounts.",
  );
}

const targetUrl = URL.parse(process.env.TEST_SUPABASE_URL);
if (
  !targetUrl ||
  targetUrl.protocol !== "https:" ||
  targetUrl.hostname !==
    `${process.env.TEST_SUPABASE_PROJECT_REF}.supabase.co` ||
  !process.env.TEST_SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_") ||
  process.env.TEST_SUPABASE_PROJECT_REF !== approvedTarget.projectRef ||
  approvedTarget.purpose !== "test-only" ||
  approvedTarget.liveDataAllowed
) {
  throw new Error(
    "BLOCKED: live Auth tests require the acknowledged test-only HTTPS project.",
  );
}

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.live.spec.ts",
  workers: 1,
  forbidOnly: true,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:3000", trace: "off", screenshot: "off" },
  projects: [
    { name: "real-supabase-chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "pnpm start --hostname 127.0.0.1",
    url: "http://127.0.0.1:3000/login",
    timeout: 60000,
    reuseExistingServer: false,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.TEST_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        process.env.TEST_SUPABASE_PUBLISHABLE_KEY,
    },
  },
});
