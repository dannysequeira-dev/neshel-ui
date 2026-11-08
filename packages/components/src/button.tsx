/**
 * Button (FR-010–FR-012, research R5): a native `<button type="button">` by default, `asChild`
 * for links and router components. Server-safe (no hooks).
 */
import { Slot } from "@radix-ui/react-slot";
import type { ButtonHTMLAttributes, MouseEvent, Ref } from "react";
import { tv } from "tailwind-variants/lite";
import { devWarnOnce } from "./internal/dev.js";
import { componentsError } from "./internal/errors.js";
import { responsiveClasses } from "./internal/responsive.js";
import { asChildElement } from "./internal/slot.js";
import { flag, oneOf } from "./internal/validate.js";
import { buttonSizeNames, buttonVariantNames } from "./style-constants.js";
import type { Responsive } from "./types.js";

export type ButtonVariant = (typeof buttonVariantNames)[number];
export type ButtonSize = (typeof buttonSizeNames)[number];

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style (default `"primary"`). */
  variant?: ButtonVariant;
  /** Size, static or per breakpoint (default `"md"`). */
  size?: Responsive<ButtonSize>;
  /** Square button for a single icon; requires `aria-label` or `aria-labelledby`. */
  iconOnly?: boolean;
  /** Fill the inline size of the container. */
  fullWidth?: boolean;
  /**
   * Busy state: keeps focus (`aria-disabled`), ignores activation and form submission, shows a
   * decorative spinner. Announce progress with your own live region.
   */
  loading?: boolean;
  /** Render the single child element (e.g. a link) with the button styles. */
  asChild?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

const SIZES: readonly string[] = buttonSizeNames;

export const buttonVariants = tv({
  base: "neshel-button",
  variants: {
    variant: Object.fromEntries(
      buttonVariantNames.map((name) => [name, `neshel-button-variant-${name}`]),
    ) as Record<ButtonVariant, string>,
    iconOnly: { true: "neshel-button-icon-only" },
    fullWidth: { true: "neshel-button-full-width" },
  },
  defaultVariants: { variant: "primary" },
});

/** Class names of a Button; also used by parts that render buttons (closes, triggers). */
export function buttonClassName(
  component: string,
  options: {
    variant?: unknown;
    size?: unknown;
    iconOnly?: unknown;
    fullWidth?: unknown;
    className?: unknown;
  },
): string {
  const variant = oneOf(component, "variant", options.variant, buttonVariantNames, "primary");
  const sizeClasses = responsiveClasses(
    component,
    "size",
    options.size,
    SIZES,
    "button-size",
    "md",
  );
  const extra = typeof options.className === "string" ? options.className : "";
  return buttonVariants({
    variant,
    iconOnly: flag(component, "iconOnly", options.iconOnly),
    fullWidth: flag(component, "fullWidth", options.fullWidth),
    class: [...sizeClasses, extra].filter(Boolean).join(" "),
  });
}

function preventActivation(event: MouseEvent<HTMLButtonElement>) {
  event.preventDefault();
  event.stopPropagation();
}

export function Button(props: ButtonProps) {
  const {
    variant,
    size,
    iconOnly,
    fullWidth,
    loading,
    asChild,
    className,
    children,
    type,
    disabled,
    onClick,
    ...rest
  } = props;
  const component = "Button";
  const classValue = buttonClassName(component, { variant, size, iconOnly, fullWidth, className });
  const isLoading = flag(component, "loading", loading);
  if (iconOnly && !rest["aria-label"] && !rest["aria-labelledby"] && !rest.title) {
    devWarnOnce(
      "button-icon-only-name",
      "<Button iconOnly> needs an accessible name: pass aria-label or aria-labelledby.",
    );
  }

  if (asChild) {
    if (disabled) {
      throw componentsError(
        component,
        `"disabled" cannot be combined with "asChild": links and custom elements cannot be disabled. Render a native button, or remove the link (e.g. render text) while it is unavailable.`,
      );
    }
    if (isLoading) {
      throw componentsError(
        component,
        `"loading" cannot be combined with "asChild"; use a native button for busy actions.`,
      );
    }
    const child = asChildElement(component, children);
    return (
      <Slot {...rest} {...(type ? { type } : {})} onClick={onClick} className={classValue}>
        {child}
      </Slot>
    );
  }

  return (
    <button
      type={type ?? "button"}
      disabled={disabled}
      {...rest}
      className={classValue}
      aria-disabled={isLoading ? true : rest["aria-disabled"]}
      data-loading={isLoading ? "" : undefined}
      onClick={isLoading ? preventActivation : onClick}
    >
      {isLoading ? (
        <>
          <span className="neshel-button-spinner" aria-hidden="true" />
          <span className="neshel-button-content">{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
