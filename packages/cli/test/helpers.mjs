// Test helpers: temporary projects in paths with spaces and Unicode, and a spawned `neshel` bin.
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const bin = fileURLToPath(new URL("../dist/bin.js", import.meta.url));
const configPackage = fileURLToPath(new URL("../../config", import.meta.url));

/** Create a project directory; `files` maps relative paths to contents. */
export function project(files = {}, { linkConfig = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), "neshel cli ñ-"));
  const dir = join(root, "my app ñ");
  mkdirSync(dir, { recursive: true });
  for (const [path, contents] of Object.entries(files)) {
    const target = join(dir, ...path.split("/"));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, contents);
  }
  if (linkConfig) {
    const scope = join(dir, "node_modules", "@neshel-ui");
    mkdirSync(scope, { recursive: true });
    symlinkSync(configPackage, join(scope, "config"), "junction");
  }
  return {
    dir,
    path: (relative) => join(dir, ...relative.split("/")),
    cleanup: () => rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }),
  };
}

/** Run `neshel <args>` in `cwd`; returns { status, stdout, stderr }. */
export function neshel(args, cwd, env = {}) {
  const result = spawnSync(process.execPath, [bin, ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1", ...env },
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

export const config = (object) => `export default ${JSON.stringify(object, null, 2)};\n`;
