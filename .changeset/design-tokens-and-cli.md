---

"@neshel-ui/config": minor
"@neshel-ui/cli": minor
---

Design tokens, semantic theming and configuration (feature 002).

`@neshel-ui/config`:

- Ships `tokens.css` (plain CSS custom properties) and `tailwind.css` (tokens plus the Tailwind
  v4 `@theme inline` mapping for `*-neshel-*` utilities). `styles.css` remains as a
  byte-identical alias of `tailwind.css` during 0.x.
- 21 semantic colour roles, a radius scale, spacing unit, font families and focus geometry.
  All Phase 001 token names are kept.
- **Visual change (pre-1.0):** the default palette moves from the Phase 001 violet baseline to
  the Neshel navy, ivory and gold themes. Every built-in contrast pair meets its WCAG 2.1 minimum.
- Theme selection with `data-neshel-theme`: no attribute is light; `light`, `dark`, `system`
  (follows `prefers-color-scheme`) and configured named themes, on any element.
- Cascade layers `neshel.defaults < neshel.config`; every theme block is complete.
- JavaScript entry exports `defineConfig`, the configuration types and the frozen contract data
  `colorRoles`, `contrastPairs` and `defaults`. No runtime dependencies.

`@neshel-ui/cli`:

- `neshel validate` and `neshel generate` (`--config`, `--out`, `--check`, `--strict`), exit
  codes 0–5, TypeScript configs loaded with jiti, colour parsing and WCAG 2.1 contrast checks
  with Color.js, deterministic output and atomic writes. Peer-depends on `@neshel-ui/config`.
