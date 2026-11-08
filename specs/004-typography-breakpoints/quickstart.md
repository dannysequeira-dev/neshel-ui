# Quickstart — feature 004

## Zero-config

```css
@import "@neshel-ui/config/tokens.css"; /* or tailwind.css after @import "tailwindcss" */
@import "@neshel-ui/layout/styles.css";
@import "@neshel-ui/typography/styles.css";
```

```tsx
import { Stack } from "@neshel-ui/layout";
import { Heading, Paragraph } from "@neshel-ui/typography";

<Stack space={{ base: "3", md: "6" }}>
  <Heading as="h1" size={{ base: "2xl", md: "4xl" }}>
    Welcome to Neshel-UI
  </Heading>
  <Paragraph tone="muted" measure="comfortable">
    Rooted in faith. Built with hope.
  </Paragraph>
</Stack>;
```

## Custom breakpoints

1. `neshel.config.ts`:

   ```ts
   import { defineConfig } from "@neshel-ui/config";
   export default defineConfig({
     breakpoints: { mode: "replace", values: { tablet: "48rem", desktop: "64rem", wide: "96rem" } },
   });
   ```

2. `pnpm exec neshel generate` → `neshel.generated.css` and `neshel.generated.d.ts`.
3. Add `neshel.generated.d.ts` to `tsconfig.json` `include`.
4. Import `./neshel.generated.css` after the Neshel package stylesheets (or instead of them).
5. Use the names: `<Grid columns={{ base: 1, tablet: 2, desktop: 3 }} space="4">`.
6. Scripts: `"dev": "neshel generate && vite"`, `"build": "neshel generate && tsc --noEmit && vite build"`,
   CI: `neshel generate --check`.

## Fonts with Capsize metrics

```ts
import inter from "@capsizecss/metrics/inter";
import arial from "@capsizecss/metrics/arial";

export default defineConfig({
  typography: {
    families: { body: ["Inter", "system-ui", "sans-serif"] },
    metrics: { body: inter },
    fallbacks: { body: [arial] },
  },
});
```

The application loads Inter itself (self-hosted `@font-face` or any provider).

## Verify (repository)

```text
pnpm check            # lint, types, unit, build, package tests, exports, pack
pnpm check:consumer   # packed tarballs in external apps (network)
pnpm check:browser    # computed styles in headless Chrome
```
