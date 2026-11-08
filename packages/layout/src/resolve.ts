/**
 * Pure, deterministic, order-free resolution of layout props into classes (ADR 0010, research
 * R3/R4). Each responsive prop value becomes one class per written breakpoint key; the stylesheet's
 * ascending media blocks resolve the mobile-first cascade and custom properties resolve the
 * precedence between props (`justify` > `alignX`/`alignY` > `align`, Flex axes per direction).
 * The output depends only on the props, never on configuration or environment.
 */
import { isBreakpointKey, warnUnknownBreakpoint } from "./breakpoint-check.js";
import { layoutError } from "./errors.js";
import { responsiveClassName, spaceScale, type TableKey } from "./style-tables.js";

type Scalar = string | number | boolean;

export interface PropSpec {
  /** Table key of the emitted classes. */
  readonly key: TableKey;
  /** Allowed scalar values. */
  readonly allowed: readonly Scalar[];
  /** Token of an allowed value (defaults to `String(value)`). */
  readonly token?: (value: Scalar) => string;
}

export interface ComponentSpec {
  readonly name: string;
  readonly props: Readonly<Record<string, PropSpec>>;
  /** Extra validation over the normalised props (Flex axes). */
  validate?(normalized: Readonly<Record<string, Normalized>>): void;
}

/** Written entries of one responsive prop, `base` first, then the consumer's key order. */
export type Normalized = ReadonlyArray<readonly [breakpoint: string, value: Scalar]>;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const describe = (value: unknown) =>
  typeof value === "string" ? JSON.stringify(value) : String(value);

const SOURCE = "[@neshel-ui/layout]";

export function normalize(
  component: string,
  prop: string,
  value: unknown,
  allowed: readonly Scalar[],
): Normalized {
  if (value === undefined || value === null) return [];
  const responsive = isPlainObject(value);
  const entries: Array<[string, unknown]> = responsive ? Object.entries(value) : [["base", value]];
  const result: Array<readonly [string, Scalar]> = [];
  for (const [key, item] of entries) {
    if (!isBreakpointKey(key)) {
      throw layoutError(
        component,
        `invalid breakpoint key ${JSON.stringify(key)} in "${prop}"; use "base" or a breakpoint name (lower camelCase, e.g. "md" or "tablet").`,
      );
    }
    if (item === undefined || item === null) continue;
    if (!allowed.includes(item as Scalar)) {
      const where = responsive ? ` at breakpoint "${key}"` : "";
      throw layoutError(
        component,
        `invalid value ${describe(item)} for "${prop}"${where}; expected one of: ${allowed.map(describe).join(", ")}.`,
      );
    }
    warnUnknownBreakpoint(`${SOURCE} <${component}>`, key);
    result.push([key, item as Scalar]);
  }
  return result.sort(([a], [b]) => (a === "base" ? -1 : b === "base" ? 1 : 0));
}

const present = (value: unknown) => value !== undefined && value !== null;

/** `space` excludes `spaceX`/`spaceY` (FR-012); `null` counts as absent. */
export function assertSpacing(component: string, props: Record<string, unknown>): void {
  if (!present(props.space)) return;
  const conflicts = ["spaceX", "spaceY"].filter((name) => present(props[name]));
  if (conflicts.length > 0) {
    throw layoutError(
      component,
      `"space" cannot be combined with ${conflicts.map((name) => `"${name}"`).join(" or ")}. ` +
        `Use "space" for both axes, or "spaceX" and/or "spaceY" for each axis.`,
    );
  }
}

/** Classes for the props of one component, in spec order (deterministic). */
export function resolve(spec: ComponentSpec, props: Record<string, unknown>): string[] {
  const normalized: Record<string, Normalized> = {};
  for (const [prop, propSpec] of Object.entries(spec.props)) {
    normalized[prop] = normalize(spec.name, prop, props[prop], propSpec.allowed);
  }
  spec.validate?.(normalized);
  const classes: string[] = [];
  for (const [prop, propSpec] of Object.entries(spec.props)) {
    for (const [breakpoint, value] of normalized[prop] ?? []) {
      const token = propSpec.token ? propSpec.token(value) : String(value);
      classes.push(responsiveClassName(breakpoint, propSpec.key, token));
    }
  }
  return classes;
}

/** Join generated classes and the consumer's className. */
export function joinClasses(classes: readonly string[], className: unknown): string | undefined {
  const all = typeof className === "string" && className ? [...classes, className] : classes;
  return all.length > 0 ? all.join(" ") : undefined;
}

// ---------------------------------------------------------------------------------------------
// Component specifications (contracts/layout-api.md, data-model.md).

const SPACE = spaceScale;
const MAIN = ["start", "center", "end"] as const;
const CROSS = [...MAIN, "stretch", "baseline"] as const;
const STACK_CROSS = [...MAIN, "stretch"] as const;
const GRID = [...MAIN, "stretch"] as const;
const JUSTIFY = ["start", "center", "end", "between", "around", "evenly"] as const;
const BOOL = [true, false] as const;

const spacingProps = {
  space: { key: "gap", allowed: SPACE },
  spaceX: { key: "gap-x", allowed: SPACE },
  spaceY: { key: "gap-y", allowed: SPACE },
} as const satisfies Record<string, PropSpec>;

const alignProps = (align: readonly Scalar[], x: readonly Scalar[], y: readonly Scalar[]) =>
  ({
    align: { key: "align", allowed: align },
    alignX: { key: "align-x", allowed: x },
    alignY: { key: "align-y", allowed: y },
  }) as const satisfies Record<string, PropSpec>;

const wrapToken = (value: Scalar) => (value ? "wrap" : "nowrap");

export const boxSpec: ComponentSpec = {
  name: "Box",
  props: { display: { key: "d", allowed: ["none", "block", "inline", "inline-block"] } },
};

export const stackSpec: ComponentSpec = {
  name: "Stack",
  props: {
    ...spacingProps,
    ...alignProps(MAIN, STACK_CROSS, MAIN),
    justify: { key: "justify", allowed: JUSTIFY },
  },
};

export const inlineSpec: ComponentSpec = {
  name: "Inline",
  props: {
    ...spacingProps,
    ...alignProps(MAIN, MAIN, CROSS),
    justify: { key: "justify", allowed: JUSTIFY },
    wrap: { key: "fw", allowed: BOOL, token: wrapToken },
  },
};

export const centerSpec: ComponentSpec = {
  name: "Center",
  props: { ...spacingProps, ...alignProps(MAIN, MAIN, CROSS) },
};

export const gridSpec: ComponentSpec = {
  name: "Grid",
  props: {
    ...spacingProps,
    columns: { key: "cols", allowed: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
    ...alignProps(GRID, GRID, GRID),
  },
};

export const containerSpec: ComponentSpec = {
  name: "Container",
  props: {
    size: { key: "mw", allowed: ["sm", "md", "lg", "xl", "2xl", "full"] },
    gutter: { key: "pi", allowed: SPACE },
  },
};

const valueAt = (entries: Normalized | undefined, breakpoint: string) =>
  entries?.find(([key]) => key === breakpoint)?.[1];
const onlyBase = (entries: Normalized | undefined) =>
  !entries || entries.every(([key]) => key === "base");

/**
 * Flex main-axis check (contracts/typography-css.md §3): `stretch`/`baseline` on the axis mapped to
 * `justify-content` throws where the effective direction is known without breakpoint order — at
 * every key when `direction` is static, otherwise at the keys where `direction` is written (and
 * the axis prop is written there or only at `base`). `justify` written at the same key (or static)
 * replaces the main-axis alignment, as before.
 */
function validateFlex(normalized: Readonly<Record<string, Normalized>>): void {
  const direction = normalized.direction;
  const keys = new Set<string>();
  for (const entries of Object.values(normalized)) for (const [key] of entries) keys.add(key);
  if (keys.size === 0) keys.add("base");
  const known = (prop: string, key: string) =>
    valueAt(normalized[prop], key) ??
    (onlyBase(normalized[prop]) ? valueAt(normalized[prop], "base") : undefined);
  const stable = (prop: string, key: string) =>
    valueAt(normalized[prop], key) !== undefined || onlyBase(normalized[prop]);
  for (const key of keys) {
    const directionKnown = onlyBase(direction) || valueAt(direction, key) !== undefined;
    if (!directionKnown) continue;
    const value = String(known("direction", key) ?? "row");
    const row = value.startsWith("row");
    const mainProp = row ? "alignX" : "alignY";
    if (known("justify", key) !== undefined || !stable("justify", key)) continue;
    const main =
      stable(mainProp, key) && known(mainProp, key) !== undefined
        ? known(mainProp, key)
        : stable(mainProp, key) && stable("align", key)
          ? known("align", key)
          : undefined;
    if (main !== undefined && !(MAIN as readonly Scalar[]).includes(main)) {
      throw layoutError(
        "Flex",
        `"${mainProp}" value ${describe(main)} maps to justify-content (main axis) at breakpoint ` +
          `"${key}" where direction is "${value}"; the main axis accepts start, center or end. ` +
          `Use "justify" for distribution.`,
      );
    }
  }
}

export const flexSpec: ComponentSpec = {
  name: "Flex",
  props: {
    ...spacingProps,
    direction: { key: "dir", allowed: ["row", "column", "row-reverse", "column-reverse"] },
    wrap: { key: "fw", allowed: BOOL, token: wrapToken },
    ...alignProps(MAIN, CROSS, CROSS),
    justify: { key: "justify", allowed: JUSTIFY },
  },
  validate: validateFlex,
};
