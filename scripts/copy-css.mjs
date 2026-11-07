import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const [from, to] = process.argv.slice(2);
if (!from || !to) {
  console.error("Usage: node scripts/copy-css.mjs <source.css> <dist.css>");
  process.exit(1);
}
await mkdir(dirname(resolve(to)), { recursive: true });
await copyFile(resolve(from), resolve(to));
console.info(`Copied ${from} -> ${to}`);
