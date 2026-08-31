import { readFileSync } from "node:fs";
const required = readFileSync(
  new URL("../.node-version", import.meta.url),
  "utf8",
).trim();
if (process.versions.node !== required) {
  console.error(
    `Node ${required} is required; this command is running ${process.versions.node}. Activate the version in .node-version before running pnpm.`,
  );
  process.exit(1);
}
