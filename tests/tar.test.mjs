import assert from "node:assert/strict";
import test from "node:test";
import { gzipSync } from "node:zlib";
import { readTar, readTarGz } from "../scripts/lib/tar.mjs";

/** Minimal tar writer for tests: one header block per entry, contents padded to 512 bytes. */
function entry(name, contents, type = "0") {
  const body = Buffer.from(contents, "utf8");
  const header = Buffer.alloc(512);
  header.write(name.slice(0, 100), 0, "utf8");
  header.write(body.length.toString(8).padStart(11, "0"), 124, "ascii");
  header.write(type, 156, "ascii");
  header.write("ustar\u000000", 257, "ascii");
  const padding = Buffer.alloc((512 - (body.length % 512)) % 512);
  return Buffer.concat([header, body, padding]);
}

function pax(path) {
  const record = (length) => `${length} path=${path}\n`;
  let length = Buffer.byteLength(record(0));
  while (Buffer.byteLength(record(length)) !== length) length = Buffer.byteLength(record(length));
  return entry("PaxHeader", record(length), "x");
}

const archive = (...entries) => Buffer.concat([...entries, Buffer.alloc(1024)]);

test("reads regular files and skips directories", () => {
  const files = readTar(
    archive(
      entry("package/", "", "5"),
      entry("package/package.json", '{"name":"x"}'),
      entry("package/dist/index.js", "export {};\n"),
    ),
  );
  assert.deepEqual([...files.keys()], ["package/package.json", "package/dist/index.js"]);
  assert.equal(files.get("package/dist/index.js").toString("utf8"), "export {};\n");
});

test("honours pax long paths with spaces and Unicode", () => {
  const long = `package/src/${"carpeta ñ/".repeat(12)}índice.ts`;
  const files = readTar(archive(pax(long), entry("truncated", "ok")));
  assert.deepEqual([...files.keys()], [long]);
});

test("reads gzip-compressed tarballs", () => {
  const files = readTarGz(gzipSync(archive(entry("package/README.md", "# hi\n"))));
  assert.equal(files.get("package/README.md").toString("utf8"), "# hi\n");
});
