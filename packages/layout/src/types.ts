import type { BreakpointName } from "@neshel-ui/config";
import type { HTMLAttributes, ReactElement, Ref } from "react";

/**
 * Responsive keys: `base` (no media query) plus the application's breakpoint names — the defaults
 * `sm md lg xl 2xl`, or the names configured in neshel.config.ts once the declarations generated
 * by `neshel generate` are part of the program (ADR 0010).
 */
export type Breakpoint = "base" | BreakpointName;

/** A value, or values per breakpoint that cascade upwards (mobile first). */
export type Responsive<T> = T | { readonly [K in Breakpoint]?: T };

/** Spacing token; CSS value `calc(var(--neshel-spacing) * n)`. */
export type SpaceValue =
  | "0"
  | "0.5"
  | "1"
  | "1.5"
  | "2"
  | "2.5"
  | "3"
  | "4"
  | "5"
  | "6"
  | "8"
  | "10"
  | "12"
  | "16"
  | "20"
  | "24";

/**
 * `space` (CSS `gap`) excludes `spaceX` (`column-gap`) and `spaceY` (`row-gap`); the latter two
 * may be combined. Also enforced at runtime.
 */
export type SpacingProps =
  | {
      space?: Responsive<SpaceValue>;
      spaceX?: never;
      spaceY?: never;
    }
  | {
      space?: never;
      spaceX?: Responsive<SpaceValue>;
      spaceY?: Responsive<SpaceValue>;
    };

/** Alignment on an axis that maps to `justify-content`. */
export type MainAxisAlign = "start" | "center" | "end";
/** Alignment on an axis that maps to `align-items`. */
export type CrossAxisAlign = MainAxisAlign | "stretch" | "baseline";
/** Grid item alignment (`justify-items` / `align-items`). */
export type GridAlign = MainAxisAlign | "stretch";
/** Main-axis distribution (`justify-content`). */
export type Justify = "start" | "center" | "end" | "between" | "around" | "evenly";

export type FlexDirection = "row" | "column" | "row-reverse" | "column-reverse";
export type GridColumns = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type BoxDisplay = "none" | "block" | "inline" | "inline-block";
export type ContainerSize = "sm" | "md" | "lg" | "xl" | "2xl" | "full";

/** Elements a primitive can render through `as`. Use `asChild` for anything else. */
export type LayoutElement =
  | "div"
  | "span"
  | "section"
  | "article"
  | "aside"
  | "header"
  | "footer"
  | "main"
  | "nav"
  | "ul"
  | "ol"
  | "li"
  | "form"
  | "fieldset"
  | "figure"
  | "address";

/** `as` and `asChild` are mutually exclusive (also enforced at runtime). */
export type PolymorphicProps =
  | { as?: LayoutElement; asChild?: false }
  | { as?: never; asChild: true };

/** `true` renders the default decorative separator; an element renders that element. */
export type SeparatorProp = boolean | ReactElement;

type LayoutPropNames =
  | "space"
  | "spaceX"
  | "spaceY"
  | "align"
  | "alignX"
  | "alignY"
  | "justify"
  | "direction"
  | "wrap"
  | "columns"
  | "display"
  | "size"
  | "gutter"
  | "separator"
  | "as"
  | "asChild";

/** Native attributes and the DOM ref shared by every primitive. */
export type CommonProps = Omit<HTMLAttributes<HTMLElement>, LayoutPropNames> & {
  ref?: Ref<HTMLElement>;
};

export type BoxProps = CommonProps &
  PolymorphicProps & {
    display?: Responsive<BoxDisplay>;
  };

export type FlexProps = CommonProps &
  PolymorphicProps &
  SpacingProps & {
    direction?: Responsive<FlexDirection>;
    wrap?: Responsive<boolean>;
    align?: Responsive<MainAxisAlign>;
    /** Validated at runtime against the axis it maps to for the active direction. */
    alignX?: Responsive<CrossAxisAlign>;
    alignY?: Responsive<CrossAxisAlign>;
    justify?: Responsive<Justify>;
  };

export type StackProps = CommonProps &
  PolymorphicProps &
  SpacingProps & {
    align?: Responsive<MainAxisAlign>;
    alignX?: Responsive<"start" | "center" | "end" | "stretch">;
    alignY?: Responsive<MainAxisAlign>;
    justify?: Responsive<Justify>;
    separator?: SeparatorProp;
  };

export type InlineProps = CommonProps &
  PolymorphicProps &
  SpacingProps & {
    align?: Responsive<MainAxisAlign>;
    alignX?: Responsive<MainAxisAlign>;
    alignY?: Responsive<CrossAxisAlign>;
    justify?: Responsive<Justify>;
    wrap?: Responsive<boolean>;
    separator?: SeparatorProp;
  };

export type GridProps = CommonProps &
  PolymorphicProps &
  SpacingProps & {
    columns?: Responsive<GridColumns>;
    align?: Responsive<GridAlign>;
    alignX?: Responsive<GridAlign>;
    alignY?: Responsive<GridAlign>;
  };

export type CenterProps = CommonProps &
  PolymorphicProps &
  SpacingProps & {
    align?: Responsive<MainAxisAlign>;
    alignX?: Responsive<MainAxisAlign>;
    alignY?: Responsive<CrossAxisAlign>;
  };

export type ContainerProps = CommonProps &
  PolymorphicProps & {
    size?: Responsive<ContainerSize>;
    gutter?: Responsive<SpaceValue>;
  };
