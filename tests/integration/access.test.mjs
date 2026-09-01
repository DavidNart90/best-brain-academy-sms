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
  assert.ok((await db.from("academic_years").select("id").limit(1)).error);
  assert.ok((await db.from("students").select("id").limit(1)).error);
  assert.ok((await db.from("student_directory").select("id").limit(1)).error);
  assert.ok((await db.rpc("create_student", { payload: {} })).error);
  assert.ok(
    (
      await db.rpc("change_student_enrollment", {
        target_student_id: 1,
        payload: {},
      })
    ).error,
  );
  assert.ok(
    (
      await db.rpc("link_student_guardian", {
        target_student_id: 1,
        payload: {},
      })
    ).error,
  );
  assert.ok((await db.rpc("get_access_context")).error);
  assert.ok(
    (
      await db.storage
        .from("student-photos")
        .upload(
          "1/00000000-0000-0000-0000-000000000000.jpg",
          new Uint8Array([1]),
          {
            contentType: "image/jpeg",
          },
        )
    ).error,
  );
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
        for (const permission of [
          "students.manage",
          "students.import",
          "students.export",
        ])
          assert.ok(context.data.permissions.includes(permission));
        const students = await db
          .from("student_directory")
          .select("id")
          .limit(1);
        assert.equal(students.error, null);
        assert.ok(
          (
            await db.storage
              .from("student-photos")
              .upload(
                "999999/00000000-0000-0000-0000-000000000000.jpg",
                new Uint8Array([1]),
                { contentType: "image/jpeg" },
              )
          ).error,
          "Photo uploads must target an existing student folder",
        );
        assert.ok(
          (
            await db.from("students").insert({
              admission_number: "BBA/TEST/DIRECT",
              first_name: "Direct",
              last_name: "Write",
              gender: "female",
              admission_date: "2026-09-01",
              has_disability: false,
              religious_denomination: "Synthetic test",
              status: "active",
              created_by: data.user.id,
              updated_by: data.user.id,
            })
          ).error,
          "Authorized users must use the transactional student RPC, not direct table writes",
        );
        assert.ok(
          (
            await db
              .from("students")
              .update({ photo_path: "1/direct.jpg" })
              .eq("id", 1)
          ).error,
          "Student photos must be attached through the authorized workflow",
        );
        assert.ok(
          (await db.rpc("import_students", { payload: [] })).error,
          "The import RPC rejects an empty batch",
        );
        const academicYears = await db
          .from("academic_years")
          .select("id,name,is_current")
          .limit(25);
        assert.equal(academicYears.error, null);
        assert.equal(academicYears.data.length, 1);
        assert.equal(academicYears.data[0].name, "2026/2027");
        const duplicate = await db.from("academic_years").insert({
          name: "2026/2027",
          short_name: "26/27",
          starts_on: "2026-09-01",
          ends_on: "2027-08-31",
        });
        assert.equal(
          duplicate.error?.code,
          "23505",
          "Authorized writes must still reach database uniqueness constraints",
        );
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
      if (actor !== "ALLOWED") {
        const students = await db.from("student_directory").select("id");
        assert.equal(students.error, null);
        assert.equal(students.data.length, 0);
        assert.ok(
          (await db.rpc("create_student", { payload: {} })).error,
          "Inactive or unassigned accounts cannot call student write RPCs",
        );
        assert.ok(
          (
            await db.storage
              .from("student-photos")
              .upload(
                "1/00000000-0000-0000-0000-000000000000.jpg",
                new Uint8Array([1]),
                { contentType: "image/jpeg" },
              )
          ).error,
          "Inactive or unassigned accounts cannot upload student photos",
        );
        assert.ok(
          (
            await db.rpc("set_student_photo", {
              target_student_id: 1,
              target_photo_path: "1/00000000-0000-0000-0000-000000000000.jpg",
            })
          ).error,
          "Unassigned or disabled accounts cannot attach student photos",
        );
        const academicYears = await db.from("academic_years").select("id");
        assert.equal(academicYears.error, null);
        assert.equal(academicYears.data.length, 0);
        assert.ok(
          (
            await db.from("academic_years").insert({
              name: "2099/2100",
              short_name: "99/00",
              starts_on: "2099-09-01",
              ends_on: "2100-08-31",
            })
          ).error,
          "Inactive or unassigned accounts cannot create academic configuration",
        );
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
