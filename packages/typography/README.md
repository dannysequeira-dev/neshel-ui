# @neshel-ui/typography

Semantic, metrics-aware React typography: `Heading`, `Text`, `Paragraph` and `Caption`, with
Capsize trimming driven by your fonts' metrics and responsive props for the breakpoints your
application configures.

**Status:** release candidate for 0.1.0 — **not published to npm yet**. Verified from the packed
tarball in external applications on Linux, Windows and macOS. Documentation: the
official site in [`apps/docs`](https://github.com/dannysequeira-dev/neshel-ui/tree/main/apps/docs) (English and Spanish); pre-publication installation:
`node scripts/pack-local.mjs` in the repository.

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
