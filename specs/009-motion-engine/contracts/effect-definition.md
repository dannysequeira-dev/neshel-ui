# Contract — effect definitions and registries (proposed, Phase 009)

**Status: approved 2026-11-16; implemented and verified locally in Phase 009** ([evidence](../evidence.md)). Decision: [ADR 0021](../../../docs/decisions/0021-effect-definitions-and-explicit-registries.md).
Exported from `@neshel-ui/animations/core`.

## §1 Definition

```ts
type EffectId = `${FamilyId}/${string}`; // "hover/tilt-3d"
type FamilyId = "entrance" | "hover" | "press" | "physics" | "scroll-trigger" | "scroll" | "cinematic"
  | "page" | "layout" | "text" | "svg" | "media" | "ambient" | "feedback" | "3d";

interface EffectDefinition<Options, Resolved> {
  readonly id: EffectId;
  readonly family: FamilyId;
  readonly channels: readonly ChannelClaim[];        // contracts/channels-and-arbitration.md
  readonly priority: number;                          // default 0; higher wins exclusive channels
  readonly reducedMotion: "off" | "fade" | "instant" | "static" | "reduced";
  resolve(options: Options | undefined): Resolved;    // validates; throws NeshelAnimationsError
  setup(context: EffectContext<Resolved>): EffectInstance<Resolved>;
}

defineEffect<O, R>(definition: EffectDefinition<O, R>): Readonly<EffectDefinition<O, R>>;
```

`defineEffect` validates the shape (id format, family matches the id prefix, known channels, finite
priority) and returns a frozen object. It has no side effect: nothing is registered.

## §2 Context and instance

```ts
interface EffectContext<R> {
  readonly element: Element & { style: CSSStyleDeclaration };
  readonly options: R;
  readonly channels: ChannelHandles; // writers for the claimed channels only
  readonly scheduler: FrameScheduler;
  readonly reduced: boolean; // resolved reduced-motion state (live)
  onReducedChange(listener: (reduced: boolean) => void): () => void;
}

interface EffectInstance<R> {
  update(options: R): void;
  pause?(): void;
  resume?(): void;
  destroy(): void; // must release every listener and frame task
}
```

An instance never touches `element.style` directly for claimed channels; writes go through
`context.channels` so the host can arbitrate and restore.

## §3 Attaching

```ts
attachEffect<O, R>(element, definition: EffectDefinition<O, R>, options?: O, host?: { conflicts?: ConflictPolicy }): EffectHandle<O>;

interface EffectHandle<O> {
  readonly state: "active" | "suspended" | "reduced" | "paused" | "destroyed";
  update(options?: O): void;
  pause(): void; resume(): void;
  destroy(): void;                        // idempotent
}
```

Lifecycle: `resolve` → claims checked by the host → `setup` (only if every claim is granted;
otherwise `suspended` until granted) → updates → `destroy` releases claims, which may resume a
suspended instance of another effect.

## §4 Registries

```ts
createEffectRegistry(definitions: readonly EffectDefinition[]): EffectRegistry;
interface EffectRegistry {
  get(id: EffectId): EffectDefinition | undefined;
  has(id: EffectId): boolean;
  list(family?: FamilyId): readonly EffectDefinition[];
}
```

Duplicate ids throw. Registries are plain values (no global singleton, no import-time side effects);
applications build one only when they need string lookup.

## §5 Tilt3D as the reference definition

`tilt3D = defineEffect({ id: "hover/tilt-3d", family: "hover", channels: [{ channel: "transform",
mode: "compose" }], priority: 0, reducedMotion: "off", … })`. `createTilt3D`, `useTilt3D` and
`<Tilt3D>` become wrappers over `attachEffect(element, tilt3D, options)`; every 008 Tilt3D test stays
green.
