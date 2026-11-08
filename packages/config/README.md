# @neshel-ui/config

CSS-first design tokens, semantic themes and typed theme configuration for Neshel-UI.

**Status:** pre-release, **not published to npm**. Validated from the packed tarball.

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
