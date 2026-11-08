# Quickstart — Feature 002 (target experience, not yet implemented)

This walk-through is the acceptance script for SC-007. Nothing is published; during development
the packages come from packed tarballs (see `docs/package-contracts.md`).

## 1. Zero-config with Tailwind

```css
/* src/index.css */
@import "tailwindcss";
@import "@neshel-ui/config/tailwind.css";
```

```tsx
<button className="rounded-neshel-md bg-neshel-primary px-4 py-2 text-neshel-primary-foreground">
  Continue
</button>;
```

## 2. Zero-config without Tailwind

```css
@import "@neshel-ui/config/tokens.css";

.card {
  background: var(--neshel-surface);
  color: var(--neshel-surface-foreground);
  border: 1px solid var(--neshel-border);
  border-radius: var(--neshel-radius-lg);
}
```

## 3. Switch themes (no provider)

```html
<html data-neshel-theme="system">        <!-- follow the OS -->
  <body>
    <aside data-neshel-theme="dark">…</aside>   <!-- nested scope -->
  </body>
</html>
```

No attribute means light. `light` and `dark` override the OS preference.

## 4. Configure a theme

```sh
pnpm add -D @neshel-ui/cli
```

```ts
// neshel.config.ts — executable, trusted project code (runs in Node only)
import { defineConfig } from "@neshel-ui/config";

export default defineConfig({
  themes: {
    light: { colors: { primary: "#1d3f73" } },
    sepia: { extends: "light", colors: { background: "#f4ecd8" } },
  },
  output: "./src/neshel.generated.css",
});
```

```jsonc
// package.json
"scripts": {
  "dev": "neshel generate && vite",
  "build": "neshel generate && vite build",
  "check:theme": "neshel generate --check --strict"
}
```

```css
/* src/index.css — canonical order */
@import "tailwindcss";
@import "@neshel-ui/config/tailwind.css";
@import "./neshel.generated.css";
```

```html
<section data-neshel-theme="sepia">…</section>
```

## 5. Diagnose

```text
$ pnpm neshel validate
error   themes.light.colors.primary   unsupported-color-syntax  Expected #hex, rgb(), hsl() or oklch(); received "navy".
neshel: 1 error — nothing written.
```

Exit codes: 0 ok · 1 invalid · 2 usage · 3 config not found/failed to load · 4 stale (`--check`) ·
5 I/O/internal.

## Verification record

When 002.5 runs this script against packed tarballs, record commands, OS, Node version and the
observed computed colours in `evidence.md`.
