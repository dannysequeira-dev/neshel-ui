# Contract — presets and effect primitives (Phase 010)

**Status: implemented on `feature/010-entrance-hover-press`; verified locally** ([evidence](../evidence.md)).
Decision: [ADR 0025](../../../docs/decisions/0025-presets-and-css-token-driver.md). Additive to the 009
contracts (no 009 signature changes).

## §1 Presets (`@neshel-ui/animations/core`)

```ts
interface EffectPreset<O, R> { readonly name: string; readonly effect: EffectDefinition<O, R>; readonly options: Readonly<O> }
type PresetInput<O, R> = EffectDefinition<O, R> | EffectPreset<O, R>;

definePreset<O, R>(name: string, effect: EffectDefinition<O, R>, options: O): EffectPreset<O, R>;
attachPreset<O, R>(element, input: PresetInput<O, R>, overrides?: Partial<O>, config?: AttachConfig): EffectHandle<O>;
```

- `name` is kebab-case; `options` are validated by `effect.resolve` at definition time (same
  `NeshelAnimationsError` on the server and the client) and frozen.
- `attachPreset` merges `overrides` shallowly over the preset options and calls `attachEffect`.
- Presets are imported values: no registration, tree-shakeable. String lookup stays explicit
  (`createEffectRegistry(entranceEffects)` etc.).

## §2 Family registries

Each family exports its definitions in catalogue order for explicit registries:
`entranceEffects` (E01–E11), `hoverEffects` (H01–H10, including `tilt3D`), `pressEffects` (P01–P10).

## §3 Attaching several effects to one element (internal React binding)

`useMotionPresets(ref, entries, config)` attaches each `{ effect, options }` through `attachEffect`, in
order, in a **layout effect** (an entrance writes its start pose before the first paint of a client-
rendered element); validates options during render; `update`s on option changes (stable value key, no
re-attach); re-attaches when the list of effect ids changes; destroys in reverse order on unmount. No
React state, no render per frame. Used by every Phase 010 primitive and component.

## §4 Primitives (React)

| Primitive   | Entry        | Accepts                                                     | Server markup                     |
| ----------- | ------------ | ----------------------------------------------------------- | --------------------------------- |
| `<Reveal>`  | `./entrance` | one entrance definition or preset + `options`               | element + class `neshel-reveal`   |
| `<Stagger>` | `./entrance` | one entrance preset applied to each element child           | element + class `neshel-stagger`  |
| `<Hover>`   | `./hover`    | one hover preset + `options`, or a list of presets          | element + class `neshel-hover`    |
| `<Press>`   | `./press`    | one press preset + `options`, or a list of presets          | element + class `neshel-press`    |

Common props: HTML attributes of a `<div>`, `asChild` (Radix Slot: one element child; refs, classes,
styles and handlers merged; invalid children throw `NeshelAnimationsError`), `conflicts`
(`"warn" | "error" | "silent"`), `ref`. A list (`preset={[lift, glow]}`) composes on the same element;
per-preset options come from `definePreset` (`options` with a list throws). A family check rejects a
preset from another family (`<Hover preset={fadeIn}>` throws).

`<Reveal>` adds `appear: "client" | "always" | "never"` (default `"client"`: play on client mounts, not
when hydrating server markup) and `replayKey` (a change replays). `<Stagger>` adds `interval`, `order`
(`"start" | "end" | "center"`), `maxStagger`, `delay`, `reducedMotion`, `onFinish`.

Typing: `options` is `NoInfer<Partial<O>>`, so the preset alone determines the option type (wrong keys
or values are compile errors; see `type-tests/presets*.tsx`).

## §5 Composition across families

Primitives nest with `asChild` onto one element:

```tsx
<Reveal preset={fadeUp} asChild>
  <Hover preset={[lift, glow]} asChild>
    <Press preset={pressScale} asChild>
      <Tilt3D asChild>
        <a href="/plan" className="card">…</a>
      </Tilt3D>
    </Press>
  </Hover>
</Reveal>
```

All attachments target the same element and compose through its motion host
([composition-matrix.md](composition-matrix.md)).
