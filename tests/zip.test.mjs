// Deterministic starter archives (feature 006, research R9).
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { createTempDir } from "../scripts/lib/temp.mjs";
import { collectFiles, readZip, writeZip, zipDirectory } from "../scripts/lib/zip.mjs";

test("writeZip/readZip round trip with UTF-8 names and binary data", () => {
  const entries = [
    { name: "b/ñandú.txt", data: Buffer.from("hola\n", "utf8") },
    { name: "a.bin", data: Buffer.from([0, 1, 2, 255]) },
  ];
  const zip = writeZip(entries);
  const read = readZip(zip);
  assert.deepEqual(
    read.map((e) => e.name),
    ["a.bin", "b/ñandú.txt"],
  );
  assert.deepEqual([...read[0].data], [0, 1, 2, 255]);
  assert.equal(read[1].data.toString("utf8"), "hola\n");
});

test("zipDirectory is deterministic, sorted, LF-normalised and honours exclusions", () => {
  const temp = createTempDir("neshel zip ñ-");
  try {
    const root = join(temp.dir, "starter with space");
    mkdirSync(join(root, "src"), { recursive: true });
    mkdirSync(join(root, "node_modules", "x"), { recursive: true });
    writeFileSync(join(root, "src", "App.tsx"), "a\r\nb\r\n");
    writeFileSync(join(root, "package.json"), "{}\n");
    writeFileSync(join(root, "node_modules", "x", "index.js"), "ignored");
    const exclude = [/(^|\/)node_modules(\/|$)/];
    assert.deepEqual(collectFiles(root, { exclude }), ["package.json", "src/App.tsx"]);
    const first = zipDirectory(root, "starter", { exclude });
    const second = zipDirectory(root, "starter", { exclude });
    assert.ok(first.equals(second), "two archives of the same tree differ");
    const app = readZip(first).find((e) => e.name === "starter/src/App.tsx");
    assert.equal(app.data.toString("utf8"), "a\nb\n");
  } finally {
    temp.dispose();
  }
});

test("readZip rejects unsafe paths", () => {
  const zip = writeZip([{ name: "../evil.txt", data: Buffer.from("x") }]);
  assert.throws(() => readZip(zip), /unsafe path/);
});
