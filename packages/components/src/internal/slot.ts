/** `asChild` child validation shared by every component (ADR 0009 §2). */
import { Children, Fragment, isValidElement, type ReactElement, type ReactNode } from "react";
import { componentsError } from "./errors.js";

function describeChildren(children: ReactNode): string {
  const count = Children.count(children);
  if (count === 0) return "no children";
  if (count > 1) return `${count} children`;
  if (typeof children === "string" || typeof children === "number") return "text";
  return typeof children;
}

/** The single element child required by `asChild`, or a `NeshelComponentsError`. */
export function asChildElement(component: string, children: ReactNode): ReactElement {
  if (!isValidElement(children)) {
    throw componentsError(
      component,
      `asChild expects exactly one React element child (received ${describeChildren(children)}).`,
    );
  }
  if (children.type === Fragment) {
    throw componentsError(
      component,
      "asChild expects exactly one React element child, not a Fragment (a Fragment cannot receive className or ref).",
    );
  }
  return children;
}

/** Throws when `as` and `asChild` are combined, or `as` is outside the closed list. */
export function checkAs(
  component: string,
  as: unknown,
  asChild: unknown,
  elements: readonly string[],
): void {
  const hasAs = as !== undefined && as !== null;
  if (hasAs && asChild) {
    throw componentsError(
      component,
      `"as" and "asChild" cannot be combined; use "as" to choose the element, or "asChild" to style your own child element.`,
    );
  }
  if (hasAs && !elements.includes(as as string)) {
    throw componentsError(
      component,
      `invalid value ${JSON.stringify(as)} for "as"; expected one of: ${elements.join(", ")}. Use "asChild" for other elements or components.`,
    );
  }
}
