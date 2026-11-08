// Command-line orchestration (contracts/cli.md). `run` never calls process.exit; it returns the
// exit code so bin.ts stays a thin wrapper and messages go only through the provided streams.
import { existsSync, readFileSync, rmSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { type Diagnostic, formatDiagnostics } from "./diagnostics.js";
import { CliError, ExitCode, type ExitCodeValue } from "./errors.js";
import { generateCss } from "./generate/css.js";
import { generateDeclarations, isGeneratedDeclarations } from "./generate/declarations.js";
import { discoverConfig } from "./load/discover.js";
import { loadConfig } from "./load/load-config.js";
import { loadManifests } from "./load/manifests.js";
import { compareOutput, resolveOutput, targetProblem, writeIfChanged } from "./output.js";
import { displayPath } from "./paths.js";
import { validateConfig } from "./validate/index.js";
import { typesProblem } from "./validate/structure.js";

export const DEFAULT_TYPES = "neshel.generated.d.ts";

export interface Io {
  readonly cwd: string;
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly stdout: { write(text: string): unknown; isTTY?: boolean };
  readonly stderr: { write(text: string): unknown; isTTY?: boolean };
}

export const USAGE = `Usage:
  neshel validate [--config <path>] [--strict] [--debug]
  neshel generate [--config <path>] [--out <path>] [--types <path>] [--check] [--strict] [--debug]
  neshel --help | --version

Commands:
  validate   Check neshel.config.* (structure, colours, contrast); never writes.
  generate   Validate, then write the stylesheet and, with breakpoints, the TypeScript
             declarations (or compare them with --check).

Options:
  --config <path>  Configuration file (default: neshel.config.{ts,mts,js,mjs} in the cwd)
  --out <path>     Output file, relative to the cwd (overrides "output" in the config)
  --types <path>   Declarations file, relative to the cwd (overrides "types" in the config)
  --check          Compare with the existing outputs without writing; exit 4 when stale
  --strict         Treat contrast warnings as errors
  --debug          Print stack traces for load and internal errors

Exit codes: 0 ok, 1 invalid configuration, 2 usage, 3 config not found or failed to load,
4 output out of date (--check), 5 I/O or internal error.
Configuration files are executable, trusted project code and run with your privileges.
`;

function version(): string {
  const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  return String(manifest.version);
}

interface Parsed {
  command: "validate" | "generate";
  config?: string;
  out?: string;
  types?: string;
  check: boolean;
  strict: boolean;
  debug: boolean;
}

function parse(argv: readonly string[]): Parsed | "help" | "version" {
  let values: Record<string, string | boolean | undefined>;
  let positionals: string[];
  try {
    ({ values, positionals } = parseArgs({
      args: [...argv],
      allowPositionals: true,
      strict: true,
      options: {
        config: { type: "string" },
        out: { type: "string" },
        types: { type: "string" },
        check: { type: "boolean" },
        strict: { type: "boolean" },
        debug: { type: "boolean" },
        help: { type: "boolean", short: "h" },
        version: { type: "boolean", short: "v" },
      },
    }));
  } catch (error) {
    throw new CliError(ExitCode.usage, (error as Error).message);
  }
  if (values.help) return "help";
  if (values.version) return "version";
  const [command, ...rest] = positionals;
  if (command === undefined) throw new CliError(ExitCode.usage, "Missing command.");
  if (command !== "validate" && command !== "generate") {
    throw new CliError(ExitCode.usage, `Unknown command "${command}".`);
  }
  if (rest.length > 0) throw new CliError(ExitCode.usage, `Unexpected argument "${rest[0]}".`);
  if (
    command === "validate" &&
    (values.out !== undefined || values.types !== undefined || values.check)
  ) {
    throw new CliError(ExitCode.usage, '"validate" does not accept --out, --types or --check.');
  }
  for (const key of ["config", "out", "types"] as const) {
    if (values[key] === "") throw new CliError(ExitCode.usage, `--${key} requires a value.`);
  }
  return {
    command,
    config: values.config as string | undefined,
    out: values.out as string | undefined,
    types: values.types as string | undefined,
    check: Boolean(values.check),
    strict: Boolean(values.strict),
    debug: Boolean(values.debug),
  };
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** `--types` (cwd-relative) › config `types` (config-dir-relative) › default next to the config. */
function resolveTypes(
  cwd: string,
  configFile: string,
  flag: string | undefined,
  configTypes: unknown,
): string {
  if (flag !== undefined) {
    const problem = typesProblem(flag);
    if (problem) throw new CliError(ExitCode.usage, `--types ${flag}: ${problem}.`);
    return resolve(cwd, flag);
  }
  if (typeof configTypes === "string") return resolve(dirname(configFile), configTypes);
  return join(dirname(configFile), DEFAULT_TYPES);
}

export async function run(argv: readonly string[], io: Io): Promise<ExitCodeValue> {
  const color = Boolean(io.stderr.isTTY) && io.env.NO_COLOR === undefined;
  const say = (text: string) => io.stdout.write(`${text}\n`);
  const warn = (text: string) => io.stderr.write(`${text}\n`);
  const report = (diagnostics: readonly Diagnostic[]) => {
    for (const line of formatDiagnostics(diagnostics, { color })) warn(line);
  };
  let debug = argv.includes("--debug");
  try {
    const parsed = parse(argv);
    if (parsed === "help") {
      io.stdout.write(USAGE);
      return ExitCode.ok;
    }
    if (parsed === "version") {
      say(version());
      return ExitCode.ok;
    }
    debug = parsed.debug;
    const configFile = discoverConfig(io.cwd, parsed.config);
    const label = displayPath(configFile, io.cwd);
    const input = await loadConfig(configFile, label);
    warn(`neshel: loaded ${label}`);

    const result = validateConfig(input, { strict: parsed.strict });
    const diagnostics = [...result.diagnostics];
    const configOutput = typeof input.output === "string" ? input.output : undefined;
    const target = resolveOutput({
      cwd: io.cwd,
      configFile,
      flag: parsed.command === "generate" ? parsed.out : undefined,
      configOutput,
    });
    const problem = targetProblem(target, configFile);
    if (problem && target.source === "flag") {
      throw new CliError(ExitCode.usage, `--out ${displayPath(target.path, io.cwd)}: ${problem}.`);
    }
    if (problem && !diagnostics.some((d) => d.code === "invalid-output")) {
      diagnostics.push({
        severity: "error",
        code: "invalid-output",
        path: "output",
        message: `${problem}; resolved to ${displayPath(target.path, io.cwd)}.`,
      });
    }
    report(diagnostics);
    const errors = diagnostics.filter((d) => d.severity === "error").length;
    const warnings = diagnostics.filter((d) => d.severity === "warning").length;
    if (errors > 0 || !result.config) {
      say(`neshel: ${plural(errors, "error")} — nothing written.`);
      return ExitCode.invalid;
    }
    if (parsed.command === "validate") {
      say(`neshel: ${label} is valid (${plural(warnings, "warning")}).`);
      return ExitCode.ok;
    }

    const config = result.config;
    const components = config.breakpoints ? loadManifests(dirname(configFile)) : [];
    if (config.breakpoints && components.length === 0) {
      report([
        {
          severity: "warning",
          code: "no-component-packages",
          path: "breakpoints",
          message:
            "Neither @neshel-ui/layout nor @neshel-ui/typography resolves from the config directory; only declarations (and Tailwind breakpoints) are generated.",
        },
      ]);
    }
    const css = generateCss(config, {
      layer: "config",
      header: `Generated by "neshel generate" from ${basename(configFile)} (config schema 1); do not edit.`,
      components,
    });
    const typesTarget = resolveTypes(io.cwd, configFile, parsed.types, input.types);
    const declarations = config.breakpoints
      ? generateDeclarations(config.breakpoints, basename(configFile))
      : undefined;
    const output = displayPath(target.path, io.cwd);
    const typesLabel = displayPath(typesTarget, io.cwd);
    const staleTypes =
      !declarations &&
      existsSync(typesTarget) &&
      isGeneratedDeclarations(readFileSync(typesTarget, "utf8"));
    const summary = [
      plural(config.themes.length, "theme"),
      ...(config.breakpoints ? [plural(config.breakpoints.list.length, "breakpoint")] : []),
      ...(components.length
        ? [components.map((m) => m.package.replace("@neshel-ui/", "")).join(" + ")]
        : []),
    ].join(", ");
    if (parsed.check) {
      const states = [
        { label: output, state: compareOutput(target.path, css) },
        ...(declarations
          ? [{ label: typesLabel, state: compareOutput(typesTarget, declarations) }]
          : []),
        ...(staleTypes ? [{ label: typesLabel, state: "stale" as const }] : []),
      ];
      const stale = states.filter((entry) => entry.state !== "unchanged");
      if (stale.length === 0) {
        say(`neshel: ${states.map((entry) => entry.label).join(" and ")} up to date (${summary}).`);
        return ExitCode.ok;
      }
      for (const entry of stale) {
        say(
          `neshel: ${entry.label} is ${entry.state === "missing" ? "missing" : "out of date"}; run neshel generate.`,
        );
      }
      return ExitCode.stale;
    }
    const state = await writeIfChanged(target.path, css);
    say(
      `neshel: ${state === "written" ? "wrote" : "unchanged"} ${output} (${summary}, ${plural(warnings, "warning")}).`,
    );
    if (declarations) {
      const typesState = await writeIfChanged(typesTarget, declarations);
      say(`neshel: ${typesState === "written" ? "wrote" : "unchanged"} ${typesLabel}.`);
    } else if (staleTypes) {
      rmSync(typesTarget);
      say(`neshel: removed ${typesLabel} (no breakpoints configured).`);
    }
    return ExitCode.ok;
  } catch (error) {
    if (error instanceof CliError) {
      warn(`neshel: ${error.message}`);
      if (error.exitCode === ExitCode.usage) warn(`\n${USAGE}`);
      if (debug && error.cause instanceof Error && error.cause.stack) warn(error.cause.stack);
      return error.exitCode;
    }
    const message = error instanceof Error ? error.message : String(error);
    warn(`neshel: ${message}`);
    if (debug && error instanceof Error && error.stack) warn(error.stack);
    return ExitCode.internal;
  }
}
