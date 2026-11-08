// node scripts/copy-css.mjs <source.css> <dist.css> [<source.css> <dist.css> ...]
import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const args = process.argv.slice(2);
if (args.length === 0 || args.length % 2 !== 0) {
  console.error("Usage: node scripts/copy-css.mjs <source.css> <dist.css> [...pairs]");
  process.exit(1);
}
for (let index = 0; index < args.length; index += 2) {
  const [from, to] = [args[index], args[index + 1]];
  await mkdir(dirname(resolve(to)), { recursive: true });
  await copyFile(resolve(from), resolve(to));
  console.info(`Copied ${from} -> ${to}`);
}
