# Plan — Phase 010: Animation Effects & Presets

## Technical context

TypeScript strict, React 19, ESM; `@neshel-ui/animations` private 0.0.0; runtime dependency only
`@radix-ui/react-slot`; Node `node:test` + jsdom for units; Playwright (Chromium/Firefox/WebKit) and CDP
Chrome for the lab; Vite for the packed consumer and bundle measurements.

## Structure

```
packages/animations/src/
  core/        preset.ts (public) · tokens.ts, validate.ts, springs.ts, pointer.ts, interaction.ts,
               writers.ts (internal, framework-free)
  react/       use-motion-presets.ts, motion-host.tsx, effect-primitive.tsx (internal, shared)
  entrance/    factory.ts, effects.ts, stagger.ts, reveal.tsx, index.ts
  hover/       shared.ts, effects.ts, hover.tsx, hover.css, index.ts, tilt/ (009, unchanged)
  press/       effects.ts, controls.ts, components.tsx, press.css, index.ts
  styles.css   header; dist/styles.css = header + hover.css + press.css
```

## Slices

- **010.0** — brief, spec, research, contracts, ADR 0025, plan, tasks, analysis.
- **010.1** — core helpers + entrance family (E01–E11), `<Reveal>`, `<Stagger>`, tests.
- **010.2** — hover family (H01, H02, H04–H10), `<Hover>`, hover.css, tests; Tilt3D regression.
- **010.3** — press family (P01–P10), `<Press>` and components, press.css, tests.
- **010.4** — composition tests; type tests; package contract/pack checks; playground gallery + in-page
  suite + real-input cases (CDP and Playwright); spike cases; Storybook; packed consumer; bundles and
  budgets; docs (catalogue status, roadmap, README, CLAUDE.md); evidence; push and PR.

## Risks

| Risk                                         | Mitigation                                                                              |
| -------------------------------------------- | --------------------------------------------------------------------------------------- |
| jsdom has no WAAPI, layout or CSS cascade    | WAAPI stub in units; CSS rendering and layer computation asserted in real engines (lab) |
| `@starting-style` / `allow-discrete` support | progressive (instant swap without); final states asserted, not intermediate frames      |
| `color-mix` + `calc()` percentages in decor  | asserted in the lab computed styles in three engines                                    |
| Flicker on hydration                         | `appear="client"`; consumer check asserts no inline style after hydration               |
| Bundle growth of family primitives (arbiter) | measured per entry; Tilt3D path keeps arbiter-free                                      |
| Slow CI runners                              | condition-based waits (`untilExpression`), never fixed sleeps deciding results          |
