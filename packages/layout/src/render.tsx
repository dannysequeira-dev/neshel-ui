/**
 * Element rendering shared by every primitive (ADR 0009): `as` / `asChild` validation, Radix
 * Slot composition and separator insertion. Pure: no effects, no browser globals (SSR-safe).
 */
import { Slot } from "@radix-ui/react-slot";
import {
  Children,
  cloneElement,
  createElement,
  Fragment,
  isValidElement,
  type Key,
  type ReactElement,
  type ReactNode,
} from "react";
import { layoutError } from "./errors.js";
import type { LayoutElement } from "./types.js";
import { separatorVariants } from "./variants.js";

const layoutElements: readonly LayoutElement[] = [
  "div",
  "span",
  "section",
  "article",
  "aside",
  "header",
  "footer",
  "main",
  "nav",
  "ul",
  "ol",
  "li",
  "form",
  "fieldset",
  "figure",
  "address",
];

export type Orientation = "horizontal" | "vertical";

export interface RenderOptions {
  component: string;
  as: unknown;
  asChild: unknown;
  className: string | undefined;
  children: ReactNode;
  /** Remaining (native) props, including `ref`. */
  rest: Record<string, unknown>;
  separator?: { value: unknown; orientation: Orientation };
}

function separatorTag(host: unknown): "li" | "span" | "div" {
  if (host === "ul" || host === "ol") return "li";
  return host === "span" ? "span" : "div";
}

function itemKey(item: ReactNode, index: number): Key {
  return isValidElement(item) && item.key !== null ? item.key : `.${index}`;
}

/** Insert separators between the rendered items of `children` (FR-061–FR-063). */
function separate(
  children: ReactNode,
  separator: true | ReactElement,
  orientation: Orientation,
  host: unknown,
): ReactNode[] {
  const items = Children.toArray(children).filter((child) => child !== "");
  const output: ReactNode[] = [];
  items.forEach((item, index) => {
    if (index > 0) {
      const key = `neshel-separator:${String(itemKey(item, index))}`;
      output.push(
        separator === true
          ? createElement(separatorTag(host), {
              key,
              "aria-hidden": "true",
              className: separatorVariants({ orientation }),
            })
          : cloneElement(separator, { key }),
      );
    }
    output.push(item);
  });
  return output;
}

function activeSeparator(component: string, value: unknown): true | ReactElement | undefined {
  if (value === undefined || value === null || value === false) return undefined;
  if (value === true || isValidElement(value)) return value as true | ReactElement;
  throw layoutError(
    component,
    `"separator" must be a boolean or a React element; received ${typeof value}.`,
  );
}

export function renderLayout({
  component,
  as,
  asChild,
  className,
  children,
  rest,
  separator,
}: RenderOptions): ReactElement {
  const hasAs = as !== undefined && as !== null;
  if (hasAs && asChild) {
    throw layoutError(
      component,
      `"as" and "asChild" cannot be combined; use "as" to choose the element, or "asChild" to ` +
        `apply the layout to your own child element.`,
    );
  }
  const sep = separator ? activeSeparator(component, separator.value) : undefined;

  if (asChild) {
    if (!isValidElement(children)) {
      throw layoutError(
        component,
        `asChild expects exactly one React element child (received ${describeChildren(children)}).`,
      );
    }
    let child: ReactElement<{ children?: ReactNode }> = children as ReactElement<{
      children?: ReactNode;
    }>;
    if (child.type === Fragment) {
      throw layoutError(
        component,
        "asChild expects exactly one React element child, not a Fragment (a Fragment cannot " +
          "receive className or ref).",
      );
    }
    if (sep && separator) {
      if (typeof child.type !== "string") {
        throw layoutError(
          component,
          `"separator" with "asChild" requires a DOM element child (such as <ul> or <section>); ` +
            `a component child may render its children anywhere.`,
        );
      }
      child = cloneElement(child, {
        children: separate(child.props.children, sep, separator.orientation, child.type),
      });
    }
    return (
      <Slot {...rest} className={className}>
        {child}
      </Slot>
    );
  }

  if (hasAs && !(layoutElements as readonly unknown[]).includes(as)) {
    throw layoutError(
      component,
      `invalid value ${JSON.stringify(as)} for "as"; expected one of: ${layoutElements.join(", ")}. ` +
        `Use "asChild" for other elements or components.`,
    );
  }
  const Tag = (hasAs ? as : "div") as LayoutElement;
  const content = sep && separator ? separate(children, sep, separator.orientation, Tag) : children;
  return (
    <Tag {...rest} className={className}>
      {content}
    </Tag>
  );
}

function describeChildren(children: ReactNode): string {
  const count = Children.count(children);
  if (count === 0) return "no children";
  if (count > 1) return `${count} children`;
  if (typeof children === "string" || typeof children === "number") return "text";
  return typeof children;
}

/** `true` when a responsive boolean is `true` at any breakpoint. */
export function anyTrue(value: unknown): boolean {
  if (value === true) return true;
  if (typeof value === "object" && value !== null) {
    return Object.values(value).some((item) => item === true);
  }
  return false;
}
