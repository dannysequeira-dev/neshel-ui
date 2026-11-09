// Deterministic ZIP archives (feature 006, research R9): sorted entries, fixed timestamps
// (1980-01-01 00:00), LF-normalised text, deflate level 9, no extra fields, no absolute paths.
// Node standard library only. readZip() reads archives written by writeZip() (and simple
// stored/deflated archives in general) for verification.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { crc32, deflateRawSync, inflateRawSync } from "node:zlib";

const TEXT = /\.(?:[cm]?[jt]sx?|json|css|html|md|txt|ya?ml|gitignore|svg)$|(?:^|\/)\.gitignore$/i;
const DOS_TIME = 0; // 00:00:00
const DOS_DATE = (0 << 9) | (1 << 5) | 1; // 1980-01-01

/** Files under `root` (posix relative paths), sorted, skipping excluded directories/files. */
export function collectFiles(root, { exclude = [] } = {}) {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      const rel = relative(root, path).split(sep).join("/");
      if (exclude.some((pattern) => pattern.test(rel))) continue;
      if (entry.isDirectory()) walk(path);
      else if (statSync(path).isFile()) out.push(rel);
    }
  };
  walk(root);
  return out.sort();
}

/** Content of a file as stored in the archive (text normalised to LF). */
export function archiveContent(root, rel) {
  const data = readFileSync(join(root, rel));
  return TEXT.test(rel) ? Buffer.from(data.toString("utf8").replace(/\r\n/g, "\n"), "utf8") : data;
}

/** Build a ZIP buffer from [{ name, data }] entries (names are used as given, posix). */
export function writeZip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const { name, data } of [...entries].sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const nameBuf = Buffer.from(name, "utf8");
    const compressed = deflateRawSync(data, { level: 9 });
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, nameBuf, compressed);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4); // version made by
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(DOS_TIME, 12);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(0, 38); // external attributes
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);
    offset += local.length + nameBuf.length + compressed.length;
  }
  const centralSize = centrals.reduce((n, b) => n + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, end]);
}

/** Archive a directory under a top-level folder name. */
export function zipDirectory(root, folder, options) {
  const entries = collectFiles(root, options).map((rel) => ({
    name: `${folder}/${rel}`,
    data: archiveContent(root, rel),
  }));
  return writeZip(entries);
}

/** Read entries { name, data } from a ZIP buffer (stored or deflated, no ZIP64). */
export function readZip(buffer) {
  const endOffset = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (endOffset < 0) throw new Error("not a ZIP archive (no end of central directory)");
  const count = buffer.readUInt16LE(endOffset + 10);
  let pointer = buffer.readUInt32LE(endOffset + 16);
  const entries = [];
  for (let i = 0; i < count; i++) {
    if (buffer.readUInt32LE(pointer) !== 0x02014b50) throw new Error("corrupt central directory");
    const method = buffer.readUInt16LE(pointer + 10);
    const crc = buffer.readUInt32LE(pointer + 16);
    const size = buffer.readUInt32LE(pointer + 20);
    const nameLength = buffer.readUInt16LE(pointer + 28);
    const extraLength = buffer.readUInt16LE(pointer + 30);
    const commentLength = buffer.readUInt16LE(pointer + 32);
    const localOffset = buffer.readUInt32LE(pointer + 42);
    const name = buffer.toString("utf8", pointer + 46, pointer + 46 + nameLength);
    const localName = buffer.readUInt16LE(localOffset + 26);
    const localExtra = buffer.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + localName + localExtra;
    const raw = buffer.subarray(start, start + size);
    const data = method === 8 ? inflateRawSync(raw) : Buffer.from(raw);
    if (crc32(data) !== crc) throw new Error(`CRC mismatch for ${name}`);
    if (name.startsWith("/") || name.split("/").includes(".."))
      throw new Error(`unsafe path ${name}`);
    entries.push({ name, data });
    pointer += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}
