// node scripts/publish-tarballs.mjs <dir> --version X.Y.Z [--dry-run] [--verify-only]
// Used ONLY by .github/workflows/release.yml after owner approval (feature 006, ADR 0017).
// Publishes the five validated tarballs in dependency order with npm (trusted publishing via OIDC
// when configured; provenance requested explicitly so the token-based 0.1.0 bootstrap also gets
// it). A version that already exists on the registry is skipped, so a failed run can be repeated.
// --verify-only checks `npm view` for every package (with bounded retries while the registry
// propagates) and installs all five in a clean directory outside the repository.
//
// npm's stdout and stderr are kept apart: npm prints warnings (for example about the pnpm settings
// in this repository's .npmrc) on stderr, and mixing them into the compared value made existing
// versions look missing (release run 42843343125, attempt 3).
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const ORDER = ["config", "layout", "typography", "components", "cli"];

/** Default retry schedule (milliseconds between attempts) for registry availability checks. */
export const DEFAULT_RETRY_DELAYS = [5_000, 10_000, 20_000, 30_000, 30_000];

/**
 * Environment without the npm/pnpm lifecycle variables injected by `pnpm run`, so npm is not
 * influenced by this workspace's configuration. Registry/auth settings in the user config
 * (NPM_CONFIG_USERCONFIG, NODE_AUTH_TOKEN) are kept.
 */
function npmEnv() {
  return Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) => !/^(npm_package_|npm_lifecycle_|pnpm_config_)/i.test(key),
    ),
  );
}

/**
 * Run npm without mixing its streams. Windows needs the npm.cmd shim through a shell (one command
 * string with quoted arguments, as in scripts/lib/pnpm.mjs); elsewhere npm runs without a shell.
 * @param {string[]} args
 * @param {{ cwd?: string }} [options]
 * @returns {{ status: number | null, stdout: string, stderr: string, error?: Error }}
 */
export function runNpm(args, { cwd } = {}) {
  const options = { cwd, encoding: "utf8", env: npmEnv(), maxBuffer: 64 * 1024 * 1024 };
  const result =
    process.platform === "win32"
      ? spawnSync(`npm ${args.map((arg) => `"${arg}"`).join(" ")}`, { ...options, shell: true })
      : spawnSync("npm", args, options);
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    ...(result.error ? { error: result.error } : {}),
  };
}

/** npm error code (E404, E401, ETIMEDOUT, ...) from `--json` output or `npm error code X` lines. */
export function npmErrorCode(result) {
  for (const stream of [result.stdout, result.stderr]) {
    try {
      const code = JSON.parse(stream)?.error?.code;
      if (typeof code === "string") return code;
    } catch {
      // Not JSON (or JSON preceded by warnings); fall back to the text form below.
    }
    const match = /"code"\s*:\s*"([A-Z0-9_]+)"|npm (?:error|ERR!) code ([A-Z0-9_]+)/.exec(stream);
    if (match) return match[1] ?? match[2];
  }
  return undefined;
}

/** npm refused to overwrite an existing version (E403 text or EPUBLISHCONFLICT). */
export function isPublishConflict(result) {
  return (
    npmErrorCode(result) === "EPUBLISHCONFLICT" ||
    /cannot publish over the previously published versions?/i.test(
      `${result.stderr}\n${result.stdout}`,
    )
  );
}

function summary(result) {
  const text = [result.error?.message, result.stderr.trim(), result.stdout.trim()]
    .filter(Boolean)
    .join("\n");
  const lines = text.split(/\r?\n/).filter((line) => !/^npm warn /i.test(line));
  return (lines.length ? lines : text.split(/\r?\n/)).slice(-12).join("\n");
}

/**
 * Ask the registry whether `pkg@version` exists, using only the exit status and clean stdout.
 * @returns {{ state: "present" | "missing" | "error", detail?: string }}
 *   missing: the package or the version does not exist (E404, or an empty answer);
 *   error: network, authentication, registry or unexpected output — never treated as missing.
 */
export function queryVersion(pkg, version, run = runNpm) {
  const result = run(["view", `${pkg}@${version}`, "version", "--json"]);
  if (result.error) return { state: "error", detail: `npm could not run: ${result.error.message}` };
  if (result.status === 0) {
    const out = result.stdout.trim();
    if (out === "") return { state: "missing" };
    let value;
    try {
      value = JSON.parse(out);
    } catch {
      return { state: "error", detail: `unexpected npm view output: ${out.slice(0, 200)}` };
    }
    // A range can match several versions; an exact version yields one string.
    const versions = Array.isArray(value) ? value : [value];
    if (versions.includes(version)) return { state: "present" };
    return { state: "error", detail: `npm view returned ${JSON.stringify(value)}` };
  }
  const code = npmErrorCode(result);
  if (code === "E404") return { state: "missing" };
  return {
    state: "error",
    detail: `npm view exited ${result.status}${code ? ` (${code})` : ""}\n${summary(result)}`,
  };
}

/**
 * Repeat `attempt` until it reports done or the delay schedule is exhausted.
 * @template T
 * @param {() => { done: boolean, value: T }} attempt
 * @param {{ delays: number[], sleep: (ms: number) => Promise<void>, onRetry?: (value: T, n: number) => void }} options
 * @returns {Promise<{ done: boolean, value: T, attempts: number }>}
 */
export async function withRetries(attempt, { delays, sleep, onRetry }) {
  let outcome = attempt();
  let attempts = 1;
  for (const delay of delays) {
    if (outcome.done) break;
    onRetry?.(outcome.value, attempts);
    await sleep(delay);
    outcome = attempt();
    attempts += 1;
  }
  return { ...outcome, attempts };
}

const realSleep = (ms) => new Promise((done) => setTimeout(done, ms));

/**
 * Publish (or, with verifyOnly, verify) the tarballs in `dir`. Returns the list of failures.
 * @param {{ dir: string, version: string, dryRun?: boolean, verifyOnly?: boolean,
 *   run?: typeof runNpm, sleep?: (ms: number) => Promise<void>, delays?: number[],
 *   log?: (line: string) => void, makeAppDir?: () => string }} options
 */
export async function publishTarballs({
  dir,
  version,
  dryRun = false,
  verifyOnly = false,
  run = runNpm,
  sleep = realSleep,
  delays = DEFAULT_RETRY_DELAYS,
  log = (line) => console.info(line),
  makeAppDir = () => mkdtempSync(join(tmpdir(), "neshel-verify-")),
}) {
  const files = readdirSync(dir);
  const failures = [];
  for (const name of ORDER) {
    const pkg = `@neshel-ui/${name}`;
    const tarball = files.find((f) => f === `neshel-ui-${name}-${version}.tgz`);
    if (!tarball) {
      failures.push(`${pkg}: tarball neshel-ui-${name}-${version}.tgz not found`);
      continue;
    }
    if (verifyOnly) {
      const { done, value, attempts } = await withRetries(
        () => {
          const query = queryVersion(pkg, version, run);
          return { done: query.state === "present", value: query };
        },
        {
          delays,
          sleep,
          onRetry: (query, n) =>
            log(`… ${pkg}@${version} not confirmed yet (${query.state}, attempt ${n}); retrying`),
        },
      );
      if (done) log(`✓ ${pkg}@${version} is on the registry`);
      else if (value.state === "missing") {
        failures.push(`${pkg}@${version} is not on the registry after ${attempts} attempts`);
      } else {
        failures.push(
          `${pkg}@${version}: registry query failed after ${attempts} attempts\n${value.detail}`,
        );
      }
      continue;
    }
    const query = queryVersion(pkg, version, run);
    if (query.state === "error") {
      failures.push(`${pkg}: cannot determine whether ${version} is published\n${query.detail}`);
      continue;
    }
    if (query.state === "present") {
      log(`= ${pkg}@${version} already published — skipped`);
      continue;
    }
    const args = ["publish", join(dir, tarball), "--access", "public", "--provenance"];
    if (dryRun) args.push("--dry-run");
    const result = run(args);
    if (result.status === 0 && !result.error) {
      log(`✓ ${pkg}@${version} ${dryRun ? "(dry run)" : "published"}`);
      continue;
    }
    // The registry can lag behind a publish from an earlier attempt: a conflict on a version that
    // now exists is the idempotent "already published" case, not a failure.
    if (!dryRun && isPublishConflict(result)) {
      if (queryVersion(pkg, version, run).state === "present") {
        log(`= ${pkg}@${version} already published (publish conflict) — skipped`);
        continue;
      }
    }
    failures.push(`${pkg}: npm publish failed\n${summary(result)}`);
  }
  if (verifyOnly && failures.length === 0) {
    failures.push(...(await verifyCleanInstall({ version, run, sleep, delays, log, makeAppDir })));
  }
  return failures;
}

/** Install the five packages from the registry in a fresh directory and check their versions. */
async function verifyCleanInstall({ version, run, sleep, delays, log, makeAppDir }) {
  const app = makeAppDir();
  try {
    writeFileSync(
      join(app, "package.json"),
      JSON.stringify({ name: "verify", private: true, type: "module" }),
    );
    const specs = ORDER.map((name) => `@neshel-ui/${name}@${version}`);
    const args = ["install", "--no-audit", "--no-fund", ...specs, "react@19", "react-dom@19"];
    const { done, value, attempts } = await withRetries(
      () => {
        const result = run(args, { cwd: app });
        return { done: result.status === 0 && !result.error, value: result };
      },
      {
        delays,
        sleep,
        onRetry: (_result, n) => log(`… clean install failed (attempt ${n}); retrying`),
      },
    );
    if (!done) return [`clean install failed after ${attempts} attempts\n${summary(value)}`];
    const wrong = [];
    for (const name of ORDER) {
      const manifest = join(app, "node_modules", "@neshel-ui", name, "package.json");
      let installed;
      try {
        installed = JSON.parse(readFileSync(manifest, "utf8")).version;
      } catch {
        installed = "missing";
      }
      if (installed !== version) wrong.push(`@neshel-ui/${name}: installed ${installed}`);
    }
    if (wrong.length) return [`clean install has unexpected versions\n${wrong.join("\n")}`];
    log(`✓ clean install of ${specs.join(", ")}`);
    return [];
  } finally {
    rmSync(app, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}

async function main() {
  const dir = resolve(process.argv[2]);
  const version = process.argv[process.argv.indexOf("--version") + 1];
  if (!/^\d+\.\d+\.\d+/.test(version ?? "")) throw new Error("--version X.Y.Z is required");
  const failures = await publishTarballs({
    dir,
    version,
    dryRun: process.argv.includes("--dry-run"),
    verifyOnly: process.argv.includes("--verify-only"),
  });
  if (failures.length) {
    for (const failure of failures) console.error(`✗ ${failure}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main();
}
