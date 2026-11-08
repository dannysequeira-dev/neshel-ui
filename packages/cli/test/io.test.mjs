// writeIfChanged with injected file-system failures (FR-025).
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import * as fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { writeIfChanged } from "../dist/output.js";

function workspace(t) {
  const dir = mkdtempSync(join(tmpdir(), "neshel io ñ-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

const failing = (code, times = Number.POSITIVE_INFINITY) => {
  let calls = 0;
  return {
    ...fs,
    rename: async (...args) => {
      calls++;
      if (calls <= times) throw Object.assign(new Error(`${code} injected`), { code });
      return fs.rename(...args);
    },
    get calls() {
      return calls;
    },
  };
};

test("a permanent rename failure keeps the previous file and removes the temporary file", async (t) => {
  const dir = workspace(t);
  const target = join(dir, "out.css");
  writeFileSync(target, "previous\n");
  const injected = failing("EXDEV");
  await assert.rejects(writeIfChanged(target, "next\n", injected), /EXDEV injected/);
  assert.equal(readFileSync(target, "utf8"), "previous\n");
  assert.deepEqual(readdirSync(dir), ["out.css"]);
  assert.equal(injected.calls, 1, "non-transient errors are not retried");
});

test("transient Windows lock errors are retried", async (t) => {
  const dir = workspace(t);
  const target = join(dir, "out.css");
  const injected = failing("EBUSY", 2);
  assert.equal(await writeIfChanged(target, "content\n", injected), "written");
  assert.equal(readFileSync(target, "utf8"), "content\n");
  assert.equal(injected.calls, 3);
});

test("persistent lock errors give up after retries", async (t) => {
  const dir = workspace(t);
  const injected = failing("EPERM");
  await assert.rejects(writeIfChanged(join(dir, "out.css"), "x", injected), /EPERM/);
  assert.equal(injected.calls, 6);
  assert.deepEqual(readdirSync(dir), []);
});

test("identical content is not rewritten", async (t) => {
  const dir = workspace(t);
  const target = join(dir, "out.css");
  writeFileSync(target, "same");
  const injected = failing("EPERM");
  assert.equal(await writeIfChanged(target, "same", injected), "unchanged");
  assert.equal(injected.calls, 0);
});
