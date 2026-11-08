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

Token reference, palette and contrast pairs:
[contracts/tokens.md](https://github.com/dannysequeira-dev/neshel-ui/blob/main/specs/002-config-and-tokens/contracts/tokens.md).
Contract and compatibility: [docs/package-contracts.md](https://github.com/dannysequeira-dev/neshel-ui/blob/main/docs/package-contracts.md).
