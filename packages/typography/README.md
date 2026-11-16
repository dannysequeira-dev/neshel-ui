# @neshel-ui/typography

[![@neshel-ui/typography npm version](https://img.shields.io/npm/v/@neshel-ui/typography?style=flat-square&logo=npm&label=npm)](https://www.npmjs.com/package/@neshel-ui/typography) [![@neshel-ui/typography monthly downloads](https://img.shields.io/npm/dm/@neshel-ui/typography?style=flat-square&logo=npm&label=downloads%2Fmonth)](https://www.npmjs.com/package/@neshel-ui/typography)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white) ![React 19](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=0D1B39) [![MIT License](https://img.shields.io/github/license/dannysequeira-dev/neshel-ui?style=flat-square&color=D9B86A)](https://github.com/dannysequeira-dev/neshel-ui/blob/main/LICENSE)

Semantic, metrics-aware React typography: `Heading`, `Text`, `Paragraph` and `Caption`, with
Capsize trimming driven by your fonts' metrics and responsive props for the breakpoints your
application configures.

**Status:** 0.1.0, the first public release (pre-1.0: breaking changes bump the minor version and are called out in the [changelog](./CHANGELOG.md)). Verified from the packed tarball in external applications on Linux, Windows and macOS. Documentation (English and Spanish): https://neshel-ui.vercel.app

```sh
pnpm add @neshel-ui/typography @neshel-ui/config react
```

```css
@import "@neshel-ui/config/tokens.css"; /* or tailwind.css after @import "tailwindcss" */
@import "@neshel-ui/typography/styles.css";
```

```tsx
import { Heading, Paragraph, Text } from "@neshel-ui/typography";

<Heading as="h1" size={{ base: "2xl", md: "4xl" }}>Welcome</Heading>
<Paragraph tone="muted" measure="comfortable">Rooted in faith. Built with hope.</Paragraph>
<Text asChild weight="medium"><a href="/docs">Documentation</a></Text>
```

- React 19 peer; `@neshel-ui/config` peer (tokens and breakpoint types).
- Precompiled CSS in `@layer components.neshel`; no Tailwind or `@source` needed.
- Your application loads its fonts; pass their metrics in `neshel.config.ts` for precise trimming.

Guide: https://github.com/dannysequeira-dev/neshel-ui/blob/main/docs/typography.md
