import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Environment without the npm/pnpm lifecycle variables injected by `pnpm run`, so a project
 * outside the repository is not influenced by this workspace's .npmrc or package metadata.
 */
function isolatedEnv() {
  return Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) => !/^(npm_config_|npm_package_|npm_lifecycle_|pnpm_config_)/i.test(key),
    ),
  );
}

/**
 * Run pnpm without a shell where possible and return stdout; throws with pnpm's output on
 * failure. Reuses the pnpm that launched the current script (`npm_execpath`).
 * @param {string[]} args
 * @param {string} cwd
 * @param {{ isolated?: boolean }} [options] isolated: drop workspace-specific env variables.
 */
export function pnpm(args, cwd, { isolated = false } = {}) {
  const launcher = process.env.npm_execpath;
  const options = { cwd, encoding: "utf8", env: isolated ? isolatedEnv() : process.env };
  let result;
  if (launcher && /\.[cm]?js$/.test(launcher)) {
    result = spawnSync(process.execPath, [launcher, ...args], options);
  } else if (launcher && /pnpm/i.test(launcher)) {
    result = spawnSync(launcher, args, options);
  } else if (process.platform === "win32") {
    // Direct invocation (`node scripts/...`): Windows needs the .cmd shim via a shell. Pass one
    // command string (args arrays with `shell` are deprecated, DEP0190) and quote arguments
    // only: a quoted shim name makes cmd.exe resolve %~dp0 inside pnpm.cmd to the cwd.
    result = spawnSync(`pnpm ${args.map((arg) => `"${arg}"`).join(" ")}`, {
      ...options,
      shell: true,
    });
  } else {
    result = spawnSync("pnpm", args, options);
  }
  if (result.error) {
    throw new Error(`Unable to run pnpm ${args.join(" ")}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`pnpm ${args.join(" ")} failed in ${cwd}:\n${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

/**
 * Pack one package into an empty destination directory and return the tarball path.
 * pnpm's reported filename mixes separators on Windows (research R7), so list the directory.
 */
export function packPackage(packageDir, destination) {
  mkdirSync(destination, { recursive: true });
  pnpm(["pack", "--pack-destination", destination], packageDir);
  const tarballs = readdirSync(destination).filter((file) => file.endsWith(".tgz"));
  if (tarballs.length !== 1) {
    throw new Error(`Expected exactly one tarball in ${destination}, found ${tarballs.length}`);
  }
  return join(destination, tarballs[0]);
}
