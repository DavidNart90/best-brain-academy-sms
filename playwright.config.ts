import { defineConfig, devices } from "@playwright/test";

const appPort = process.env.E2E_APP_PORT ?? "3000";
const authPort = process.env.E2E_AUTH_PORT ?? "54329";

export default defineConfig({
  testDir: "./tests/e2e",
  testIgnore: "**/*.live.spec.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://127.0.0.1:${appPort}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "tablet",
      use: { ...devices["iPad Mini"], defaultBrowserType: "chromium" },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: [
    {
      command: "node tests/fixtures/auth-server.mjs",
      url: `http://127.0.0.1:${authPort}/health`,
      reuseExistingServer: false,
      timeout: 30000,
      env: {
        SYNTHETIC_AUTH_PORT: authPort,
      },
    },
    {
      command: `pnpm start --hostname 127.0.0.1 --port ${appPort}`,
      url: `http://127.0.0.1:${appPort}/login`,
      reuseExistingServer: false,
      timeout: 60000,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${authPort}`,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
          "sb_publishable_synthetic_test_only",
      },
    },
  ],
});
