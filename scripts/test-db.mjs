import { spawnSync } from "node:child_process";
import { loadEnvFile } from "node:process";
import { existsSync } from "node:fs";
import approvedTarget from "../tests/fixtures/supabase-target.json" with { type: "json" };

if (existsSync(".env.test.local")) loadEnvFile(".env.test.local");
const names = [
  "TEST_SUPABASE_URL",
  "TEST_SUPABASE_PUBLISHABLE_KEY",
  "TEST_SUPABASE_PROJECT_REF",
  "TEST_TARGET_ACK",
];
const missing = names.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(
    `BLOCKED: isolated database configuration missing: ${missing.join(", ")}`,
  );
  process.exit(1);
}
const url = URL.parse(process.env.TEST_SUPABASE_URL);
if (
  !url ||
  url.protocol !== "https:" ||
  !process.env.TEST_SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_") ||
  process.env.TEST_TARGET_ACK !== "isolated-test-only" ||
  url.hostname !== `${process.env.TEST_SUPABASE_PROJECT_REF}.supabase.co` ||
  process.env.TEST_SUPABASE_PROJECT_REF !== approvedTarget.projectRef ||
  approvedTarget.purpose !== "test-only" ||
  approvedTarget.liveDataAllowed
) {
  console.error(
    "BLOCKED: target must match the explicitly authorized test-only project.",
  );
  process.exit(1);
}
const result = spawnSync(
  process.execPath,
  ["--test", "tests/integration/provider-preflight.test.mjs"],
  { stdio: "inherit", env: process.env },
);
if (result.status !== 0) process.exit(result.status ?? 1);
const actorKeys = ["ALLOWED", "DENIED", "DISABLED"].flatMap((actor) => [
  `TEST_${actor}_EMAIL`,
  `TEST_${actor}_PASSWORD`,
]);
if (actorKeys.some((key) => !process.env[key])) {
  console.error(
    "BLOCKED: provider preflight ran, but provisioned synthetic actor credentials are missing. Full Auth/RLS integration did not run.",
  );
  process.exit(1);
}
const actorResult = spawnSync(
  process.execPath,
  ["--test", "tests/integration/access.test.mjs"],
  {
    stdio: "inherit",
    env: process.env,
  },
);
process.exit(actorResult.status ?? 1);
