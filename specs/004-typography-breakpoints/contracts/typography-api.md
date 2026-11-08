# Contract — `@neshel-ui/typography` API

Feature 004; research R9–R12; ADR 0011. Composition follows ADR 0009.

## Exports

`Heading`, `Text`, `Paragraph`, `Caption`, `NeshelTypographyError`, and the types
`HeadingProps`, `TextProps`, `ParagraphProps`, `CaptionProps`, `TypographyProps`, `TextSize`,
`TextWeight`, `TextAlign`, `TextLeading`, `TextTone`, `TextTracking`, `TextMeasure`, `TextWrap`,
`FontRole`, `HeadingElement`, `TextElement`, `ParagraphElement`, `CaptionElement`, `Breakpoint`,
`Responsive`. Stylesheet `@neshel-ui/typography/styles.css`; manifest
`@neshel-ui/typography/style-manifest.json` (CLI contract).

## Shared props (`TypographyProps`)

| Prop       | Type                                                       | Responsive | Default        |
| ---------- | ---------------------------------------------------------- | ---------- | -------------- |
| `size`     | `"xs" "sm" "base" "lg" "xl" "2xl" "3xl" "4xl" "5xl" "6xl"` | yes        | per component  |
| `weight`   | `"light" "regular" "medium" "semibold" "bold"`             | yes        | per component  |
| `align`    | `"start" "center" "end" "justify"`                         | yes        | — (inherit)    |
| `leading`  | `"none" "tight" "snug" "normal" "relaxed" "loose"`         | yes        | size's leading |
| `tone`     | `"default" "muted" "primary" "destructive"`                | no         | per component  |
| `family`   | `"body" "display" "mono"`                                  | no         | per component  |
| `tracking` | `"tight" "normal" "wide"`                                  | no         | — (inherit)    |
| `measure`  | `"narrow" "comfortable" "wide" "none"`                     | no         | — (none)       |
| `wrap`     | `"wrap" "nowrap" "balance" "pretty"`                       | no         | — (inherit)    |
| `truncate` | `boolean` — one line with an ellipsis; removes trimming    | no         | `false`        |

Plus native attributes of `HTMLAttributes<HTMLElement>` (minus the names above), `className`,
`style`, `ref?: Ref<HTMLElement>` (React 19 ref-as-prop) and `children`.

`trim?: boolean` (Capsize trimming) exists on `Heading`, `Paragraph` and `Caption` (default
`true`). It is ignored (no trimming) when `truncate` is set or when the rendered host element is an
inline element (`a abbr b bdi bdo cite code data del dfn em i ins kbd label mark q s samp small
span strong sub sup time u var`).

`as` and `asChild` are mutually exclusive (type and runtime).

## Components

| Component   | `as` (closed list)                                                                                                                                        | Default element | Defaults                                                                                                             |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------- |
| `Heading`   | `h1`–`h6`                                                                                                                                                 | `h2`            | size by level (h1 `4xl`, h2 `3xl`, h3 `2xl`, h4 `xl`, h5 `lg`, h6 `base`), weight `semibold`, family `display`, trim |
| `Paragraph` | `p`, `div`                                                                                                                                                | `p`             | size `base`, family `body`, trim                                                                                     |
| `Caption`   | `p`, `span`, `div`, `small`, `figcaption`                                                                                                                 | `p`             | size `sm`, tone `muted`, family `body`, trim                                                                         |
| `Text`      | `span`, `p`, `div`, `strong`, `em`, `b`, `i`, `small`, `code`, `kbd`, `samp`, `mark`, `abbr`, `cite`, `q`, `s`, `del`, `ins`, `sub`, `sup`, `time`, `dfn` | `span`          | none: inherits size, family, weight, colour; no trimming                                                             |

- The default size of `Heading` depends only on the rendered level, never the other way round:
  `size` never changes the element.
- `Heading` with `asChild` uses the `h2` defaults unless `size` is given.
- Responsive objects without `base` use the component default (if any) below the first written
  breakpoint (R7).

## Behaviour

- Pure render, no effects; identical markup on server and client (the breakpoint warning of
  [breakpoints.md](breakpoints.md) §3 runs only on the client and never changes markup).
- `asChild`: exactly one non-Fragment React element child; className joined, style merged (child
  wins), handlers composed, refs composed (Radix Slot). A component child must forward `className`
  and `ref`; inline-element detection only applies to DOM element children.
- Errors (`NeshelTypographyError`, message prefix `[@neshel-ui/typography] <Component>:`): `as` +
  `asChild`; invalid `as`; invalid `asChild` children; malformed breakpoint keys; invalid values
  for any prop. `null` means absent.

## Examples

```tsx
<Heading as="h1" size={{ base: "xl", tablet: "3xl", desktop: "5xl" }} weight={{ base: "medium", tablet: "bold" }}>
  Welcome to Neshel-UI
</Heading>
<Paragraph size="base" measure="comfortable" tone="muted">Beautiful typography begins with precision.</Paragraph>
<Text asChild size="sm" weight="medium"><a href="/docs">Documentation</a></Text>
<Caption asChild><figcaption>Figure 1</figcaption></Caption>
```
