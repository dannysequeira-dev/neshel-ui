import { relative, sep } from "node:path";

/** A path relative to `cwd`, with "/" separators on every OS (for messages only). */
export function displayPath(path: string, cwd: string): string {
  const rel = relative(cwd, path) || ".";
  return sep === "\\" ? rel.split(sep).join("/") : rel;
}
