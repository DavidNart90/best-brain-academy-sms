// LOCAL TEST DOUBLE ONLY. It is never imported by src/ or deployed with the app.
// Auth/UI boundary evidence from this server is not Supabase or RLS evidence.
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

const port = Number(process.env.SYNTHETIC_AUTH_PORT ?? 54329);
const sessions = new Map();
const permissions = [
  "dashboard.read",
  "admissions.read",
  "students.read",
  "students.manage",
  "students.import",
  "students.export",
  "classes.read",
  "staff.read",
  "financials.read",
  "reports.read",
  "administrators.manage",
  "settings.manage",
  "audit.read",
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
      "students.manage",
      "students.import",
      "students.export",
      "classes.read",
      "staff.read",
      "reports.read",
    ],
  },
  disabled: { role: "MANAGEMENT", permissions: [] },
  unassigned: { role: null, permissions: [] },
};
const timestamp = "2026-09-01T11:15:19.000Z";
const academicYears = [
  {
    id: 1,
    name: "2026/2027",
    short_name: "26/27",
    starts_on: "2026-09-01",
    ends_on: "2027-08-31",
    is_current: true,
    status: "active",
    created_by: null,
    updated_by: null,
    created_at: timestamp,
    updated_at: timestamp,
  },
];
const academicTerms = [
  {
    id: 1,
    academic_year_id: 1,
    name: "Term 1",
    sequence: 1,
    starts_on: "2026-09-08",
    ends_on: "2026-12-07",
    is_current: true,
    status: "active",
    created_by: null,
    updated_by: null,
    created_at: timestamp,
    updated_at: timestamp,
  },
  ...[2, 3].map((sequence) => ({
    id: sequence,
    academic_year_id: 1,
    name: `Term ${sequence}`,
    sequence,
    starts_on: null,
    ends_on: null,
    is_current: false,
    status: "active",
    created_by: null,
    updated_by: null,
    created_at: timestamp,
    updated_at: timestamp,
  })),
];
const schoolClasses = [
  ["NUR1", "Nursery 1", "early_years"],
  ["NUR2", "Nursery 2", "early_years"],
  ["KG1", "KG 1", "early_years"],
  ["KG2", "KG 2", "early_years"],
  ["BAS1", "Basic 1", "lower_basic"],
  ["BAS2", "Basic 2", "lower_basic"],
  ["BAS3", "Basic 3", "lower_basic"],
  ["BAS4", "Basic 4", "upper_basic"],
  ["BAS5", "Basic 5", "upper_basic"],
  ["BAS6", "Basic 6", "upper_basic"],
  ["JHS1", "JHS 1", "jhs"],
  ["JHS2", "JHS 2", "jhs"],
  ["JHS3", "JHS 3", "jhs"],
].map(([code, name, class_group], index) => ({
  id: index + 1,
  code,
  name,
  class_group,
  sort_order: (index + 1) * 10,
  status: "active",
  created_by: null,
  updated_by: null,
  created_at: timestamp,
  updated_at: timestamp,
}));
const locations = [
  ["OSENASE_AKWADUM", "Osenase & Akwadum"],
  ["ASUOFORI", "Asuofori"],
  ["KOBRISO_ABAASE", "Kobriso & Abaase"],
  ["ANOMAA_KOJO", "Anomaa Kojo"],
  ["BAMENASE", "Bamenase"],
].map(([code, name], index) => ({
  id: index + 1,
  code,
  name,
  sort_order: (index + 1) * 10,
  status: "active",
  created_by: null,
  updated_by: null,
  created_at: timestamp,
  updated_at: timestamp,
}));
const schoolSettings = {
  id: 1,
  school_name: "Best Brain Academy",
  short_name: "BBA",
  address: null,
  phone: null,
  email: null,
  motto: "SERVICE WITH DILIGENCE",
  location_charge_label: "Location / Transport",
  created_by: null,
  updated_by: null,
  created_at: timestamp,
  updated_at: timestamp,
};
const auditLogs = [
  {
    id: 1,
    actor_user_id: null,
    action: "insert",
    entity_type: "academic_years",
    entity_id: "1",
    old_values: null,
    new_values: academicYears[0],
    created_at: timestamp,
  },
];
const students = [];
const studentDirectory = [];
const json = (response, status, data) => {
  response.writeHead(status, {
    "content-type": "application/json",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(data));
};
const restJson = (request, response, rows) => {
  const wantsObject = request.headers.accept?.includes(
    "application/vnd.pgrst.object+json",
  );
  const data = wantsObject ? rows[0] : rows;
  const payload = JSON.stringify(data);
  response.writeHead(200, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(payload),
    "content-range": `0-${Math.max(0, rows.length - 1)}/${rows.length}`,
    "cache-control": "no-store",
  });
  if (request.method === "HEAD") return response.end();
  response.end(payload);
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
    console.error(
      "DEBUG token request",
      JSON.stringify(data),
      "search",
      url.search,
    );
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
      mustChangePassword: false,
      roles: session.roles,
      permissions: session.permissions,
    });
  if (url.pathname === "/rest/v1/rpc/set_current_academic_context") {
    if (!session.permissions.includes("settings.manage"))
      return json(response, 403, { code: "42501", message: "Denied" });
    const data = JSON.parse(body || "{}");
    for (const year of academicYears)
      year.is_current = year.id === data.target_year_id;
    for (const term of academicTerms)
      term.is_current = term.id === data.target_term_id;
    response.writeHead(204, { "cache-control": "no-store" });
    return response.end();
  }
  const restTables = {
    academic_years: academicYears,
    academic_terms: academicTerms,
    classes: schoolClasses,
    school_locations: locations,
    school_settings: [schoolSettings],
    audit_logs: auditLogs,
    students,
    student_directory: studentDirectory,
  };
  const tableName = url.pathname.startsWith("/rest/v1/")
    ? url.pathname.slice("/rest/v1/".length)
    : null;
  const table = tableName ? restTables[tableName] : null;
  if (table) {
    if (
      tableName === "audit_logs" &&
      !session.permissions.includes("audit.read")
    )
      return json(response, 403, { code: "42501", message: "Denied" });
    if (request.method === "GET" || request.method === "HEAD") {
      let rows = [...table];
      for (const [key, value] of url.searchParams) {
        if (key === "status" && value.startsWith("eq."))
          rows = rows.filter((row) => row.status === value.slice(3));
        if (key === "id" && value.startsWith("eq."))
          rows = rows.filter((row) => row.id === Number(value.slice(3)));
        if (key === "name" && value.startsWith("ilike.")) {
          const query = value
            .slice(6)
            .replaceAll("*", "")
            .replaceAll("%", "")
            .toLowerCase();
          rows = rows.filter((row) => row.name?.toLowerCase().includes(query));
        }
      }
      return restJson(request, response, rows);
    }
    if (!session.permissions.includes("settings.manage"))
      return json(response, 403, { code: "42501", message: "Denied" });
    const data = JSON.parse(body || "{}");
    if (request.method === "POST") {
      const next = {
        ...data,
        id: Math.max(0, ...table.map((row) => row.id)) + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      table.push(next);
      response.writeHead(201, { "cache-control": "no-store" });
      return response.end();
    }
    if (request.method === "PATCH") {
      const id = Number(url.searchParams.get("id")?.replace("eq.", ""));
      const row = table.find((item) => item.id === id);
      if (row)
        Object.assign(row, data, { updated_at: new Date().toISOString() });
      response.writeHead(204, { "cache-control": "no-store" });
      return response.end();
    }
  }
  return json(response, 404, { error: "fixture_endpoint_not_implemented" });
});
server.listen(port, "127.0.0.1", () =>
  console.log(`Synthetic Auth fixture listening on loopback:${port}`),
);
