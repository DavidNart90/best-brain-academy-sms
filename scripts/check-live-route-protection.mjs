import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

const baseUrl = new URL(
  process.env.SECURITY_CHECK_URL ?? "http://localhost:3000",
);
const root = process.cwd();
const appRoot = join(root, "src", "app");

function filesNamed(directory, name) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? filesNamed(path, name)
      : entry.name === name
        ? [path]
        : [];
  });
}

function urlPath(path, fileName) {
  const segments = relative(appRoot, path)
    .split(sep)
    .filter((segment) => segment !== fileName && !/^\(.*\)$/.test(segment))
    .map((segment) =>
      /^\[\.\.\..*\]$/.test(segment)
        ? "security-check"
        : /^\[.*\]$/.test(segment)
          ? "1"
          : segment,
    );
  return `/${segments.join("/")}`.replace(/\/$/, "") || "/";
}

async function request(path, init) {
  return fetch(new URL(path, baseUrl), { redirect: "manual", ...init });
}

const failures = [];
const protectedPages = filesNamed(appRoot, "page.tsx").filter((path) =>
  path.includes(`${sep}(protected)${sep}`),
);
for (const path of protectedPages) {
  const route = urlPath(path, "page.tsx");
  const response = await request(route);
  const location = response.headers.get("location");
  if (
    response.status < 300 ||
    response.status >= 400 ||
    !location ||
    new URL(location, baseUrl).pathname !== "/login"
  )
    failures.push(
      `${route}: expected unauthenticated redirect to /login, got ${response.status} ${location ?? "without Location"}`,
    );
}

const changePassword = await request("/change-password");
if (
  changePassword.status < 300 ||
  changePassword.status >= 400 ||
  new URL(changePassword.headers.get("location") ?? "/", baseUrl).pathname !==
    "/login"
)
  failures.push(
    "/change-password: expected unauthenticated redirect to /login",
  );

const publicApi = new Set([
  "/api/auth/login",
  "/api/auth/change-password",
  "/api/branding/logo",
]);
const apiRoutes = filesNamed(join(appRoot, "api"), "route.ts");
let protectedApiChecks = 0;
for (const path of apiRoutes) {
  const route = urlPath(path, "route.ts");
  if (publicApi.has(route)) continue;
  const source = readFileSync(path, "utf8");
  const methods = [...source.matchAll(/export async function (GET|POST)/g)].map(
    (match) => match[1],
  );
  for (const method of methods) {
    const response = await request(route, {
      method,
      headers:
        method === "POST"
          ? {
              "content-type": "application/json",
              origin: baseUrl.origin,
              "sec-fetch-site": "same-origin",
            }
          : undefined,
      body: method === "POST" ? "{}" : undefined,
    });
    protectedApiChecks += 1;
    if (response.status !== 401)
      failures.push(
        `${method} ${route}: expected unauthenticated 401, got ${response.status}`,
      );
  }
}

const crossOriginLogin = await request("/api/auth/login", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    origin: "https://attacker.example",
    "sec-fetch-site": "cross-site",
  },
  body: "{}",
});
if (crossOriginLogin.status !== 403)
  failures.push(
    `POST /api/auth/login: expected cross-origin 403, got ${crossOriginLogin.status}`,
  );

const oversizedLogin = await request("/api/auth/login", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    origin: baseUrl.origin,
    "sec-fetch-site": "same-origin",
  },
  body: JSON.stringify({ email: "x".repeat(4_096), password: "x" }),
});
if (oversizedLogin.status !== 413)
  failures.push(
    `POST /api/auth/login: expected oversized-body 413, got ${oversizedLogin.status}`,
  );

const login = await request("/login");
const policy = login.headers.get("content-security-policy") ?? "";
if (login.status !== 200)
  failures.push(`/login: expected 200, got ${login.status}`);
if (!policy.includes("'strict-dynamic'") || !policy.includes("'nonce-"))
  failures.push("/login: nonce Content-Security-Policy is missing");
if (login.headers.get("x-content-type-options") !== "nosniff")
  failures.push("/login: X-Content-Type-Options is missing");
if (login.headers.get("x-frame-options") !== "DENY")
  failures.push("/login: X-Frame-Options is missing");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(
  `Verified ${protectedPages.length + 1} protected pages, ${protectedApiChecks} protected API method(s), auth mutation defenses, and response security headers at ${baseUrl.origin}.`,
);
