// Loads neshel.config.* with jiti (ADR 0007, D4). The file is executable, trusted project code:
// it runs with the user's privileges, like vite.config.ts. No sandbox is provided or claimed.
import { pathToFileURL } from "node:url";
import { createJiti } from "jiti";
import { CliError, ExitCode } from "../errors.js";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function kind(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "function") return "a function";
  if (typeof (value as { then?: unknown }).then === "function") return "a promise";
  if (Array.isArray(value)) return "an array";
  return typeof value === "object" ? "a non-plain object" : `a ${typeof value}`;
}

/** Import the configuration file and return its default export (a plain object). */
export async function loadConfig(file: string, label: string): Promise<Record<string, unknown>> {
  // fsCache/moduleCache off: nothing is written to disk and repeated runs see fresh code.
  const jiti = createJiti(pathToFileURL(file).href, { fsCache: false, moduleCache: false });
  let module: unknown;
  try {
    module = await jiti.import(file);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new CliError(ExitCode.config, `Failed to load ${label}: ${message}`, { cause: error });
  }
  const exports = module as Record<string, unknown> | undefined;
  if (!exports || !Object.hasOwn(exports, "default")) {
    throw new CliError(
      ExitCode.config,
      `${label} has no default export. Export the configuration: export default defineConfig({ … }).`,
    );
  }
  const value = exports.default;
  if (!isPlainObject(value)) {
    throw new CliError(
      ExitCode.config,
      `${label}: the default export must be a plain object; received ${kind(value)}.`,
    );
  }
  return value;
}
