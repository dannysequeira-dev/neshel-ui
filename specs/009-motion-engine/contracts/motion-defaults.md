# Contract — motion defaults, easing and interpolation (proposed, Phase 009)

**Status: proposed, not implemented.** Decision: [ADR 0024](../../../docs/decisions/0024-motion-defaults-and-config-integration.md)
(owner decision D5). Exported from `@neshel-ui/animations/core`.

## §1 Typed defaults

```ts
const motionDefaults = Object.freeze({
  duration: { instant: 0, fast: 120, normal: 200, slow: 320, deliberate: 500 },        // ms
  easing:   { linear, standard, emphasized, decelerate, accelerate },                   // Easing
  distance: { sm: 4, md: 8, lg: 16 },                                                   // px
  spring:   { gentle: {…}, snappy: {…}, bouncy: {…} },                                  // SpringOptions
});
```

Values are proposals to be tuned in 009 with the lab (reduced-motion and vestibular review included).

## §2 CSS custom properties

| Property                                                           | Fallback used by package rules |
| ------------------------------------------------------------------ | ------------------------------ |
| `--neshel-motion-duration-{fast,normal,slow,deliberate}`           | the typed value                |
| `--neshel-motion-ease-{standard,emphasized,decelerate,accelerate}` | the cubic-bézier               |
| `--neshel-motion-distance-{sm,md,lg}`                              | the typed value                |

The package stylesheet **declares none of them globally**; its rules read them with fallbacks.
Applications override them on `:root` or any subtree. No `@property` registration in 009.

## §3 Easing

```ts
type Easing = (t: number) => number;
cubicBezier(x1, y1, x2, y2): Easing;    // x1, x2 ∈ [0, 1]; accuracy ≤ 1e-4 against reference samples
steps(count, position?: "start" | "end"): Easing;
springEasing(spring?: SpringOptions | SpringPreset, options?: { points?: number }): { easing: string; duration: number }; // CSS linear()
toCssEasing(easing: Easing | EasingPreset): string; // presets and cubic-béziers only
```

## §4 Interpolation

`clamp(value, min, max)`, `mix(from, to, t)`, `progress(from, to, value)`,
`mapRange(value, inMin, inMax, outMin, outMax, { clamp? })`. Pure; no allocation.

## §5 Future Config integration (designed now, not implemented)

Additive only:

1. `@neshel-ui/config`: an **optional** `motion` key in `defineConfig` (durations, easings, distances)
   and its TypeScript types. Absent key → no output → today's behaviour.
2. `@neshel-ui/cli` `neshel generate`: when `motion` is present, emit the `--neshel-motion-*`
   properties into the generated stylesheet inside `@layer neshel.config` (ADR 0006/0007 layering).
3. No existing key, token, export or stylesheet changes; `tokens.css`/`tailwind.css` unchanged;
   Animations never imports Config at runtime (the coupling is the CSS custom property names).
4. Requires an owner-approved minor release of Config and CLI; not part of Phase 009.
