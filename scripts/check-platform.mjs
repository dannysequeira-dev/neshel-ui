import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (relative) =>
  readFileSync(fileURLToPath(new URL(`../${relative}`, import.meta.url)), "utf8");
const rootPackage = JSON.parse(read("package.json"));
// .nvmrc is the single source of the recommended development major (D1, research R17).
const recommendedMajor = Number.parseInt(read(".nvmrc").trim(), 10);
const [major, minor] = process.versions.node.split(".").map(Number);

console.info(`Neshel-UI environment`);
console.info(`  OS: ${process.platform} (${process.arch})`);
console.info(`  Node.js: ${process.version} (recommended for development: ${recommendedMajor})`);
console.info(`  pnpm expected: ${rootPackage.packageManager}`);
console.info(`  Workspace: ${fileURLToPath(new URL("../", import.meta.url))}`);

if (major < 22 || (major === 22 && minor < 13)) {
  console.error("Node.js 22.13 or newer is required.");
  process.exitCode = 1;
} else if (major !== recommendedMajor) {
  // Supported, not an error: CI also verifies Node 22 and 24 on Linux.
  console.info(`  Note: Node ${major} is supported; Node ${recommendedMajor} is the primary line.`);
}
