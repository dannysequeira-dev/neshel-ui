// Hand-written structural validation of neshel.config (contracts/cli.md "Validation pipeline").
// Reports every problem in one pass; never throws on bad input.
import { colorRoles } from "@neshel-ui/config";
import { type Diagnostic, type DiagnosticCode, describeValue, suggest } from "../diagnostics.js";
import { fontRoles } from "../resolve.js";

const TOP_LEVEL = [
  "version",
  "themes",
  "radius",
  "spacing",
  "typography",
  "focus",
  "contrast",
  "output",
] as const;
const THEME_KEYS = ["colors", "extends"] as const;
const RADIUS_KEYS = ["base", "sm", "md", "lg", "xl"] as const;
const METRIC_KEYS = ["capHeight", "ascent", "descent", "lineGap", "unitsPerEm", "xHeight"] as const;
export const THEME_NAME = /^[a-z][a-z0-9-]{0,31}$/;
const LENGTH = /^(?:0|(?:\d+(?:\.\d+)?|\.\d+)(?:rem|em|px))$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

class Collector {
  readonly diagnostics: Diagnostic[] = [];

  error(code: DiagnosticCode, path: string, message: string) {
    this.diagnostics.push({ severity: "error", code, path, message });
  }

  info(code: DiagnosticCode, path: string, message: string) {
    this.diagnostics.push({ severity: "info", code, path, message });
  }

  /** Validate an object's keys; returns the record or undefined when not an object. */
  object(value: unknown, path: string, allowed: readonly string[]) {
    if (!isRecord(value)) {
      this.error("invalid-type", path, `Expected an object; received ${describeValue(value)}.`);
      return undefined;
    }
    for (const key of Object.keys(value)) {
      if (allowed.includes(key)) continue;
      const hint = suggest(key, allowed);
      this.error(
        "unknown-key",
        path ? `${path}.${key}` : key,
        `Unknown key "${key}".${hint ? ` Did you mean "${hint}"?` : ` Allowed: ${allowed.join(", ")}.`}`,
      );
    }
    return value;
  }

  length(value: unknown, path: string) {
    if (value === undefined) return;
    if (typeof value !== "string" || !LENGTH.test(value.trim())) {
      this.error(
        "invalid-length",
        path,
        `Expected a length such as "0.75rem" (rem, em, px or 0); received ${describeValue(value)}.`,
      );
    }
  }
}

function validateThemes(c: Collector, value: unknown) {
  // Theme names are open (named themes), so only the type is checked here.
  if (!isRecord(value)) {
    c.error("invalid-type", "themes", `Expected an object; received ${describeValue(value)}.`);
    return;
  }
  for (const [name, input] of Object.entries(value)) {
    const path = `themes.${name}`;
    if (name === "system") {
      c.error("reserved-theme", path, '"system" is reserved for following the OS preference.');
      continue;
    }
    const builtIn = name === "light" || name === "dark";
    if (!builtIn && !THEME_NAME.test(name)) {
      c.error(
        "invalid-theme-name",
        path,
        `Theme names use lower-case letters, digits and "-", start with a letter and have at most 32 characters; received ${describeValue(name)}.`,
      );
    }
    const theme = c.object(input, path, THEME_KEYS);
    if (!theme) continue;
    if (builtIn && theme.extends !== undefined) {
      c.error(
        "unexpected-base",
        `${path}.extends`,
        `"${name}" is a built-in theme and cannot extend another theme.`,
      );
    } else if (!builtIn && theme.extends === undefined) {
      c.error(
        "missing-base",
        path,
        `Named theme "${name}" must declare extends: "light" or "dark".`,
      );
    } else if (!builtIn && theme.extends !== "light" && theme.extends !== "dark") {
      c.error(
        "invalid-base",
        `${path}.extends`,
        `"extends" must be "light" or "dark"; received ${describeValue(theme.extends)}.`,
      );
    }
    if (theme.colors === undefined) continue;
    const colors = c.object(theme.colors, `${path}.colors`, colorRoles);
    if (!colors) continue;
    for (const [role, colour] of Object.entries(colors)) {
      if ((colorRoles as readonly string[]).includes(role) && typeof colour !== "string") {
        c.error(
          "invalid-type",
          `${path}.colors.${role}`,
          `Expected a colour string; received ${describeValue(colour)}.`,
        );
      }
    }
  }
}

function validateFontStack(c: Collector, value: unknown, path: string) {
  const invalid = (name: unknown) =>
    typeof name !== "string" || name.trim() === "" || /[;{}]/.test(name);
  const ok = Array.isArray(value) ? value.length > 0 && !value.some(invalid) : !invalid(value);
  if (!ok) {
    c.error(
      "invalid-font-stack",
      path,
      `Expected a non-empty family name or array of names without ";", "{" or "}"; received ${describeValue(value)}.`,
    );
  }
}

function validateTypography(c: Collector, value: unknown) {
  const typography = c.object(value, "typography", ["families", "metrics"]);
  if (!typography) return;
  if (typography.families !== undefined) {
    const families = c.object(typography.families, "typography.families", fontRoles);
    for (const role of fontRoles) {
      if (families?.[role] !== undefined)
        validateFontStack(c, families[role], `typography.families.${role}`);
    }
  }
  if (typography.metrics !== undefined) {
    const metrics = c.object(typography.metrics, "typography.metrics", fontRoles);
    for (const role of fontRoles) {
      const entry = metrics?.[role];
      if (entry === undefined) continue;
      const path = `typography.metrics.${role}`;
      const record = c.object(entry, path, METRIC_KEYS);
      if (!record) continue;
      for (const key of METRIC_KEYS) {
        const number = record[key];
        if (number === undefined && key === "xHeight") continue;
        if (
          typeof number !== "number" ||
          !Number.isFinite(number) ||
          (key === "unitsPerEm" && number <= 0)
        ) {
          c.error(
            "invalid-metrics",
            `${path}.${key}`,
            `Expected a finite number${key === "unitsPerEm" ? " greater than 0" : ""}; received ${describeValue(number)}.`,
          );
        }
      }
    }
    c.info(
      "reserved",
      "typography.metrics",
      "Font metrics are reserved for feature 004 and produce no CSS yet.",
    );
  }
}

/** Output path rules that need no file system (contracts/cli.md "Output"). */
export function outputProblem(value: unknown): string | undefined {
  if (typeof value !== "string" || value.trim() === "") return "Expected a file path string";
  if (!/\.css$/i.test(value)) return "The output file must end in .css";
  if (value.split(/[\\/]/).includes("node_modules"))
    return "The output must not be inside node_modules";
  return undefined;
}

/** Structural diagnostics for an unknown configuration value. */
export function validateStructure(input: unknown): Diagnostic[] {
  const c = new Collector();
  const config = c.object(input, "", TOP_LEVEL);
  if (!config) return c.diagnostics;
  if (config.version !== undefined && config.version !== 1) {
    c.error(
      "invalid-version",
      "version",
      `Only configuration schema version 1 exists; received ${describeValue(config.version)}.`,
    );
  }
  if (config.themes !== undefined) validateThemes(c, config.themes);
  if (config.radius !== undefined) {
    const radius = c.object(config.radius, "radius", RADIUS_KEYS);
    for (const key of RADIUS_KEYS) c.length(radius?.[key], `radius.${key}`);
  }
  if (config.spacing !== undefined) {
    const spacing = c.object(config.spacing, "spacing", ["unit"]);
    c.length(spacing?.unit, "spacing.unit");
  }
  if (config.focus !== undefined) {
    const focus = c.object(config.focus, "focus", ["width", "offset"]);
    c.length(focus?.width, "focus.width");
    c.length(focus?.offset, "focus.offset");
  }
  if (config.typography !== undefined) validateTypography(c, config.typography);
  if (config.contrast !== undefined && config.contrast !== "warn" && config.contrast !== "error") {
    c.error(
      "invalid-type",
      "contrast",
      `Expected "warn" or "error"; received ${describeValue(config.contrast)}.`,
    );
  }
  if (config.output !== undefined) {
    const problem = outputProblem(config.output);
    if (problem)
      c.error("invalid-output", "output", `${problem}; received ${describeValue(config.output)}.`);
  }
  return c.diagnostics;
}
