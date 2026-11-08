/**
 * Responsive props (ADR 0010): one class per written key, `base` first; the default fills a
 * missing `base`. Keys follow the shared grammar; unknown well-formed keys warn in the browser.
 */
import { responsiveClassName, type TableKey } from "../style-constants.js";
import { isBreakpointKey, warnUnknownBreakpoint } from "./breakpoint-check.js";
import { componentsError } from "./errors.js";
import { describe, present } from "./validate.js";

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function checkKey(component: string, prop: string, key: string): void {
  if (!isBreakpointKey(key)) {
    throw componentsError(
      component,
      `invalid breakpoint key ${JSON.stringify(key)} in "${prop}"; use "base" or a breakpoint name (lower camelCase, e.g. "md" or "tablet").`,
    );
  }
  warnUnknownBreakpoint(`[@neshel-ui/components] <${component}>`, key);
}

/** Classes for a responsive value prop such as Button `size`. */
export function responsiveClasses(
  component: string,
  prop: string,
  value: unknown,
  allowed: readonly string[],
  key: TableKey,
  fallback: string | undefined,
): string[] {
  const entries: Array<readonly [string, string]> = [];
  const check = (item: unknown, where: string) => {
    if (!allowed.includes(item as string)) {
      throw componentsError(
        component,
        `invalid value ${describe(item)} for "${prop}"${where}; expected one of: ${allowed.map(describe).join(", ")}.`,
      );
    }
  };
  if (isPlainObject(value)) {
    for (const [breakpoint, item] of Object.entries(value)) {
      checkKey(component, prop, breakpoint);
      if (!present(item)) continue;
      check(item, ` at breakpoint "${breakpoint}"`);
      entries.push([breakpoint, item as string]);
    }
  } else if (present(value)) {
    check(value, "");
    entries.push(["base", value as string]);
  }
  entries.sort(([a], [b]) => (a === "base" ? -1 : b === "base" ? 1 : 0));
  if (fallback !== undefined && entries[0]?.[0] !== "base") entries.unshift(["base", fallback]);
  return entries.map(([breakpoint, token]) => responsiveClassName(breakpoint, key, token));
}

/**
 * Class enabling a one-token table (`shell-desktop`, `navbar-nav-visible`, `menu-desktop`) from a
 * breakpoint name: `"base"` applies everywhere, a name applies at and above its threshold.
 */
export function breakpointClass(
  component: string,
  prop: string,
  breakpoint: unknown,
  key: TableKey,
  token: string,
): string {
  if (typeof breakpoint !== "string") {
    throw componentsError(
      component,
      `"${prop}" must be a breakpoint name or "base"; received ${describe(breakpoint)}.`,
    );
  }
  checkKey(component, prop, breakpoint);
  return responsiveClassName(breakpoint, key, token);
}
