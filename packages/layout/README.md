# @neshel-ui/layout

[![@neshel-ui/layout npm version](https://img.shields.io/npm/v/@neshel-ui/layout?style=flat-square&logo=npm&label=npm)](https://www.npmjs.com/package/@neshel-ui/layout) [![@neshel-ui/layout monthly downloads](https://img.shields.io/npm/dm/@neshel-ui/layout?style=flat-square&logo=npm&label=downloads%2Fmonth)](https://www.npmjs.com/package/@neshel-ui/layout)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white) ![React 19](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=0D1B39) [![MIT License](https://img.shields.io/github/license/dannysequeira-dev/neshel-ui?style=flat-square&color=D9B86A)](https://github.com/dannysequeira-dev/neshel-ui/blob/main/LICENSE)

Composable, responsive and accessible React layout primitives: `Box`, `Flex`, `Stack`, `Inline`,
`Grid`, `Center` and `Container`.

**Status:** 0.1.0, the first public release (pre-1.0: breaking changes bump the minor version and are called out in the [changelog](./CHANGELOG.md)). Verified from the packed tarball in external applications on Linux, Windows and macOS. Documentation (English and Spanish): https://neshel-ui.vercel.app

```sh
pnpm add @neshel-ui/layout @neshel-ui/config react
```

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
