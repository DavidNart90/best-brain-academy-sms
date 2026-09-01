import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.TEST_SUPABASE_URL;
const key = process.env.TEST_SUPABASE_PUBLISHABLE_KEY;
const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

test("real Data API denies anonymous access to all five tables and access RPC", async () => {
  for (const table of [
    "profiles",
    "roles",
    "permissions",
    "role_permissions",
    "user_roles",
  ]) {
    const { error } = await db.from(table).select("*").limit(1);
    assert.equal(
      error?.code,
      "42501",
      `Anonymous table grant denied: ${table}`,
    );
  }
  assert.equal((await db.rpc("get_access_context")).error?.code, "42501");
});

test("the private helper schema is not exposed through the Data API", async () => {
  const { error } = await db.schema("private").rpc("has_valid_session");
  assert.equal(error?.code, "PGRST106");
});

test("hosted Auth disables public signup and anonymous sign-in", async () => {
  const response = await fetch(`${url}/auth/v1/settings`, {
    headers: { apikey: key },
  });
  assert.equal(response.status, 200);
  const settings = await response.json();
  assert.equal(
    settings.disable_signup,
    true,
    "Disable public signup in hosted Auth settings; config.toml does not configure this project.",
  );
  assert.equal(
    settings.external?.anonymous_users,
    false,
    "Anonymous sign-in must be disabled.",
  );
  // Attempt only after the provider confirms signup is disabled. No real address,
  // persistent password or email delivery is involved in this rejection check.
  const { data, error } = await db.auth.signUp({
    email: `phase0-signup-denied-${randomUUID()}@example.invalid`,
    password: `${randomUUID()}Aa1!`,
  });
  assert.equal(error?.code, "signup_disabled");
  assert.equal(data.user, null);
  assert.equal(data.session, null);
});

test("real Auth rejects an invalid synthetic login without issuing a session", async () => {
  const { data, error } = await db.auth.signInWithPassword({
    email: "phase0-nonexistent@example.invalid",
    password: "Not-an-existing-account-123!",
  });
  assert.equal(error?.code, "invalid_credentials");
  assert.equal(data.session, null);
});
