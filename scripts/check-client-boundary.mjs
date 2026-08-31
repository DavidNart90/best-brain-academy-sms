import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
const forbidden = [
  "create_pending_profile",
  "SUPABASE_SERVICE_ROLE_KEY",
  "sb_secret_",
  "private.has_valid_session",
  "get_access_context",
];
let files = 0;
let bytes = 0;
async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await scan(path);
    else if (entry.name.endsWith(".js")) {
      const source = await readFile(path, "utf8");
      files++;
      bytes += Buffer.byteLength(source);
      for (const marker of forbidden) {
        if (source.includes(marker))
          throw new Error(`Server boundary marker found in ${path}: ${marker}`);
      }
    }
  }
}
await scan(".next/static");
if (!files)
  throw new Error("No production client chunks found; run pnpm build first.");
console.log(
  `Checked ${files} client JavaScript chunks (${bytes} uncompressed bytes across all routes). No forbidden server implementation/key markers. This is not a complete secret scanner.`,
);
