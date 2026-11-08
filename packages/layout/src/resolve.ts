/**
 * Pure, deterministic resolution of layout props into class selections (research R5/R6).
 * 1. normalise and validate each responsive prop;
 * 2. cascade every prop mobile-first;
 * 3. derive the effective CSS token per property key at each breakpoint (precedence lives here);
 * 4. emit a selection only when a key's token changes; reset to `normal` when a derived value
 *    disappears (Flex direction changes).
 */
import { layoutError } from "./errors.js";
import {
  type BreakpointName,
  breakpoints,
  type PropertyKey,
  propertyTables,
  spaceScale,
} from "./style-tables.js";

type Scalar = string | number | boolean;
export type Effective = Readonly<Record<string, Scalar | undefined>>;
type Derived = Partial<Record<PropertyKey, string>>;

export interface ComponentSpec {
  readonly name: string;
  /** Allowed scalar values per responsive prop. */
  readonly props: Readonly<Record<string, readonly Scalar[]>>;
  /** Tokens already applied by the component's base class or default variants. */
  readonly defaults?: Derived;
  derive(effective: Effective, bp: BreakpointName): Derived;
}

/** Variant selections for tailwind-variants, e.g. `{ base_gap: "4", md_ai: "center" }`. */
export type Selections = Record<string, string>;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const describe = (value: unknown) =>
  typeof value === "string" ? JSON.stringify(value) : String(value);

export function normalize(
  component: string,
  prop: string,
  value: unknown,
  allowed: readonly Scalar[],
): Partial<Record<BreakpointName, Scalar>> {
  if (value === undefined || value === null) return {};
  const entries: Array<[string, unknown]> = isPlainObject(value)
    ? Object.entries(value)
    : [["base", value]];
  const result: Partial<Record<BreakpointName, Scalar>> = {};
  for (const [key, item] of entries) {
    if (!(breakpoints as readonly string[]).includes(key)) {
      throw layoutError(
        component,
        `unknown breakpoint "${key}" in "${prop}"; expected one of: ${breakpoints.join(", ")}.`,
      );
    }
    if (item === undefined || item === null) continue;
    if (!allowed.includes(item as Scalar)) {
      const where = key === "base" && !isPlainObject(value) ? "" : ` at breakpoint "${key}"`;
      throw layoutError(
        component,
        `invalid value ${describe(item)} for "${prop}"${where}; expected one of: ${allowed.map(describe).join(", ")}.`,
      );
    }
    result[key as BreakpointName] = item as Scalar;
  }
  return result;
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

export function resolve(spec: ComponentSpec, props: Record<string, unknown>): Selections {
  const normalized = Object.entries(spec.props).map(
    ([prop, allowed]) => [prop, normalize(spec.name, prop, props[prop], allowed)] as const,
  );
  const effective: Record<string, Scalar | undefined> = {};
  const current: Partial<Record<PropertyKey, string>> = { ...spec.defaults };
  const fromProps = new Set<PropertyKey>();
  const selections: Selections = {};

  for (const bp of breakpoints) {
    for (const [prop, values] of normalized) {
      if (values[bp] !== undefined) effective[prop] = values[bp];
    }
    const derived = spec.derive(effective, bp);
    const keys = new Set<PropertyKey>([...fromProps, ...(Object.keys(derived) as PropertyKey[])]);
    for (const key of keys) {
      let next = derived[key];
      if (next === undefined) {
        // A derived value disappeared (only possible after a Flex direction change).
        fromProps.delete(key);
        next = spec.defaults?.[key] ?? "normal";
        if (bp === "base" || !("resets" in propertyTables[key])) continue;
      } else {
        fromProps.add(key);
      }
      if (next !== current[key]) {
        selections[`${bp}_${key}`] = next;
        current[key] = next;
      }
    }
  }
  return selections;
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

const spacingProps = { space: SPACE, spaceX: SPACE, spaceY: SPACE };

function spacing(e: Effective): Derived {
  const out: Derived = {};
  if (e.space !== undefined) out.gap = String(e.space);
  if (e.spaceX !== undefined) out["gap-x"] = String(e.spaceX);
  if (e.spaceY !== undefined) out["gap-y"] = String(e.spaceY);
  return out;
}

const str = (value: Scalar | undefined) => (value === undefined ? undefined : String(value));
const axisX = (e: Effective) => str(e.alignX ?? e.align);
const axisY = (e: Effective) => str(e.alignY ?? e.align);
const wrapToken = (value: Scalar | undefined) =>
  value === undefined ? undefined : value ? "wrap" : "nowrap";

function compact(derived: Derived): Derived {
  return Object.fromEntries(Object.entries(derived).filter(([, v]) => v !== undefined));
}

export const boxSpec: ComponentSpec = {
  name: "Box",
  props: { display: ["none", "block", "inline", "inline-block"] },
  derive: (e) => compact({ d: str(e.display) }),
};

export const stackSpec: ComponentSpec = {
  name: "Stack",
  props: { ...spacingProps, align: MAIN, alignX: STACK_CROSS, alignY: MAIN, justify: JUSTIFY },
  derive: (e) => compact({ ...spacing(e), ai: axisX(e), jc: str(e.justify) ?? axisY(e) }),
};

export const inlineSpec: ComponentSpec = {
  name: "Inline",
  props: {
    ...spacingProps,
    align: MAIN,
    alignX: MAIN,
    alignY: CROSS,
    justify: JUSTIFY,
    wrap: BOOL,
  },
  derive: (e) =>
    compact({
      ...spacing(e),
      jc: str(e.justify) ?? axisX(e),
      ai: axisY(e),
      fw: wrapToken(e.wrap),
    }),
};

export const centerSpec: ComponentSpec = {
  name: "Center",
  props: { ...spacingProps, align: MAIN, alignX: MAIN, alignY: CROSS },
  defaults: { ai: "center", jc: "center" },
  derive: (e) => compact({ ...spacing(e), jc: axisX(e), ai: axisY(e) }),
};

export const gridSpec: ComponentSpec = {
  name: "Grid",
  props: {
    ...spacingProps,
    columns: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    align: GRID,
    alignX: GRID,
    alignY: GRID,
  },
  derive: (e) => compact({ ...spacing(e), cols: str(e.columns), ji: axisX(e), ai: axisY(e) }),
};

export const containerSpec: ComponentSpec = {
  name: "Container",
  props: { size: ["sm", "md", "lg", "xl", "2xl", "full"], gutter: SPACE },
  defaults: { mw: "xl" },
  derive: (e) => compact({ mw: str(e.size), pi: str(e.gutter) }),
};

export const flexSpec: ComponentSpec = {
  name: "Flex",
  props: {
    ...spacingProps,
    direction: ["row", "column", "row-reverse", "column-reverse"],
    wrap: BOOL,
    align: MAIN,
    alignX: CROSS,
    alignY: CROSS,
    justify: JUSTIFY,
  },
  derive(e, bp) {
    const direction = str(e.direction) ?? "row";
    const row = direction.startsWith("row");
    const [mainProp, crossProp] = row ? ["alignX", "alignY"] : ["alignY", "alignX"];
    const main = str(e[mainProp] ?? e.align);
    if (
      e.justify === undefined &&
      main !== undefined &&
      !(MAIN as readonly string[]).includes(main)
    ) {
      throw layoutError(
        "Flex",
        `"${mainProp}" value ${describe(main)} maps to justify-content (main axis) at breakpoint ` +
          `"${bp}" where direction is "${direction}"; the main axis accepts start, center or end. ` +
          `Use "justify" for distribution.`,
      );
    }
    return compact({
      ...spacing(e),
      dir: str(e.direction),
      fw: wrapToken(e.wrap),
      jc: str(e.justify) ?? main,
      ai: str(e[crossProp] ?? e.align),
    });
  },
};
