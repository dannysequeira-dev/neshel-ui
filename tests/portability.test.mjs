import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const script = (name) => fileURLToPath(new URL(`../scripts/${name}`, import.meta.url));

function temporary(testContext) {
  const directory = mkdtempSync(join(tmpdir(), "neshel spaces unicode-"));
  testContext.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

test("portable scripts do not require a shell-specific command", () => {
  const result = spawnSync(process.execPath, [script("check-portability.mjs")], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("CSS copy accepts paths with spaces and Unicode on every host", (t) => {
  const dir = temporary(t);
  const source = join(dir, "fuente á", "tokens base.css");
  const target = join(dir, "salida ñ", "styles final.css");
  mkdirSync(join(dir, "fuente á"), { recursive: true });
  writeFileSync(source, ":root { --neshel-primary: #663399; }\n", "utf8");
  const result = spawnSync(process.execPath, [script("copy-css.mjs"), source, target], {
    cwd: dir,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(readFileSync(target, "utf8"), readFileSync(source, "utf8"));
});

test("clean only deletes output within its own repository, regardless of cwd", (t) => {
  const dir = temporary(t);
  const fakeRepo = join(dir, "source repo");
  const scriptsDir = join(fakeRepo, "scripts");
  const localDist = join(fakeRepo, "packages", "config", "dist");
  const unrelatedDist = join(dir, "packages", "config", "dist");
  mkdirSync(scriptsDir, { recursive: true });
  mkdirSync(localDist, { recursive: true });
  mkdirSync(unrelatedDist, { recursive: true });
  copyFileSync(script("clean.mjs"), join(scriptsDir, "clean.mjs"));
  // file URL imports should work in an isolated directory even with spaces.
  writeFileSync(join(fakeRepo, "package.json"), '{"type":"module"}', "utf8");
  writeFileSync(join(localDist, "generated.txt"), "delete me", "utf8");
  writeFileSync(join(unrelatedDist, "keep.txt"), "keep me", "utf8");
  const result = spawnSync(process.execPath, [join(scriptsDir, "clean.mjs")], {
    cwd: dir,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(existsSync(localDist), false);
  assert.equal(existsSync(join(unrelatedDist, "keep.txt")), true);
});
