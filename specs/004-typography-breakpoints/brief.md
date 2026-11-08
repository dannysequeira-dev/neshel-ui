# Owner brief — Phase 004 (summary)

Source: "Neshel-UI — Phase 004: Typography System & Custom Responsive Breakpoints", the complete,
authoritative owner brief submitted 2026-11-08. This file summarises it for traceability; the
section numbers (§) match the brief.

## Authorisation (§22, §23)

- Autonomous specification, architecture, implementation, tests, documentation, Conventional
  Commits, fast-forward pushes to `origin/main`, CI inspection and CI fixes. No routine approval
  between milestones.
- Forbidden: force-push, rewriting pushed history, `Co-Authored-By` trailers, npm publish,
  GitHub releases or release tags, removing `private: true`, starting Phase 005, unrelated
  features, removing verification gates, hiding CI failures, unverified coverage claims,
  unnecessary runtime dependencies or React Providers.

## Part A — custom responsive breakpoints (§4–§9)

- Consumer-defined names and `rem` thresholds; `extend` (keep defaults, add) and `replace`
  (own names only). `base` stays the baseline key; zero-config consumers keep the defaults.
- Validate names (camelCase allowed), reserved identifiers, widths, ordering, collisions and
  units; reject ambiguous (equal) widths. Mobile-first `min-width`; inheritance upwards; no device
  detection; no Provider.
- Static and responsive values on the same components; no separate responsive components.
- Types know the configured names: completion, rejection of unknown names, rejection of
  obsolete defaults in `replace` mode, defaults in zero-config projects, consistent across Layout
  and Typography. Prove `replace` with real TSX consumers in NodeNext and Bundler resolution.
- CSS media queries contain resolved thresholds; no client-side config evaluation; no Tailwind
  requirement; no `@source` into `node_modules`; deterministic, non-combinatorial CSS; runtime
  classes and generated CSS stay in sync. Preserve every Phase 003 layout behaviour.
- Define validation of unknown names for JavaScript consumers; do not promise runtime rejection
  without an authoritative runtime registry; invalid names must not fail silently in supported
  workflows.
- Optional Tailwind v4 synchronisation through `@theme`, extend/replace semantics, camelCase,
  verified in real builds, not forced on plain-CSS consumers.
- `neshel generate` produces CSS and TypeScript from one config; a check mode detects stale
  output; deterministic; safe paths; no needless rewrites; no postinstall hooks.

## Part B — typography (§10–§17)

- Required: `Heading`, `Text`, `Paragraph`, `Caption`. Evaluate (do not automatically add)
  `Title`, `Subtitle`, `Label`, `Code`.
- Static and responsive props (`size`, `weight`, `align`, …), `tone`, `measure`, `asChild`,
  `as`, refs, native attributes; semantic element independent of visual size; no automatic
  heading-level changes; SSR/hydration safe; distributed CSS without Tailwind.
- Capsize is a core requirement: real font metrics, cap-height-based sizing, controlled leading,
  accurate trimming, build-time CSS rather than per-render calculation, no clipped glyphs,
  diagnosable metric mismatches, reasonable fallback without metrics, no interference with user
  pseudo-elements where avoidable, documented limitations.
- Font roles (`body`, `display`, `mono`); consumer-supplied metrics; the application loads its
  fonts; no bundled or redistributed fonts; no forced CDN.
- No margins that fight Layout's gap-based spacing.

## Part C — engineering (§18–§21)

- ESM-only, NodeNext declarations, React 19 peers, tree-shakeable, CSS side effects, Node-only
  generation logic, `core` private, deterministic tarballs.
- Tests: breakpoints (defaults, extend, replace, camelCase, unknown names, obsolete defaults,
  duplicates, units, inheritance, ordering, CSS/type consistency, freshness), typography (variants,
  semantics, refs, asChild, Capsize output, metrics, line-height, multi-line, fallback, Unicode,
  truncation, layout composition, SSR, accessibility), browser computed styles at and just below
  breakpoints, six external consumer scenarios from packed tarballs, negative tests.
- Storybook stories for all of the above using the distributable CSS and Neshel branding.
- Spec Kit workflow, milestones 004.0–004.5, final report with 14 items and a
  PASS / CONDITIONAL PASS / FAIL recommendation.
