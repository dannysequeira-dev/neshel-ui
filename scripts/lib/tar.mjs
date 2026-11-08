import { gunzipSync } from "node:zlib";

const BLOCK = 512;

function field(header, start, length) {
  const bytes = header.subarray(start, start + length);
  const end = bytes.indexOf(0);
  return bytes.subarray(0, end === -1 ? length : end).toString("utf8");
}

/** Parse a pax extended header body: records of the form "<length> <key>=<value>\n". */
function parsePax(body) {
  const records = {};
  let position = 0;
  while (position < body.length) {
    const space = body.indexOf(0x20, position);
    if (space === -1) break;
    const length = Number.parseInt(body.subarray(position, space).toString("utf8"), 10);
    if (!Number.isFinite(length) || length <= 0) break;
    const record = body.subarray(space + 1, position + length - 1).toString("utf8");
    const equals = record.indexOf("=");
    if (equals > 0) records[record.slice(0, equals)] = record.slice(equals + 1);
    position += length;
  }
  return records;
}

/**
 * Read regular files from an uncompressed tar archive (ustar, pax `path`, GNU long names).
 * Returns a Map of archive path -> file contents. Directories and links are ignored.
 */
export function readTar(data) {
  const files = new Map();
  let offset = 0;
  let pendingPath;
  while (offset + BLOCK <= data.length) {
    const header = data.subarray(offset, offset + BLOCK);
    if (header.every((byte) => byte === 0)) break;
    const size = Number.parseInt(field(header, 124, 12).trim() || "0", 8);
    const type = field(header, 156, 1);
    const prefix = field(header, 345, 155);
    const name = prefix ? `${prefix}/${field(header, 0, 100)}` : field(header, 0, 100);
    const body = data.subarray(offset + BLOCK, offset + BLOCK + size);
    offset += BLOCK + Math.ceil(size / BLOCK) * BLOCK;

    if (type === "x") {
      pendingPath = parsePax(body).path ?? pendingPath;
      continue;
    }
    if (type === "L") {
      pendingPath = body.toString("utf8").replace(/\0+$/, "");
      continue;
    }
    if (type === "g") continue;
    const path = pendingPath ?? name;
    pendingPath = undefined;
    if (type === "" || type === "0" || type === "7") files.set(path, Buffer.from(body));
  }
  return files;
}

/** Read regular files from a gzip-compressed tarball (`.tgz`). */
export function readTarGz(buffer) {
  return readTar(gunzipSync(buffer));
}
