---

"@neshel-ui/config": minor
"@neshel-ui/cli": minor
"@neshel-ui/layout": minor
"@neshel-ui/typography": minor
---

Typography system and custom responsive breakpoints (feature 004).

`@neshel-ui/typography` (new): `Heading`, `Text`, `Paragraph` and `Caption` with semantic elements
independent of visual size, static and responsive `size`, `weight`, `align` and `leading`,
contrast-paired tones, `measure`, `wrap`, `truncate`, `as`/`asChild`, React 19 refs and
`NeshelTypographyError`. Capsize trimming driven by font metric tokens and cap-height-normalised
sizes. Precompiled `styles.css`; no Tailwind or `@source` needed.

Custom breakpoints:

- `@neshel-ui/config`: `breakpoints` (`extend`/`replace`, `tailwind`) and `types` options,
  `BreakpointRegistry`/`BreakpointName` types, `defaults.breakpoints`; Capsize-format font metrics,
  `typography.fallbacks`, default Inter metrics and font metric tokens in `tokens.css`/`tailwind.css`.
- `@neshel-ui/cli`: breakpoint and font-metric validation; `neshel generate` writes complete layout
  and typography stylesheets for the configured breakpoints, Tailwind `@theme` breakpoints, Capsize
  fallback `@font-face` rules and a TypeScript declarations file (`--types`); `--check` covers every
  output. New runtime dependency `@capsizecss/core`.
- `@neshel-ui/layout`: responsive props accept the configured names. **Changed (pre-1.0):**
  alignment classes are now custom-property classes (`neshel-md-align-x-center`; `ai`/`jc`/`ji`
  classes removed), each written breakpoint key emits one class, Center and Container no longer
  emit default classes, and an unknown well-formed breakpoint key logs a browser warning instead
  of throwing (malformed keys still throw). Computed styles are unchanged. New peer dependency
  `@neshel-ui/config` (types only) and a `./style-manifest.json` export used by the CLI.
