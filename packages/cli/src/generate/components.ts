// Component stylesheet renderer shared by the package builds and `neshel generate`
// (feature 004, contracts/generation.md "Style manifests" and "Rendering"; schema 2 from feature 005,
// specs/005-components-navigation-shell/contracts/components-css.md). Pure and deterministic.

/** Newest manifest schema this CLI reads (it also reads every older schema in SUPPORTED_SCHEMAS). */
export const MANIFEST_SCHEMA = 2;
export const SUPPORTED_SCHEMAS: readonly number[] = [1, 2];
export const COMPONENT_LAYER = "components.neshel";

export type Declaration = readonly [property: string, value: string];

export interface ManifestKeyframes {
  readonly name: string;
  readonly frames: ReadonlyArray<{
    readonly selector: string;
    readonly declarations: readonly Declaration[];
  }>;
}

export interface StyleManifest {
  readonly schema: 1 | 2;
  readonly package: string;
  readonly version: string;
  readonly layer: typeof COMPONENT_LAYER;
  /** Schema 2 only: `@keyframes` rendered before the rules. */
  readonly keyframes?: readonly ManifestKeyframes[];
  readonly rules: ReadonlyArray<{
    readonly selector: string;
    readonly declarations: readonly Declaration[];
    /** Schema 2 only: media condition wrapping the rule, e.g. "(prefers-reduced-motion: reduce)". */
    readonly media?: string;
    /** Schema 2 only: feature query wrapping the rule, e.g. "not (color: light-dark(Canvas, CanvasText))". */
    readonly supports?: string;
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
const MEDIA = /^\([a-z0-9 :().,-]+\)$/;
const SUPPORTS = /^(not )?\([a-z-]+: [A-Za-z0-9 ().,%-]+\)$/;
const KEYFRAMES_NAME = /^neshel-[a-z0-9-]+$/;
const FRAME_SELECTOR = /^(?:from|to|\d{1,3}(?:\.\d+)?%)$/;

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
  if (typeof value.schema !== "number" || !SUPPORTED_SCHEMAS.includes(value.schema)) {
    problems.push(
      `unsupported schema ${JSON.stringify(value.schema)} (this CLI reads schemas ${SUPPORTED_SCHEMAS.join(", ")})`,
    );
    return problems;
  }
  const schema2 = value.schema === 2;
  if (value.keyframes !== undefined) {
    if (!schema2) problems.push("keyframes require schema 2");
    else if (!Array.isArray(value.keyframes)) problems.push("keyframes must be an array");
    else {
      const names = new Set<string>();
      value.keyframes.forEach((entry, index) => {
        if (
          !isRecord(entry) ||
          typeof entry.name !== "string" ||
          !KEYFRAMES_NAME.test(entry.name)
        ) {
          problems.push(`keyframes[${index}]: invalid name`);
          return;
        }
        if (names.has(entry.name))
          problems.push(`keyframes[${index}]: duplicate name "${entry.name}"`);
        names.add(entry.name);
        if (!Array.isArray(entry.frames) || entry.frames.length === 0) {
          problems.push(`keyframes[${index}]: frames must be a non-empty array`);
          return;
        }
        entry.frames.forEach((frame, frameIndex) => {
          const where = `keyframes[${index}].frames[${frameIndex}]`;
          if (
            !isRecord(frame) ||
            typeof frame.selector !== "string" ||
            !FRAME_SELECTOR.test(frame.selector)
          ) {
            problems.push(`${where}: invalid selector`);
            return;
          }
          problems.push(...declarationProblems(frame.declarations, where));
        });
      });
    }
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
      if (rule.media !== undefined) {
        if (!schema2) problems.push(`rules[${index}]: media requires schema 2`);
        else if (
          typeof rule.media !== "string" ||
          !MEDIA.test(rule.media) ||
          UNSAFE.test(rule.media)
        )
          problems.push(`rules[${index}]: invalid media condition`);
      }
      if (rule.supports !== undefined) {
        if (!schema2) problems.push(`rules[${index}]: supports requires schema 2`);
        else if (
          typeof rule.supports !== "string" ||
          !SUPPORTS.test(rule.supports) ||
          UNSAFE.test(rule.supports)
        )
          problems.push(`rules[${index}]: invalid supports condition`);
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
 * Render a complete component stylesheet: the breakpoint registry, keyframes (schema 2), the base
 * rules (consecutive rules sharing a media condition in one block), the responsive
 * rules at `base`, then one `min-width` block per breakpoint in the given (ascending) order.
 */
export function renderComponentCss(
  manifest: StyleManifest,
  breakpoints: readonly RenderBreakpoint[],
): string {
  const lines = [`@layer ${manifest.layer} {`];
  lines.push(`  :root { --neshel-breakpoints: "${breakpoints.map((bp) => bp.name).join(" ")}"; }`);
  for (const { name, frames } of manifest.keyframes ?? []) {
    const body = frames.map((frame) => `${frame.selector} { ${declarations(frame.declarations)} }`);
    lines.push(`  @keyframes ${name} { ${body.join(" ")} }`);
  }
  // Consecutive rules sharing their wrappers (`@supports`, then `@media` inside) share one block.
  let open: string[] = [];
  const close = () => {
    for (let depth = open.length; depth > 0; depth--) lines.push(`${"  ".repeat(depth)}}`);
    open = [];
  };
  for (const rule of manifest.rules) {
    const wrappers = [
      ...(rule.supports !== undefined ? [`@supports ${rule.supports}`] : []),
      ...(rule.media !== undefined ? [`@media ${rule.media}`] : []),
    ];
    if (wrappers.join("\n") !== open.join("\n")) {
      close();
      wrappers.forEach((wrapper, depth) => {
        lines.push(`${"  ".repeat(depth + 1)}${wrapper} {`);
      });
      open = wrappers;
    }
    const indent = "  ".repeat(open.length + 1);
    lines.push(`${indent}${rule.selector} { ${declarations(rule.declarations)} }`);
  }
  close();
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
