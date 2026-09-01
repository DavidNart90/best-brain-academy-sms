import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.4";

type Invitation = {
  displayName: string;
  email: string;
  phone: string | null;
  role: "SUPER_ADMIN" | "ADMINISTRATOR" | "ACCOUNTANT" | "MANAGEMENT";
  status: "active" | "disabled";
  temporaryPassword: string;
};
type PreparedInvitation = Omit<Invitation, "temporaryPassword"> & {
  requestId: string;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

function isInvitation(value: unknown): value is Invitation {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.displayName === "string" &&
    typeof row.email === "string" &&
    typeof row.temporaryPassword === "string" &&
    row.temporaryPassword.length >= 12 &&
    row.temporaryPassword.length <= 128 &&
    /[a-z]/.test(row.temporaryPassword) &&
    /[A-Z]/.test(row.temporaryPassword) &&
    /[0-9]/.test(row.temporaryPassword) &&
    /[^A-Za-z0-9]/.test(row.temporaryPassword) &&
    (row.phone === null || typeof row.phone === "string") &&
    ["SUPER_ADMIN", "ADMINISTRATOR", "ACCOUNTANT", "MANAGEMENT"].includes(
      String(row.role),
    ) &&
    ["active", "disabled"].includes(String(row.status))
  );
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST")
    return json({ message: "Method not allowed." }, 405);

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer "))
    return json({ message: "A verified account is required." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !publishableKey || !serviceRoleKey)
    return json({ message: "Account service is not configured." }, 503);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ message: "Enter valid account details." }, 400);
  }
  const invitations = (payload as { invitations?: unknown })?.invitations;
  if (
    !Array.isArray(invitations) ||
    invitations.length < 1 ||
    invitations.length > 100 ||
    !invitations.every(isInvitation)
  )
    return json({ message: "Create between 1 and 100 valid accounts." }, 400);

  const caller = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: identityError } = await caller.auth.getUser(
    authorization.slice(7),
  );
  if (identityError)
    return json({ message: "Your session could not be verified." }, 401);

  const prepared = await caller.rpc("prepare_administrator_invitations", {
    payload: invitations.map((account) => ({
      displayName: account.displayName,
      email: account.email,
      phone: account.phone,
      role: account.role,
      status: account.status,
    })),
  });
  if (prepared.error)
    return json(
      {
        message:
          prepared.error.message || "The accounts could not be prepared.",
      },
      prepared.error.code === "42501" ? 403 : 400,
    );

  const requests = (prepared.data as { requests?: PreparedInvitation[] })
    ?.requests;
  if (!Array.isArray(requests))
    return json({ message: "The account batch could not be prepared." }, 500);

  const results: Array<{ email: string; ok: boolean; message: string }> = [];
  for (const row of requests) {
    const input = invitations.find(
      (candidate) => candidate.email === row.email,
    );
    if (!input) {
      results.push({
        email: row.email,
        ok: false,
        message: "Account details were not available.",
      });
      continue;
    }
    const created = await admin.auth.admin.createUser({
      email: row.email,
      password: input.temporaryPassword,
      email_confirm: true,
      user_metadata: { display_name: row.displayName, phone: row.phone },
    });
    if (created.error || !created.data.user) {
      await admin.rpc("finalize_administrator_invitation", {
        request_id: row.requestId,
        target_user_id: null,
        succeeded: false,
        error_message: created.error?.message ?? "Account provider failed.",
      });
      results.push({
        email: row.email,
        ok: false,
        message: "Account could not be created.",
      });
      continue;
    }

    const finalized = await admin.rpc("finalize_administrator_invitation", {
      request_id: row.requestId,
      target_user_id: created.data.user.id,
      succeeded: true,
      error_message: null,
    });
    if (finalized.error) {
      await admin.auth.admin.deleteUser(created.data.user.id);
      await admin.rpc("finalize_administrator_invitation", {
        request_id: row.requestId,
        target_user_id: null,
        succeeded: false,
        error_message: "Role setup failed.",
      });
    }
    results.push({
      email: row.email,
      ok: !finalized.error,
      message: finalized.error
        ? "Account created, but role setup needs administrator review."
        : "Account created.",
    });
  }

  const createdCount = results.filter((result) => result.ok).length;
  return json({
    createdCount,
    failedCount: results.length - createdCount,
    results,
    message:
      createdCount === results.length
        ? `${createdCount} account${createdCount === 1 ? "" : "s"} created.`
        : `${createdCount} created; ${results.length - createdCount} need review.`,
  });
});
