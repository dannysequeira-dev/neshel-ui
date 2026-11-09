---
"@neshel-ui/components": minor
"@neshel-ui/cli": minor
"@neshel-ui/config": patch
"@neshel-ui/layout": patch
"@neshel-ui/typography": patch
---

Release-candidate hardening (feature 006).

`@neshel-ui/components`:

- The modal backdrop now dims in browsers without CSS `light-dark()`: a feature-query fallback uses
  the foreground in light contexts and the background for the dark theme and for `system` under a
  dark preference. Named dark themes in those browsers can set `--neshel-overlay-backdrop`.
- Select, MultiSelect and Combobox listboxes get an accessible name from their control (its
  `aria-labelledby`, `aria-label` or `<label>` text).
- JSDoc for previously undocumented props (defaults now visible in editors);
  `MobileMenuContentProps.side` documents its `"left"` default.

`@neshel-ui/cli`: style manifests (schema 2) accept an optional `supports` condition, rendered as
`@supports` (nested with `media` when both are present).

All packages: release metadata (keywords, homepage, bugs, repository directory, author) and README
updates.
