# Contract — `@neshel-ui/layout` React API

> **Amended by feature 004** ([ADR 0010](../../../docs/decisions/0010-custom-breakpoints.md)):
> responsive keys are `base` plus the application's breakpoint names (`BreakpointName` from
> `@neshel-ui/config`); malformed keys throw, unknown well-formed keys warn in the browser.

Status: **implemented and CI-verified** (feature 003). Package entry: `.`
(`dist/index.js` + `dist/index.d.ts`). Peer: `react ^19.0.0`.

## Exports

Components: `Box`, `Flex`, `Stack`, `Inline`, `Grid`, `Center`, `Container`.

Types: `BoxProps`, `FlexProps`, `StackProps`, `InlineProps`, `GridProps`, `CenterProps`,
`ContainerProps`, `Breakpoint`, `Responsive`, `SpaceValue`, `SpacingProps`, `MainAxisAlign`,
`CrossAxisAlign`, `GridAlign`, `Justify`, `FlexDirection`, `GridColumns`, `BoxDisplay`,
`ContainerSize`, `LayoutElement`, `PolymorphicProps`, `SeparatorProp`.

No other runtime export. Internal modules (`style-tables`, `resolve`, `variants`, `render`) are
not reachable through `exports`.

## Shared types

```ts
type Breakpoint = "base" | "sm" | "md" | "lg" | "xl" | "2xl";
type Responsive<T> = T | { readonly [K in Breakpoint]?: T };

type SpaceValue =
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

type SpacingProps =
  | { space?: Responsive<SpaceValue>; spaceX?: never; spaceY?: never }
  | { space?: never; spaceX?: Responsive<SpaceValue>; spaceY?: Responsive<SpaceValue> };

type MainAxisAlign = "start" | "center" | "end";
type CrossAxisAlign = MainAxisAlign | "stretch" | "baseline";
type GridAlign = MainAxisAlign | "stretch";
type Justify = "start" | "center" | "end" | "between" | "around" | "evenly";

type LayoutElement =
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

type PolymorphicProps = { as?: LayoutElement; asChild?: false } | { as?: never; asChild: true };

// Every primitive also accepts:
type CommonProps = React.HTMLAttributes<HTMLElement> & { ref?: React.Ref<HTMLElement> };
type SeparatorProp = boolean | React.ReactElement;
```

## Components

| Component   | Specific props                                                                                                                                                                                                                        | Spacing | Axis mapping (X / Y)                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------- |
| `Box`       | `display?: Responsive<"none" \| "block" \| "inline" \| "inline-block">`                                                                                                                                                               | —       | —                                                           |
| `Flex`      | `direction?: Responsive<"row" \| "column" \| "row-reverse" \| "column-reverse">`, `wrap?: Responsive<boolean>`, `align?: Responsive<MainAxisAlign>`, `alignX?`/`alignY?: Responsive<CrossAxisAlign>`, `justify?: Responsive<Justify>` | yes     | by direction (row: jc / ai, column: ai / jc)                |
| `Stack`     | `align?: Responsive<MainAxisAlign>`, `alignX?: Responsive<"start" \| "center" \| "end" \| "stretch">`, `alignY?: Responsive<MainAxisAlign>`, `justify?: Responsive<Justify>`, `separator?: SeparatorProp`                             | yes     | `align-items` / `justify-content`                           |
| `Inline`    | `align?: Responsive<MainAxisAlign>`, `alignX?: Responsive<MainAxisAlign>`, `alignY?: Responsive<CrossAxisAlign>`, `justify?: Responsive<Justify>`, `wrap?: Responsive<boolean>`, `separator?: SeparatorProp`                          | yes     | `justify-content` / `align-items`                           |
| `Grid`      | `columns?: Responsive<1 \| 2 \| … \| 12>`, `align?`/`alignX?`/`alignY?: Responsive<GridAlign>`                                                                                                                                        | yes     | `justify-items` / `align-items`                             |
| `Center`    | `align?`/`alignX?: Responsive<MainAxisAlign>`, `alignY?: Responsive<CrossAxisAlign>`                                                                                                                                                  | yes     | `justify-content` / `align-items`, both `center` by default |
| `Container` | `size?: Responsive<"sm" \| "md" \| "lg" \| "xl" \| "2xl" \| "full">` (default `xl`), `gutter?: Responsive<SpaceValue>`                                                                                                                | —       | —                                                           |

All seven accept `CommonProps & PolymorphicProps`. Flex, Stack, Inline, Grid and Center also
accept `SpacingProps`.

## Semantics

1. **Rendering**: one element (default `div`, or `as`, or the `asChild` child). Layout props are
   consumed; every other prop is forwarded. `className` is appended after layout classes; `style`
   is forwarded unchanged.
2. **Responsive cascade**: for each prop, the value at breakpoint `b` is the value of the largest
   defined key `≤ b` (`base` < `sm` < `md` < `lg` < `xl` < `2xl`). A scalar equals `{ base }`.
3. **Precedence** (per breakpoint, after cascading): `justify` > `alignX`/`alignY` > `align`.
   `align` provides both axes; the axis props override one axis; `justify` overrides the
   main-axis (`justify-content`) value.
4. **Flex**: at each breakpoint, row directions map X→`justify-content`, Y→`align-items`; column
   directions map X→`align-items`, Y→`justify-content`. When a direction change leaves a property
   without a value, it is reset to `normal`. A `stretch`/`baseline` value that lands on
   `justify-content` throws.
5. **Defaults**: no alignment, gap, wrap or direction classes unless props are given (Center's
   base class centres both axes; Container's default `size` is `xl`).
6. **Logical axes**: `start`/`end` are logical; in RTL, X `start` is the right edge; `row-reverse`
   does not change X semantics. Vertical writing modes: not supported.

## `asChild`

- Requires exactly one valid React element child that is not a `Fragment`.
- Merging (Radix Slot): `className` joined (layout classes first, then the primitive's
  `className`, then the child's), `style` shallow-merged with child precedence, handlers composed
  (child first, then primitive), refs composed, other props: child wins.
- The child must forward `className` and `ref` to a DOM element; otherwise styles/ref are lost
  (documented, not detectable).

## Separators (`Stack`, `Inline`)

- `true` → default separator; element → that element (cloned only to set `key`); `false` /
  `undefined` → children untouched.
- Items = `Children.toArray(children)` minus `""`. Separators only between items. Fragments count
  as one item.
- Default separator: `aria-hidden="true"`, classes `neshel-separator` + orientation; tag `li` if
  the host tag is `ul`/`ol`, `span` if `span`, else `div`. Key `neshel-separator:<next item key>`.
- `asChild` + separator: host-element child → separators inserted into the child's children;
  component child → error.
- Separator + any truthy `wrap` (scalar or any breakpoint) → error.

## Errors

All errors are `Error` instances with `name === "NeshelLayoutError"` and messages starting with
`[@neshel-ui/layout] <Component>:`. Thrown during render (server and client alike).

| Condition                                        | Message contains                                               |
| ------------------------------------------------ | -------------------------------------------------------------- |
| `space` with `spaceX` and/or `spaceY`            | `"space" cannot be combined with "spaceX"` (and/or `"spaceY"`) |
| `as` with `asChild`                              | `"as" and "asChild" cannot be combined`                        |
| `asChild` child count ≠ 1, non-element, Fragment | `asChild expects exactly one React element child` / `Fragment` |
| unknown breakpoint key                           | `unknown breakpoint "<key>" in "<prop>"`                       |
| invalid value                                    | `invalid value <value> for "<prop>"` + allowed values          |
| Flex main-axis `stretch`/`baseline`              | `maps to justify-content` + breakpoint                         |
| separator + wrap                                 | `"separator" cannot be combined with "wrap"`                   |
| separator + asChild component child              | `"separator" with "asChild" requires a DOM element child`      |
| invalid separator value                          | `"separator" must be a boolean or a React element`             |

`null` is treated as absent for every layout prop.
