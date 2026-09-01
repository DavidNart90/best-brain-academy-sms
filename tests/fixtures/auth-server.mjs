// LOCAL TEST DOUBLE ONLY. It is never imported by src/ or deployed with the app.
// Auth/UI boundary evidence from this server is not Supabase or RLS evidence.
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

const port = 54329;
const sessions = new Map();
const permissions = [
  "dashboard.read",
  "admissions.read",
  "students.read",
  "classes.read",
  "staff.read",
  "financials.read",
  "reports.read",
  "administrators.manage",
  "settings.manage",
];
const profiles = {
  super: { role: "SUPER_ADMIN", permissions },
  manager: {
    role: "MANAGEMENT",
    permissions: ["dashboard.read", "financials.read", "reports.read"],
  },
  admin: {
    role: "ADMINISTRATOR",
    permissions: [
      "dashboard.read",
      "admissions.read",
      "students.read",
      "classes.read",
      "staff.read",
      "reports.read",
    ],
  },
  disabled: { role: "MANAGEMENT", permissions: [] },
  unassigned: { role: null, permissions: [] },
};
const json = (response, status, data) => {
  response.writeHead(status, {
    "content-type": "application/json",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(data));
};
const user = (session) => ({
  id: session.id,
  aud: "authenticated",
  role: "authenticated",
  email: session.email,
  email_confirmed_at: "2026-08-01T00:00:00Z",
  created_at: "2026-08-01T00:00:00Z",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: { display_name: session.displayName },
});
const server = createServer(async (request, response) => {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 16384) return json(response, 413, { error: "too_large" });
  }
  const url = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);
  const token = request.headers.authorization?.replace(/^Bearer /, "");
  const session = sessions.get(token);
  if (url.pathname === "/health")
    return json(response, 200, { service: "synthetic-auth-fixture-only" });
  if (url.pathname === "/auth/v1/token") {
    const data = JSON.parse(body || "{}");
    if (url.searchParams.get("grant_type") === "refresh_token") {
      const previous = [...sessions.entries()].find(
        ([, entry]) => entry.refreshToken === data.refresh_token,
      );
      if (!previous)
        return json(response, 400, {
          code: "refresh_token_not_found",
          msg: "Invalid refresh token",
        });
      return json(response, 200, {
        access_token: previous[0],
        refresh_token: previous[1].refreshToken,
        token_type: "bearer",
        expires_in: 3600,
        user: user(previous[1]),
      });
    }
    const actor = data.email?.split("@")[0];
    const profile = profiles[actor];
    if (actor === "limited")
      return json(response, 429, {
        code: "over_request_rate_limit",
        msg: "Too many requests",
      });
    if (!profile || data.password !== "Synthetic-test-only-123!")
      return json(response, 400, {
        code: "invalid_credentials",
        msg: "Invalid login credentials",
      });
    const id = randomUUID();
    const sid = randomUUID();
    const payload = {
      sub: id,
      aud: "authenticated",
      role: "authenticated",
      email: data.email,
      session_id: sid,
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    };
    const accessToken = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.synthetic-signature-not-for-production`;
    const entry = {
      id,
      email: data.email,
      displayName: `Demo ${actor}`,
      status: actor === "disabled" ? "disabled" : "active",
      roles: profile.role ? [profile.role] : [],
      permissions: profile.permissions,
      refreshToken: randomUUID(),
    };
    sessions.set(accessToken, entry);
    return json(response, 200, {
      access_token: accessToken,
      refresh_token: entry.refreshToken,
      token_type: "bearer",
      expires_in: 3600,
      user: user(entry),
    });
  }
  if (url.pathname === "/control" && request.method === "POST") {
    const command = JSON.parse(body || "{}");
    for (const [accessToken, entry] of sessions) {
      if (entry.email === command.email) {
        if (command.action === "revoke") sessions.delete(accessToken);
        if (command.action === "disable") entry.status = "disabled";
        if (command.action === "remove-permissions") entry.permissions = [];
        if (command.action === "fail-access") entry.failAccess = true;
      }
    }
    return json(response, 200, { ok: true });
  }
  if (!session)
    return json(response, 401, { code: "bad_jwt", msg: "Session not found" });
  if (url.pathname === "/auth/v1/user")
    return json(response, 200, user(session));
  if (url.pathname === "/auth/v1/logout") {
    sessions.delete(token);
    return json(response, 200, {});
  }
  if (url.pathname === "/rest/v1/rpc/get_access_context")
    if (session.failAccess)
      return json(response, 503, { message: "Synthetic service failure" });
  if (url.pathname === "/rest/v1/rpc/get_access_context")
    return json(response, 200, {
      id: session.id,
      displayName: session.displayName,
      status: session.status,
      roles: session.roles,
      permissions: session.permissions,
    });
  return json(response, 404, { error: "fixture_endpoint_not_implemented" });
});
server.listen(port, "127.0.0.1", () =>
  console.log(`Synthetic Auth fixture listening on loopback:${port}`),
);
