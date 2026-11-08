// Output path resolution and atomic, idempotent writes (contracts/cli.md "Output").
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import * as nodeFs from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { outputProblem } from "./validate/structure.js";

export const DEFAULT_OUTPUT = "neshel.generated.css";

export interface OutputTarget {
  readonly path: string;
  /** Where the path came from: `--out`, the config's `output`, or the default. */
  readonly source: "flag" | "config" | "default";
}

/** `--out` (cwd-relative) › config `output` (config-dir-relative) › default next to the config. */
export function resolveOutput(options: {
  cwd: string;
  configFile: string;
  flag?: string;
  configOutput?: string;
}): OutputTarget {
  if (options.flag !== undefined)
    return { path: resolve(options.cwd, options.flag), source: "flag" };
  const base = dirname(options.configFile);
  if (options.configOutput !== undefined) {
    return { path: resolve(base, options.configOutput), source: "config" };
  }
  return { path: join(base, DEFAULT_OUTPUT), source: "default" };
}

/** File-system-aware rejection reason for a resolved target, or undefined when acceptable. */
export function targetProblem(target: OutputTarget, configFile: string): string | undefined {
  const problem = outputProblem(target.path);
  if (problem) return problem;
  if (resolve(target.path) === resolve(configFile))
    return "The output must not be the configuration file";
  if (existsSync(target.path) && statSync(target.path).isDirectory()) {
    return "The output path is an existing directory";
  }
  return undefined;
}

/** "missing" | "unchanged" | "stale" relative to the desired content. */
export function compareOutput(path: string, content: string): "missing" | "unchanged" | "stale" {
  if (!existsSync(path)) return "missing";
  return readFileSync(path, "utf8") === content ? "unchanged" : "stale";
}

export interface WriteFs {
  mkdir: typeof nodeFs.mkdir;
  writeFile: typeof nodeFs.writeFile;
  rename: typeof nodeFs.rename;
  rm: typeof nodeFs.rm;
}

const RETRYABLE = new Set(["EPERM", "EBUSY", "EACCES"]);
const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

/**
 * Write `content` to `path` unless it is already identical. Writes a temporary sibling and renames
 * it over the target (atomic on the same volume); retries transient Windows lock errors. On
 * failure the temporary file is removed and the previous target is left untouched.
 */
export async function writeIfChanged(
  path: string,
  content: string,
  fs: WriteFs = nodeFs,
): Promise<"written" | "unchanged"> {
  if (compareOutput(path, content) === "unchanged") return "unchanged";
  await fs.mkdir(dirname(path), { recursive: true });
  const temporary = join(
    dirname(path),
    `${basename(path)}.${process.pid}-${randomBytes(4).toString("hex")}.tmp`,
  );
  try {
    await fs.writeFile(temporary, content, "utf8");
    for (let attempt = 0; ; attempt++) {
      try {
        await fs.rename(temporary, path);
        return "written";
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code ?? "";
        if (attempt >= 5 || !RETRYABLE.has(code)) throw error;
        await sleep(25 * 2 ** attempt);
      }
    }
  } catch (error) {
    await fs.rm(temporary, { force: true }).catch(() => undefined);
    throw error;
  }
}
