/**
 * Badge (FR-025), Input and Label (FR-030, FR-040), VisuallyHidden (FR-040), Separator (FR-035)
 * and Skeleton (FR-038). Presentational and server-safe (no hooks, no "use client").
 */
import { Slot } from "@radix-ui/react-slot";
import type {
  CSSProperties,
  HTMLAttributes,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  Ref,
} from "react";
import { tv } from "tailwind-variants/lite";
import { componentsError } from "./internal/errors.js";
import { asChildElement } from "./internal/slot.js";
import { cx, flag, oneOf } from "./internal/validate.js";
import { badgeVariants } from "./style-tables.js";
import type { FieldSize } from "./types.js";

// ---------------------------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------------------------

export type BadgeVariant = keyof typeof badgeVariants | "outline";
export type BadgeSize = "sm" | "md";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  ref?: Ref<HTMLSpanElement>;
}

const BADGE_VARIANTS = [...Object.keys(badgeVariants), "outline"] as BadgeVariant[];

const badge = tv({
  base: "neshel-badge",
  variants: {
    variant: Object.fromEntries(
      BADGE_VARIANTS.map((name) => [name, `neshel-badge-variant-${name}`]),
    ) as Record<BadgeVariant, string>,
    size: { sm: "neshel-badge-size-sm", md: "neshel-badge-size-md" },
  },
});

/** Non-interactive status label. Add `role="status"` yourself only for live updates. */
export function Badge({ variant, size, className, ...rest }: BadgeProps) {
  return (
    <span
      {...rest}
      className={badge({
        variant: oneOf("Badge", "variant", variant, BADGE_VARIANTS, "default"),
        size: oneOf("Badge", "size", size, ["sm", "md"] as const, "md"),
        class: typeof className === "string" ? className : undefined,
      })}
    />
  );
}

// ---------------------------------------------------------------------------------------------
// Field size classes (Input, Select, MultiSelect, Combobox)
// ---------------------------------------------------------------------------------------------

const FIELD_SIZES: readonly FieldSize[] = ["sm", "md", "lg"];

/** `neshel-field-size-<size>` after validating `uiSize`. */
export function fieldSizeClass(component: string, uiSize: unknown): string {
  return `neshel-field-size-${oneOf(component, "uiSize", uiSize, FIELD_SIZES, "md")}`;
}

// ---------------------------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------------------------

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Styling size; the native numeric `size` attribute keeps its HTML meaning. */
  uiSize?: FieldSize;
  /** Sets `aria-invalid="true"` unless `aria-invalid` is given explicitly. */
  invalid?: boolean;
  ref?: Ref<HTMLInputElement>;
}

/** Native `<input>`: controlled or uncontrolled, every native type and attribute. */
export function Input({ uiSize, invalid, className, ...rest }: InputProps) {
  const isInvalid = flag("Input", "invalid", invalid);
  return (
    <input
      {...rest}
      aria-invalid={rest["aria-invalid"] ?? (isInvalid ? true : undefined)}
      className={cx("neshel-input", fieldSizeClass("Input", uiSize), className)}
    />
  );
}

// ---------------------------------------------------------------------------------------------
// Label
// ---------------------------------------------------------------------------------------------

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  /** Shows a decorative "*" (hidden from assistive technology; use `required` on the control). */
  required?: boolean;
  ref?: Ref<HTMLLabelElement>;
}

export function Label({ required, className, children, ...rest }: LabelProps) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the consumer associates the control (htmlFor or nesting).
    <label {...rest} className={cx("neshel-label", className)}>
      {children}
      {flag("Label", "required", required) ? (
        <span className="neshel-label-required" aria-hidden="true">
          *
        </span>
      ) : null}
    </label>
  );
}

// ---------------------------------------------------------------------------------------------
// VisuallyHidden
// ---------------------------------------------------------------------------------------------

export interface VisuallyHiddenProps extends HTMLAttributes<HTMLSpanElement> {
  asChild?: boolean;
  ref?: Ref<HTMLSpanElement>;
}

/** Content for assistive technology only (remains in the accessibility tree). */
export function VisuallyHidden({ asChild, className, children, ...rest }: VisuallyHiddenProps) {
  const classValue = cx("neshel-visually-hidden", className);
  if (asChild) {
    return (
      <Slot {...rest} className={classValue}>
        {asChildElement("VisuallyHidden", children)}
      </Slot>
    );
  }
  return (
    <span {...rest} className={classValue}>
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------------------------
// Separator
// ---------------------------------------------------------------------------------------------

export interface SeparatorProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
  /** Purely visual: `role="none"` instead of `role="separator"`. */
  decorative?: boolean;
  ref?: Ref<HTMLDivElement>;
}

export function Separator({ orientation, decorative, className, ...rest }: SeparatorProps) {
  const value = oneOf(
    "Separator",
    "orientation",
    orientation,
    ["horizontal", "vertical"] as const,
    "horizontal",
  );
  if (rest.children !== undefined && rest.children !== null) {
    throw componentsError("Separator", "a separator cannot have children.");
  }
  const semantics = flag("Separator", "decorative", decorative)
    ? { role: "none" }
    : {
        role: "separator",
        ...(value === "vertical" ? { "aria-orientation": "vertical" as const } : {}),
      };
  return (
    <div
      {...rest}
      {...semantics}
      data-orientation={value}
      className={cx("neshel-rule", `neshel-rule-${value}`, className)}
    />
  );
}

// ---------------------------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------------------------

export interface SkeletonProps extends HTMLAttributes<HTMLSpanElement> {
  shape?: "rectangle" | "circle" | "text";
  /** Inline size; numbers are pixels. */
  width?: number | string;
  /** Block size; numbers are pixels. */
  height?: number | string;
  ref?: Ref<HTMLSpanElement>;
}

const length = (component: string, prop: string, value: unknown) => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return `${value}px`;
  if (typeof value === "string" && value.trim() !== "") return value;
  throw componentsError(
    component,
    `"${prop}" must be a non-negative number (pixels) or a CSS length string.`,
  );
};

/**
 * Decorative loading placeholder (`aria-hidden`). Mark the loading region with `aria-busy` and
 * announce completion yourself; a skeleton announces nothing.
 */
export function Skeleton({ shape, width, height, className, style, ...rest }: SkeletonProps) {
  const value = oneOf(
    "Skeleton",
    "shape",
    shape,
    ["rectangle", "circle", "text"] as const,
    "rectangle",
  );
  const inline = length("Skeleton", "width", width);
  const block = length("Skeleton", "height", height);
  const sized: CSSProperties = {
    ...(inline ? { inlineSize: inline } : {}),
    ...(block ? { blockSize: block } : {}),
    ...style,
  };
  return (
    <span
      {...rest}
      aria-hidden="true"
      style={Object.keys(sized).length > 0 ? sized : undefined}
      className={cx(
        "neshel-skeleton",
        value === "rectangle" ? undefined : `neshel-skeleton-shape-${value}`,
        className,
      )}
    />
  );
}
