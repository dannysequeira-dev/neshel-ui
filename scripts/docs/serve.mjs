// pnpm docs:preview — serve the exported documentation site (apps/docs/out) locally.
// Usage: node scripts/docs/serve.mjs <dir> [--port 3000] [--base /neshel-ui]
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { startStaticServer } from "../lib/static-server.mjs";

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
};
const root = resolve(
  args.find(
    (arg) => !arg.startsWith("--") && args[args.indexOf(arg) - 1]?.startsWith("--") !== true,
  ) ?? "apps/docs/out",
);
if (!existsSync(root)) {
  console.error(`docs:preview: ${root} does not exist — run pnpm docs:build first`);
  process.exit(1);
}
const basePath = option("--base", process.env.NESHEL_DOCS_BASE_PATH ?? "").replace(/\/+$/, "");
const server = await startStaticServer(root, { basePath, port: Number(option("--port", "3000")) });
console.info(`docs:preview serving ${root} at ${server.url("/")} (Ctrl+C to stop)`);
