import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import test from "node:test";

const moduleUrl = new URL("../scripts/lib/temp.mjs", import.meta.url).href;

/** Run a child script that creates a temp dir (prefix with spaces + Unicode) and prints it. */
function child(body) {
  const source = `import { createTempDir } from ${JSON.stringify(moduleUrl)};
const temp = createTempDir("neshel temp test ñ-"${body.includes("KEEP") ? ", { keep: true }" : ""});
console.log(temp.dir);
${body.replace("KEEP", "")}`;
  return spawnSync(process.execPath, ["--input-type=module", "-e", source], { encoding: "utf8" });
}

test("removes the directory on normal exit without an explicit dispose", () => {
  const result = child("");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(existsSync(result.stdout.trim()), false);
});

test("removes the directory when the process fails with an uncaught error", () => {
  const result = child('throw new Error("boom");');
  assert.notEqual(result.status, 0);
  assert.equal(existsSync(result.stdout.trim()), false);
});

test("dispose is idempotent", () => {
  const result = child("temp.dispose(); temp.dispose();");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(existsSync(result.stdout.trim()), false);
});

test("keep leaves the directory for debugging", () => {
  const result = child("KEEP");
  const dir = result.stdout.trim();
  assert.equal(existsSync(dir), true);
  rmSync(dir, { recursive: true, force: true });
});

test("SIGTERM removes the directory and exits with 143", {
  skip:
    process.platform === "win32" ? "POSIX signals are not delivered to handlers on Windows" : false,
}, async () => {
  const source = `import { createTempDir } from ${JSON.stringify(moduleUrl)};
const temp = createTempDir("neshel temp signal ñ-");
console.log(temp.dir);
setInterval(() => {}, 1000);`;
  const proc = spawn(process.execPath, ["--input-type=module", "-e", source]);
  const dir = await new Promise((resolve) =>
    proc.stdout.once("data", (d) => resolve(String(d).trim())),
  );
  assert.equal(existsSync(dir), true);
  const code = await new Promise((resolve) => {
    proc.once("exit", (exitCode) => resolve(exitCode));
    proc.kill("SIGTERM");
  });
  assert.equal(code, 143);
  assert.equal(existsSync(dir), false);
});
