import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

const root = process.cwd();

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

function repoPath(path) {
  return relative(root, path).split(sep).join("/");
}

const failures = [];
const pages = filesNamed(join(root, "src", "app"), "page.tsx");
for (const path of pages) {
  const file = repoPath(path);
  const source = readFileSync(path, "utf8");
  if (
    file.includes("src/app/(protected)/") &&
    !source.includes("requirePermission(")
  )
    failures.push(`${file}: protected page has no explicit permission check`);
}

const publicApi = new Set([
  "src/app/api/auth/login/route.ts",
  "src/app/api/auth/change-password/route.ts",
  "src/app/api/branding/logo/route.ts",
]);
const apiRoutes = filesNamed(join(root, "src", "app", "api"), "route.ts");
for (const path of apiRoutes) {
  const file = repoPath(path);
  const source = readFileSync(path, "utf8");
  if (
    !publicApi.has(file) &&
    !source.includes("guardApiRequest(") &&
    !source.includes("getAccessContext(")
  )
    failures.push(`${file}: API route has no explicit access guard`);
  if (
    source.includes("export async function POST") &&
    !source.includes("isTrustedMutationRequest(")
  )
    failures.push(`${file}: POST route has no explicit mutation-origin check`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(
  `Verified ${pages.length} page routes and ${apiRoutes.length} API route files against the explicit security allowlist.`,
);
