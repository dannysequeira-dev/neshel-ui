/**
 * Shared rendering of the typography components (ADR 0009 composition, ADR 0010 responsive
 * classes, ADR 0011 trimming). Pure: no effects, no browser globals except the client-only
 * breakpoint diagnostic, which never changes markup.
 */
import { Slot } from "@radix-ui/react-slot";
import { Children, Fragment, isValidElement, type ReactElement, type ReactNode } from "react";
import { isBreakpointKey, warnUnknownBreakpoint } from "./breakpoint-check.js";
import { typographyError } from "./errors.js";
import {
  alignValues,
  fontRoles,
  leadingScale,
  measureValues,
  responsiveClassName,
  sizeScale,
  type TableKey,
  toneValues,
  trackingValues,
  weightScale,
  wrapValues,
} from "./style-tables.js";
import { typographyVariants } from "./variants.js";

/** Inline (phrasing) host elements: trimming pseudo-element blocks would break their flow. */
export const INLINE_ELEMENTS: readonly string[] = [
  "a",
  "abbr",
  "b",
  "bdi",
  "bdo",
  "cite",
  "code",
  "data",
  "del",
  "dfn",
  "em",
  "i",
  "ins",
  "kbd",
  "label",
  "mark",
  "q",
  "s",
  "samp",
  "small",
  "span",
  "strong",
  "sub",
  "sup",
  "time",
  "u",
  "var",
];

export interface Defaults {
  size?: string;
  weight?: string;
  tone?: string;
  family?: string;
}

export interface ComponentConfig {
  readonly name: string;
  readonly elements: readonly string[];
  readonly defaultElement: string;
  /** Component defaults for the rendered element (a DOM tag, or undefined for a component child). */
  defaults(element: string | undefined): Defaults;
  /** Whether the component supports Capsize trimming (`trim`, default true). */
  readonly trimmable: boolean;
}

type Scalar = string | boolean;

const RESPONSIVE: ReadonlyArray<
  readonly [prop: string, key: TableKey, allowed: readonly string[]]
> = [
  ["size", "text-size", Object.keys(sizeScale)],
  ["weight", "text-weight", Object.keys(weightScale)],
  ["align", "text-align", Object.keys(alignValues)],
  ["leading", "text-leading", Object.keys(leadingScale)],
];

const STATIC: ReadonlyArray<readonly [prop: string, prefix: string, allowed: readonly string[]]> = [
  ["family", "family", fontRoles],
  ["tone", "tone", Object.keys(toneValues)],
  ["tracking", "tracking", Object.keys(trackingValues)],
  ["measure", "measure", Object.keys(measureValues)],
  ["wrap", "wrap", Object.keys(wrapValues)],
];

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const describe = (value: unknown) =>
  typeof value === "string" ? JSON.stringify(value) : String(value);
const present = (value: unknown) => value !== undefined && value !== null;

function invalid(
  component: string,
  prop: string,
  value: unknown,
  allowed: readonly Scalar[],
  where = "",
) {
  return typographyError(
    component,
    `invalid value ${describe(value)} for "${prop}"${where}; expected one of: ${allowed.map(describe).join(", ")}.`,
  );
}

/** Written entries of a responsive prop (`base` first); the default fills a missing `base`. */
function responsiveEntries(
  component: string,
  prop: string,
  value: unknown,
  allowed: readonly string[],
  fallback: string | undefined,
): Array<readonly [string, string]> {
  const entries: Array<readonly [string, string]> = [];
  if (isPlainObject(value)) {
    for (const [key, item] of Object.entries(value)) {
      if (!isBreakpointKey(key)) {
        throw typographyError(
          component,
          `invalid breakpoint key ${JSON.stringify(key)} in "${prop}"; use "base" or a breakpoint name (lower camelCase, e.g. "md" or "tablet").`,
        );
      }
      if (!present(item)) continue;
      if (!allowed.includes(item as string)) {
        throw invalid(component, prop, item, allowed, ` at breakpoint "${key}"`);
      }
      warnUnknownBreakpoint(`[@neshel-ui/typography] <${component}>`, key);
      entries.push([key, item as string]);
    }
  } else if (present(value)) {
    if (!allowed.includes(value as string)) throw invalid(component, prop, value, allowed);
    entries.push(["base", value as string]);
  }
  entries.sort(([a], [b]) => (a === "base" ? -1 : b === "base" ? 1 : 0));
  if (fallback !== undefined && entries[0]?.[0] !== "base") entries.unshift(["base", fallback]);
  return entries;
}

function booleanProp(component: string, prop: string, value: unknown): boolean | undefined {
  if (!present(value)) return undefined;
  if (typeof value !== "boolean") throw invalid(component, prop, value, [true, false]);
  return value;
}

function describeChildren(children: ReactNode): string {
  const count = Children.count(children);
  if (count === 0) return "no children";
  if (count > 1) return `${count} children`;
  if (typeof children === "string" || typeof children === "number") return "text";
  return typeof children;
}

export function renderTypography(
  config: ComponentConfig,
  props: Record<string, unknown>,
): ReactElement {
  const {
    size,
    weight,
    align,
    leading,
    tone,
    family,
    tracking,
    measure,
    wrap,
    truncate,
    trim,
    as,
    asChild,
    className,
    children,
    ...rest
  } = props;
  const component = config.name;
  const hasAs = present(as);
  if (hasAs && asChild) {
    throw typographyError(
      component,
      `"as" and "asChild" cannot be combined; use "as" to choose the element, or "asChild" to ` +
        `style your own child element.`,
    );
  }
  if (hasAs && !config.elements.includes(as as string)) {
    throw typographyError(
      component,
      `invalid value ${describe(as)} for "as"; expected one of: ${config.elements.join(", ")}. ` +
        `Use "asChild" for other elements or components.`,
    );
  }
  if (!config.trimmable && present(trim)) {
    throw typographyError(component, `"trim" is not supported; ${component} is never trimmed.`);
  }

  let child: ReactElement | undefined;
  if (asChild) {
    if (!isValidElement(children)) {
      throw typographyError(
        component,
        `asChild expects exactly one React element child (received ${describeChildren(children as ReactNode)}).`,
      );
    }
    if (children.type === Fragment) {
      throw typographyError(
        component,
        "asChild expects exactly one React element child, not a Fragment (a Fragment cannot " +
          "receive className or ref).",
      );
    }
    child = children;
  }
  const host = child
    ? typeof child.type === "string"
      ? child.type
      : undefined
    : ((as as string | undefined) ?? config.defaultElement);
  const defaults = config.defaults(host);

  const classes: string[] = [];
  const statics: Record<string, unknown> = { family, tone, tracking, measure, wrap };
  for (const [prop, prefix, allowed] of STATIC) {
    const value = present(statics[prop]) ? statics[prop] : defaults[prop as keyof Defaults];
    if (value === undefined) continue;
    if (!allowed.includes(value as string)) throw invalid(component, prop, value, allowed);
    classes.push(`neshel-text-${prefix}-${value}`);
  }
  const responsive: Record<string, unknown> = { size, weight, align, leading };
  for (const [prop, key, allowed] of RESPONSIVE) {
    const fallback = defaults[prop as keyof Defaults];
    for (const [breakpoint, token] of responsiveEntries(
      component,
      prop,
      responsive[prop],
      allowed,
      fallback,
    )) {
      classes.push(responsiveClassName(breakpoint, key, token));
    }
  }
  const truncated = booleanProp(component, "truncate", truncate) === true;
  if (truncated) classes.push("neshel-text-truncate");
  const trimmed =
    config.trimmable &&
    booleanProp(component, "trim", trim) !== false &&
    !truncated &&
    !(host !== undefined && INLINE_ELEMENTS.includes(host));
  if (trimmed) classes.push("neshel-text-trim");
  if (typeof className === "string" && className) classes.push(className);

  const classValue = typographyVariants({ class: classes.join(" ") });
  if (child) {
    return (
      <Slot {...rest} className={classValue}>
        {child}
      </Slot>
    );
  }
  const Tag = host as "span";
  return (
    <Tag {...rest} className={classValue}>
      {children as ReactNode}
    </Tag>
  );
}
