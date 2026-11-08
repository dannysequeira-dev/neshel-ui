// Locates the style manifests of installed Neshel component packages (contracts/generation.md).
// Manifests are data (JSON), never executed.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { CliError, ExitCode } from "../errors.js";
import { manifestProblems, type StyleManifest } from "../generate/components.js";

/** Component packages in output order. */
export const COMPONENT_PACKAGES = [
  "@neshel-ui/layout",
  "@neshel-ui/typography",
  "@neshel-ui/components",
] as const;

/**
 * Manifests of the component packages resolvable from `directory` (Node resolution honouring
 * `exports`). Missing packages are skipped; an installed package without a valid manifest fails.
 */
export function loadManifests(directory: string): StyleManifest[] {
  const require = createRequire(join(directory, "neshel-manifest-resolver.js"));
  const manifests: StyleManifest[] = [];
  for (const name of COMPONENT_PACKAGES) {
    let file: string;
    try {
      file = require.resolve(`${name}/style-manifest.json`);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "MODULE_NOT_FOUND") continue;
      if (code === "ERR_PACKAGE_PATH_NOT_EXPORTED") {
        throw new CliError(
          ExitCode.internal,
          `${name} is installed but exports no style manifest; it predates custom breakpoints. Update ${name} together with @neshel-ui/cli.`,
        );
      }
      throw new CliError(
        ExitCode.internal,
        `Could not resolve ${name}: ${(error as Error).message}`,
        {
          cause: error,
        },
      );
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(file, "utf8"));
    } catch (error) {
      throw new CliError(ExitCode.internal, `${name}/style-manifest.json is not valid JSON.`, {
        cause: error,
      });
    }
    const problems = manifestProblems(parsed, name);
    if (problems.length > 0) {
      throw new CliError(
        ExitCode.internal,
        `incompatible-manifest: ${name}/style-manifest.json — ${problems.slice(0, 3).join("; ")}. Update ${name} and @neshel-ui/cli together.`,
      );
    }
    manifests.push(parsed as StyleManifest);
  }
  return manifests;
}
