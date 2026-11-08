// Component stylesheet renderer shared by the package builds and `neshel generate`
// (feature 004, contracts/generation.md "Style manifests" and "Rendering"). Pure and deterministic.

export const MANIFEST_SCHEMA = 1;
export const COMPONENT_LAYER = "components.neshel";

export type Declaration = readonly [property: string, value: string];

export interface StyleManifest {
  readonly schema: 1;
  readonly package: string;
  readonly version: string;
  readonly layer: typeof COMPONENT_LAYER;
  readonly rules: ReadonlyArray<{
    readonly selector: string;
    readonly declarations: readonly Declaration[];
  }>;
  readonly responsive: ReadonlyArray<{
    readonly class: string;
    readonly declarations: readonly Declaration[];
  }>;
}

export interface RenderBreakpoint {
  readonly name: string;
  readonly width: string;
}

const CLASS_SUFFIX = /^[A-Za-z0-9._-]+$/;
const UNSAFE = /[{};]|\*\/|\/\*/;
const PROPERTY = /^(?:--)?[a-z][a-z0-9-]*$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function declarationProblems(value: unknown, where: string): string[] {
  if (!Array.isArray(value) || value.length === 0)
    return [`${where}: declarations must be a non-empty array`];
  const problems: string[] = [];
  for (const entry of value) {
    if (
      !Array.isArray(entry) ||
      entry.length !== 2 ||
      typeof entry[0] !== "string" ||
      typeof entry[1] !== "string" ||
      !PROPERTY.test(entry[0]) ||
      entry[1].trim() === "" ||
      UNSAFE.test(entry[1])
    ) {
      problems.push(`${where}: invalid declaration ${JSON.stringify(entry)}`);
    }
  }
  return problems;
}

/** Problems that make a parsed manifest unusable (empty array = valid). */
export function manifestProblems(value: unknown, expectedPackage?: string): string[] {
  if (!isRecord(value)) return ["the manifest is not a JSON object"];
  const problems: string[] = [];
  if (value.schema !== MANIFEST_SCHEMA) {
    problems.push(
      `unsupported schema ${JSON.stringify(value.schema)} (this CLI reads schema ${MANIFEST_SCHEMA})`,
    );
    return problems;
  }
  if (typeof value.package !== "string" || (expectedPackage && value.package !== expectedPackage)) {
    problems.push(
      `package is ${JSON.stringify(value.package)}, expected ${JSON.stringify(expectedPackage)}`,
    );
  }
  if (typeof value.version !== "string" || UNSAFE.test(value.version))
    problems.push("invalid version");
  if (value.layer !== COMPONENT_LAYER) problems.push(`layer must be "${COMPONENT_LAYER}"`);
  if (!Array.isArray(value.rules)) problems.push("rules must be an array");
  else {
    value.rules.forEach((rule, index) => {
      if (
        !isRecord(rule) ||
        typeof rule.selector !== "string" ||
        rule.selector.trim() === "" ||
        UNSAFE.test(rule.selector)
      ) {
        problems.push(`rules[${index}]: invalid selector`);
        return;
      }
      problems.push(...declarationProblems(rule.declarations, `rules[${index}]`));
    });
  }
  if (!Array.isArray(value.responsive)) problems.push("responsive must be an array");
  else {
    const seen = new Set<string>();
    value.responsive.forEach((rule, index) => {
      if (!isRecord(rule) || typeof rule.class !== "string" || !CLASS_SUFFIX.test(rule.class)) {
        problems.push(`responsive[${index}]: invalid class`);
        return;
      }
      if (seen.has(rule.class))
        problems.push(`responsive[${index}]: duplicate class "${rule.class}"`);
      seen.add(rule.class);
      problems.push(...declarationProblems(rule.declarations, `responsive[${index}]`));
    });
  }
  return problems;
}

/** Escape a class name for a selector (only `.` can occur besides `[A-Za-z0-9_-]`). */
export function escapeClass(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`);
}

const declarations = (list: readonly Declaration[]) =>
  list.map(([property, value]) => `${property}: ${value};`).join(" ");

/** Class name of a responsive rule at a breakpoint (`base` has no prefix). */
export function responsiveClass(breakpoint: string, suffix: string): string {
  return breakpoint === "base" ? `neshel-${suffix}` : `neshel-${breakpoint}-${suffix}`;
}

/**
 * Render a complete component stylesheet: the breakpoint registry, the base rules, the responsive
 * rules at `base`, then one `min-width` block per breakpoint in the given (ascending) order.
 */
export function renderComponentCss(
  manifest: StyleManifest,
  breakpoints: readonly RenderBreakpoint[],
): string {
  const lines = [`@layer ${manifest.layer} {`];
  lines.push(`  :root { --neshel-breakpoints: "${breakpoints.map((bp) => bp.name).join(" ")}"; }`);
  for (const rule of manifest.rules) {
    lines.push(`  ${rule.selector} { ${declarations(rule.declarations)} }`);
  }
  lines.push("");
  for (const rule of manifest.responsive) {
    lines.push(
      `  .${escapeClass(responsiveClass("base", rule.class))} { ${declarations(rule.declarations)} }`,
    );
  }
  for (const bp of breakpoints) {
    lines.push("", `  @media (min-width: ${bp.width}) {`);
    for (const rule of manifest.responsive) {
      lines.push(
        `    .${escapeClass(responsiveClass(bp.name, rule.class))} { ${declarations(rule.declarations)} }`,
      );
    }
    lines.push("  }");
  }
  lines.push("}");
  return `${lines.join("\n")}\n`;
}

/** Header comment of a package's shipped stylesheet. */
export function packageStylesheetHeader(manifest: StyleManifest): string {
  return `/* ${manifest.package} styles. Generated from style tables; do not edit. */`;
}

/** The shipped package stylesheet: header + rendered CSS for the given breakpoints. */
export function renderPackageStylesheet(
  manifest: StyleManifest,
  breakpoints: readonly RenderBreakpoint[],
): string {
  return `${packageStylesheetHeader(manifest)}\n\n${renderComponentCss(manifest, breakpoints)}`;
}
