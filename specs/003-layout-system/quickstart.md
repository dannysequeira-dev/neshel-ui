# Quickstart — Feature 003 (layout)

Nothing is published; consume the packed tarball as in `docs/package-contracts.md`.

## Install (from tarballs)

```text
pnpm build:packages
cd packages/config && pnpm pack --pack-destination <dir>
cd packages/layout && pnpm pack --pack-destination <dir>
# consumer:
pnpm add react react-dom file:<dir>/neshel-ui-config-0.0.0.tgz file:<dir>/neshel-ui-layout-0.0.0.tgz
```

## Styles

With Tailwind v4:

```css
@import "tailwindcss";
@import "@neshel-ui/config/tailwind.css";
@import "@neshel-ui/layout/styles.css";
```

Without Tailwind:

```css
@import "@neshel-ui/config/tokens.css";
@import "@neshel-ui/layout/styles.css";
```

## Use

```tsx
import { Container, Grid, Inline, Stack } from "@neshel-ui/layout";

export function Page() {
  return (
    <Container size="lg" gutter={{ base: "4", md: "8" }}>
      <Stack space="6">
        <Inline as="nav" aria-label="Main" justify="between" align="center" separator>
          <a href="/">Home</a>
          <a href="/docs">Docs</a>
        </Inline>
        <Grid columns={{ base: 1, md: 2, lg: 4 }} space={{ base: "2", md: "4" }}>
          <article>…</article>
        </Grid>
      </Stack>
    </Container>
  );
}
```

## Verify

```text
pnpm check            # lint, typecheck (incl. type fixtures), tests, build, pack checks
pnpm check:consumer   # Tailwind / plain / configured consumers (layout in the first two)
pnpm check:browser    # computed styles, viewports, hydration (needs Chrome/Edge)
pnpm build:storybook
```
