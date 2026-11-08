// Configuration discovery (contracts/cli.md "Discovery"): working directory only.
import { existsSync, statSync } from "node:fs";
import { extname, resolve } from "node:path";
import { CliError, ExitCode } from "../errors.js";
import { displayPath } from "../paths.js";

export const CONFIG_CANDIDATES = [
  "neshel.config.ts",
  "neshel.config.mts",
  "neshel.config.js",
  "neshel.config.mjs",
] as const;
const EXTENSIONS = [".ts", ".mts", ".js", ".mjs"];

const isFile = (path: string) => existsSync(path) && statSync(path).isFile();

/** Absolute path of the configuration file to load. */
export function discoverConfig(cwd: string, explicit?: string): string {
  if (explicit !== undefined) {
    const path = resolve(cwd, explicit);
    if (!EXTENSIONS.includes(extname(path).toLowerCase())) {
      throw new CliError(
        ExitCode.config,
        `${displayPath(path, cwd)}: unsupported extension; use .ts, .mts, .js or .mjs (ESM only).`,
      );
    }
    if (!isFile(path))
      throw new CliError(ExitCode.config, `${displayPath(path, cwd)} does not exist.`);
    return path;
  }
  const found = CONFIG_CANDIDATES.map((name) => resolve(cwd, name)).filter(isFile);
  if (found.length === 0) {
    throw new CliError(
      ExitCode.config,
      `No configuration found in the working directory. Searched: ${CONFIG_CANDIDATES.join(", ")}. Use --config <path> to point at one.`,
    );
  }
  if (found.length > 1) {
    throw new CliError(
      ExitCode.config,
      `Ambiguous configuration: ${found.map((path) => displayPath(path, cwd)).join(", ")}. Keep one file or pass --config.`,
    );
  }
  return found[0] as string;
}
