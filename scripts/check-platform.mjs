import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const rootPackage = JSON.parse(
  readFileSync(fileURLToPath(new URL("../package.json", import.meta.url)), "utf8"),
);
const [major, minor] = process.versions.node.split(".").map(Number);

console.info(`Neshel-UI environment`);
console.info(`  OS: ${process.platform} (${process.arch})`);
console.info(`  Node.js: ${process.version}`);
console.info(`  pnpm expected: ${rootPackage.packageManager}`);
console.info(`  Workspace: ${fileURLToPath(new URL("../", import.meta.url))}`);

if (major < 22 || (major === 22 && minor < 13)) {
  console.error("Node.js 22.13 or newer is required.");
  process.exitCode = 1;
}
