# @neshel-ui/layout

Composable, responsive and accessible React layout primitives: `Box`, `Flex`, `Stack`, `Inline`,
`Grid`, `Center` and `Container`.

**Status:** release candidate for 0.1.0 — **not published to npm yet**. Verified from the packed
tarball in external applications on Linux, Windows and macOS. Documentation: the
official site in [`apps/docs`](https://github.com/dannysequeira-dev/neshel-ui/tree/main/apps/docs) (English and Spanish); pre-publication installation:
`node scripts/pack-local.mjs` in the repository.

```css
@import "@neshel-ui/config/tokens.css"; /* or tailwind.css after @import "tailwindcss" */
@import "@neshel-ui/layout/styles.css";
```

```tsx
import { Grid, Inline, Stack } from "@neshel-ui/layout";

<Stack space="6">
  <Inline justify="between" align="center" separator>
    <a href="/">Home</a>
    <a href="/docs">Docs</a>
  </Inline>
  <Grid columns={{ base: 1, md: 3 }} spaceX="4" spaceY="2">
    {cards}
  </Grid>
</Stack>;
```

- Responsive keys: `base` plus `sm md lg xl 2xl`, or your own names from `neshel.config.ts`
  (`neshel generate`; see the layout guide's _Custom breakpoints_). Peer: `@neshel-ui/config`.
- Spacing: `space` (`gap`) or `spaceX` / `spaceY` (`column-gap` / `row-gap`), never both kinds.
- Alignment: `align`, `alignX`, `alignY`, `justify`, with precedence
  `justify` > `alignX`/`alignY` > `align`.
- Responsive values: `{ base, sm, md, lg, xl, "2xl" }` (40/48/64/80/96rem).
- Composition: `as`, `asChild` (one element child), React 19 refs; separators on Stack and Inline.
- Precompiled CSS in `@layer components.neshel`; no Tailwind build or `@source` needed.
- Peer: `react ^19.0.0`. Runtime dependencies: `@radix-ui/react-slot`, `tailwind-variants`.

Guide: https://github.com/dannysequeira-dev/neshel-ui/blob/main/docs/layout.md

Contracts and compatibility: https://github.com/dannysequeira-dev/neshel-ui/blob/main/docs/package-contracts.md
