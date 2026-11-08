import type { BreakpointName } from "@neshel-ui/config";
import type { HTMLAttributes, Ref } from "react";

/**
 * Responsive keys: `base` (no media query) plus the application's breakpoint names — the defaults
 * `sm md lg xl 2xl`, or the names configured in neshel.config.ts once the declarations generated
 * by `neshel generate` are part of the program (ADR 0010).
 */
export type Breakpoint = "base" | BreakpointName;

/** A value, or values per breakpoint that cascade upwards (mobile first). */
export type Responsive<T> = T | { readonly [K in Breakpoint]?: T };

export type TextSize = "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl";
export type TextWeight = "light" | "regular" | "medium" | "semibold" | "bold";
export type TextAlign = "start" | "center" | "end" | "justify";
export type TextLeading = "none" | "tight" | "snug" | "normal" | "relaxed" | "loose";
export type TextTone = "default" | "muted" | "primary" | "destructive";
export type TextTracking = "tight" | "normal" | "wide";
export type TextMeasure = "narrow" | "comfortable" | "wide" | "none";
export type TextWrap = "wrap" | "nowrap" | "balance" | "pretty";
export type FontRole = "body" | "display" | "mono";

export type HeadingElement = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
export type ParagraphElement = "p" | "div";
export type CaptionElement = "p" | "span" | "div" | "small" | "figcaption";
export type TextElement =
  | "span"
  | "p"
  | "div"
  | "strong"
  | "em"
  | "b"
  | "i"
  | "small"
  | "code"
  | "kbd"
  | "samp"
  | "mark"
  | "abbr"
  | "cite"
  | "q"
  | "s"
  | "del"
  | "ins"
  | "sub"
  | "sup"
  | "time"
  | "dfn";

type TypographyPropNames =
  | "size"
  | "weight"
  | "align"
  | "leading"
  | "tone"
  | "family"
  | "tracking"
  | "measure"
  | "wrap"
  | "truncate"
  | "trim"
  | "as"
  | "asChild"
  | "color";

/** Visual props shared by every typography component (contracts/typography-api.md). */
export interface TypographyProps extends Omit<HTMLAttributes<HTMLElement>, TypographyPropNames> {
  /** Size token; `font-size = token × the font role's cap-height scale`. */
  size?: Responsive<TextSize>;
  weight?: Responsive<TextWeight>;
  align?: Responsive<TextAlign>;
  /** Unitless line height; defaults to the size's leading. Drives Capsize trimming. */
  leading?: Responsive<TextLeading>;
  tone?: TextTone;
  family?: FontRole;
  tracking?: TextTracking;
  measure?: TextMeasure;
  wrap?: TextWrap;
  /** One line with an ellipsis (clips overflow, so trimming is removed). */
  truncate?: boolean;
  ref?: Ref<HTMLElement>;
}

/** `as` and `asChild` are mutually exclusive (also enforced at runtime). */
type Polymorphic<E extends string> = { as?: E; asChild?: false } | { as?: never; asChild: true };

interface Trimmable {
  /** Capsize trimming of the space above the cap height and below the baseline (default true). */
  trim?: boolean;
}

export type HeadingProps = TypographyProps & Trimmable & Polymorphic<HeadingElement>;
export type ParagraphProps = TypographyProps & Trimmable & Polymorphic<ParagraphElement>;
export type CaptionProps = TypographyProps & Trimmable & Polymorphic<CaptionElement>;
export type TextProps = TypographyProps & Polymorphic<TextElement>;
