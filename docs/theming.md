# Theme and token model

**Status:** implemented in feature 002 (unpublished). Normative contracts:
[tokens](../specs/002-config-and-tokens/contracts/tokens.md),
[CSS and cascade](../specs/002-config-and-tokens/contracts/css.md),
[configuration API](../specs/002-config-and-tokens/contracts/config-api.md),
[CLI](../specs/002-config-and-tokens/contracts/cli.md); decisions in
[ADR 0006](decisions/0006-token-stylesheets-and-theme-cascade.md) and
[ADR 0007](decisions/0007-config-engine-and-cli-loading.md).

## Design principles

- Semantic tokens, never component-specific hardcoded colours (enforced for layout, typography
  and components by a test).
- Every text-bearing surface has a foreground/background pair with a documented minimum.
- Plain CSS custom properties first; Tailwind v4 integration is a separate stylesheet.
- No React provider and no runtime JavaScript for theme switching.
- No interpolated utility class names; no global resets; no font loading.

## Two modes, one contract

### Zero-config

Import one stylesheet (installing the package injects nothing):

```css
@import "tailwindcss";
@import "@neshel-ui/config/tailwind.css"; /* tokens + *-neshel-* utilities */
```

```css
@import "@neshel-ui/config/tokens.css"; /* plain CSS, no Tailwind */
```

`styles.css` is a byte-identical alias of `tailwind.css` during 0.x. Import either `tokens.css`
or `tailwind.css`, not both.

### Configured

```ts
// neshel.config.ts — executable, trusted project code; evaluated only by the CLI in Node
import { defineConfig } from "@neshel-ui/config";

export default defineConfig({
  themes: {
    light: { colors: { primary: "#1d3f73" } },
    sepia: { extends: "light", colors: { background: "#f4ecd8", foreground: "#2b2118" } },
  },
  output: "./src/neshel.generated.css",
});
```

```jsonc
"scripts": {
  "dev": "neshel generate && vite",
  "build": "neshel generate && vite build"
}
```

```css
@import "tailwindcss";
@import "@neshel-ui/config/tailwind.css";
@import "./neshel.generated.css";
```

The generated file contains the **complete** resolved token set for every theme in the
`neshel.config` layer, so it also works on its own for plain-CSS consumers.

## Theme selection

| `data-neshel-theme` | Result                                  |
| ------------------- | --------------------------------------- |
| absent              | light                                   |
| `light` / `dark`    | forced, regardless of the OS preference |
| `system`            | follows `prefers-color-scheme`          |
| `<named>`           | a theme from `neshel.config.ts`         |

The attribute works on the root and on any element; nested scopes are isolated because every
theme block declares all colour roles. Persisting a user's choice (server-side or with a small
inline script that sets the attribute) is the application's responsibility.

## Cascade and precedence

Every Neshel stylesheet starts with `@layer neshel.defaults, neshel.config;` (bundlers may
rewrite it equivalently; order is what matters). Generated tokens therefore override the
defaults. Verified in a real browser (`pnpm check:browser`, all three CI operating systems):

- canonical order (Tailwind → Neshel stylesheet → generated file) and the alternatives
  "generated before the Neshel stylesheet" and "generated file alone";
- nested light/dark/system/named scopes, with emulated OS preferences.

Hazard: unlayered CSS beats every layer. `:root { --neshel-primary: … }` written without a layer
also overrides the **dark** theme. Override inside the config layer, per theme:

```css
@layer neshel.config {
  :root,
  [data-neshel-theme="light"],
  [data-neshel-theme="system"] {
    --neshel-primary: #2a4a80;
  }
  @media (prefers-color-scheme: dark) {
    [data-neshel-theme="system"] {
      --neshel-primary: #a9c2ee;
    }
  }
  [data-neshel-theme="dark"] {
    --neshel-primary: #a9c2ee;
  }
}
```

Combining `data-neshel-theme` with a Tailwind `scheme-*` utility on the same element: the Neshel
layer sets `color-scheme` under the canonical order.

## Accessibility

Built-in themes meet 4.5:1 for text pairs and 3:1 for focus and input boundaries (WCAG 2.1
relative luminance); the ratios are published in the token contract and pinned by tests. Custom
themes get contrast diagnostics — warnings by default, errors with `contrast: "error"` or
`neshel … --strict`. Passing these checks does not by itself make an interface WCAG conformant.

## Tailwind source detection

`tailwind.css` defines theme variables only, so no `@source` is needed. If a future package ships
uncompiled utilities, register a correct `@source` path relative to the consumer's CSS file;
prefer precompiled package CSS. Background:
https://tailwindcss.com/docs/detecting-classes-in-source-files
