# Contract — channels, composition and conflict arbitration (proposed, Phase 009)

**Status: approved 2026-11-16; implemented and verified locally in 009.2** ([evidence](../evidence.md)).
Decisions: [ADR 0019](../../../docs/decisions/0019-motion-composition-and-property-ownership.md)
(ownership), [ADR 0022](../../../docs/decisions/0022-channel-arbitration-and-conflict-detection.md)
(arbitration).

## §1 Channels

| Channel                                 | Mode        | Combination / owner                                             |
| --------------------------------------- | ----------- | --------------------------------------------------------------- |
| `transform`                             | `compose`   | transform composer layers (008 rules)                           |
| `opacity`                               | `multiply`  | product of contributions in `[0, 1]`; inline removed at 1       |
| `translate`, `rotate`, `scale`          | `exclusive` | one owner (CSS-driven presets, or a JS effect that claims them) |
| `filter`, `clip-path`, `mask`           | `exclusive` | one owner                                                       |
| `--neshel-<effect>-*` custom properties | `exclusive` | the declaring effect                                            |

```ts
type ChannelClaim =
  | { channel: "transform"; mode: "compose" }
  | { channel: "opacity"; mode: "multiply" }
  | { channel: ExclusiveChannel; mode: "exclusive" };
```

Unknown channels are rejected by `defineEffect`. New channels require a contract update.

## §2 Motion host

One host per element (weakly held), created on first attach:

- keeps the ledger `channel → { owner, waiting[] }` for exclusive channels and the contribution sets
  for `compose`/`multiply` channels;
- exposes `ChannelHandles` to granted instances: `transform.set(layer)/clear()`,
  `opacity.set(value)/clear()`, `exclusive(channel).set(value)/clear()`;
- writes through the style ledger ([style-ownership.md](style-ownership.md)): at most one write per
  property per frame, original inline values and priorities captured and restored on release.

## §3 Arbitration (exclusive channels)

1. A claim on a free channel is granted.
2. A claim on an owned channel: the higher `priority` wins; on equal priority the **existing** owner
   keeps it.
3. The losing instance is `suspended`: not set up (or paused if it already ran) and its writes are
   discarded; when the owner releases, the highest-priority waiting claim (earliest on ties) is
   granted and resumes.
4. An instance needing several exclusive channels is granted all or none (no partial effects).

`compose` and `multiply` channels never conflict.

## §4 Conflict reporting

```ts
type ConflictPolicy = "warn" | "error" | "silent";
```

| Policy   | Behaviour                                                                                                                                                                   | Default when                |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| `warn`   | one `console.warn` per (element, channel, pair): `[@neshel-ui/animations] "press/shake" is suspended: "filter" on <div#card> is owned by "media/duotone" (priority 1 > 0).` | `NODE_ENV !== "production"` |
| `error`  | throws `NeshelAnimationsError` with the same message at attach time                                                                                                         | opt-in (tests, CI)          |
| `silent` | arbitration only                                                                                                                                                            | `NODE_ENV === "production"` |

The policy is an option of `attachEffect` / `useMotionEffect`; no provider. Arbitration is identical
under every policy (reporting changes, behaviour does not), except `error`, which throws instead of
suspending.

## §5 Diagnostics

```ts
getMotionDebugInfo(element): {
  channels: Array<{ channel: string; mode: ChannelMode; owner?: EffectId; waiting: EffectId[]; contributions: number }>;
  instances: Array<{ id: EffectId; state: EffectHandle["state"] }>;
} | undefined;
```

For development and tests; documented as unstable diagnostic output.

## §6 Known limits

- Styles from the application's own CSS on the same properties are invisible to the host; documented,
  plus the 008 inline-`transform` warning.
- Per-axis rotation sums remain approximate for several rotating layers (008).
- Two copies of the package on one page have two hosts per element (no coordination); documented as
  unsupported.
