import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const url = process.env.TEST_SUPABASE_URL;
const key = process.env.TEST_SUPABASE_PUBLISHABLE_KEY;
const client = () =>
  createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

test("anonymous access cannot read profiles or call the access RPC", async () => {
  const db = client();
  assert.ok((await db.from("profiles").select("id").limit(1)).error);
  assert.ok((await db.rpc("get_access_context")).error);
});

for (const actor of ["ALLOWED", "DENIED", "DISABLED"]) {
  test(`${actor}: current-account visibility and direct write denial`, async () => {
    const db = client();
    const { data, error } = await db.auth.signInWithPassword({
      email: process.env[`TEST_${actor}_EMAIL`],
      password: process.env[`TEST_${actor}_PASSWORD`],
    });
    assert.equal(
      error,
      null,
      "Test actor must authenticate with the real test Auth service",
    );
    try {
      const context = await db.rpc("get_access_context");
      assert.equal(context.error, null);
      assert.equal(context.data.id, data.user.id);
      const rows = await db.from("profiles").select("id,status").limit(100);
      assert.equal(rows.error, null);
      assert.equal(rows.data.length, 1);
      assert.equal(rows.data[0].id, data.user.id);
      if (actor === "ALLOWED")
        assert.ok(context.data.permissions.includes("dashboard.read"));
      else assert.deepEqual(context.data.permissions, []);
      if (actor === "DISABLED") assert.equal(context.data.status, "disabled");
      if (actor === "ALLOWED") {
        const refreshed = await db.auth.refreshSession();
        assert.equal(refreshed.error, null);
        assert.equal(refreshed.data.user?.id, data.user.id);
        assert.ok(refreshed.data.session?.access_token);
        assert.equal((await db.rpc("get_access_context")).error, null);
      }
      if (actor === "DENIED") {
        const metadata = await db.auth.updateUser({
          data: { role: "SUPER_ADMIN", status: "active" },
        });
        assert.equal(metadata.error, null);
        const afterTamper = await db.rpc("get_access_context");
        assert.equal(afterTamper.error, null);
        assert.equal(afterTamper.data.status, "pending");
        assert.deepEqual(afterTamper.data.roles, []);
        assert.deepEqual(afterTamper.data.permissions, []);
      }
      // Restricted to self, and always denied by grants, even for super administrators.
      assert.ok(
        (
          await db
            .from("profiles")
            .update({ status: "active" })
            .eq("id", data.user.id)
        ).error,
      );
      assert.ok(
        (
          await db
            .from("user_roles")
            .insert({ user_id: data.user.id, role_code: "SUPER_ADMIN" })
        ).error,
      );
      const token = data.session.access_token;
      await db.auth.signOut({ scope: "local" });
      const stale = await fetch(`${url}/rest/v1/rpc/get_access_context`, {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: "{}",
      });
      const staleData = await stale.json();
      assert.ok(
        !stale.ok || staleData === null,
        "A logged-out token must not retain database access",
      );
    } finally {
      await db.auth.signOut({ scope: "local" });
    }
  });
}
