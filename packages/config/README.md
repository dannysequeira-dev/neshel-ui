# @neshel-ui/config

CSS-first design tokens, semantic themes and typed theme configuration for Neshel-UI.

**Status:** release candidate for 0.1.0 — **not published to npm yet**. Verified from the packed
tarball in external applications on Linux, Windows and macOS. Documentation: the
official site in [`apps/docs`](https://github.com/dannysequeira-dev/neshel-ui/tree/main/apps/docs) (English and Spanish); pre-publication installation:
`node scripts/pack-local.mjs` in the repository.

Feature 004 adds `breakpoints` (custom responsive breakpoints shared by layout and typography),
`types`, Capsize-format `typography.metrics` and `typography.fallbacks`, and the `BreakpointName`
type that generated declarations augment. Guides: `docs/layout.md#custom-breakpoints`,
`docs/typography.md`.

## Zero-config usage

Installing the package never injects CSS; import **one** stylesheet explicitly.

```css
/* With Tailwind CSS v4: tokens + `*-neshel-*` utilities */
@import "tailwindcss";
@import "@neshel-ui/config/tailwind.css";
```

```css
/* Without Tailwind: standard CSS custom properties */
@import "@neshel-ui/config/tokens.css";
```

`@neshel-ui/config/styles.css` is a byte-identical compatibility alias of `tailwind.css`
during 0.x (Phase 001 contract).

Themes: no attribute means light; `data-neshel-theme="light" | "dark" | "system"` on the root or
any element. No React provider is needed.

## Configured mode

```ts
// neshel.config.ts — evaluated only by the `neshel` CLI (Node), never in the browser
import { defineConfig } from "@neshel-ui/config";

export default defineConfig({
  themes: {
    light: { colors: { primary: "#1d3f73" } },
    sepia: { extends: "light", colors: { background: "#f4ecd8" } },
  },
  output: "./src/neshel.generated.css",
});
```

Run `neshel generate` from `@neshel-ui/cli` and import the generated file after the Neshel
stylesheet. `defineConfig` is an identity function whose types reject unknown keys and invalid
theme shapes; the package also exports the frozen contract data `colorRoles`, `contrastPairs`
and `defaults`. It has no runtime dependencies and no Node built-ins.

Token reference, palette and contrast pairs:
[contracts/tokens.md](https://github.com/dannysequeira-dev/neshel-ui/blob/main/specs/002-config-and-tokens/contracts/tokens.md).
Contract and compatibility: [docs/package-contracts.md](https://github.com/dannysequeira-dev/neshel-ui/blob/main/docs/package-contracts.md).
