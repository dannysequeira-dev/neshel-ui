# Contract — style ownership and restoration (Phase 009, owner requirement 3.1)

**Status: approved 2026-11-16; implemented in 009.2** (see [evidence](../evidence.md)). Applies to
every property the motion host writes: `transform`, `opacity`, `filter`, `clip-path`, `mask`,
`translate`, `rotate`, `scale`, `will-change` and `--neshel-*` custom properties.

## §1 Single writer per element

All engine writes to an element go through its **style ledger** (owned by the motion host). No effect,
controller or driver writes `element.style` for a managed property directly.

## §2 Capture

On the first claim of a property, the ledger captures the element's **inline** declaration:
`style.getPropertyValue(p)` and `style.getPropertyPriority(p)` (`""` or `"important"`). Stylesheet
values are not captured: they are not changed by the engine.

## §3 Combination with the captured value

| Property           | While animating                                                                                                       |
| ------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `transform`        | `captured transform` (if any) followed by the composed layers — the consumer's inline transform is kept, not replaced |
| `opacity`          | captured numeric opacity (default 1) × product of contributions                                                       |
| `will-change`      | union of the captured tokens and the tokens of active channels (`transform`, `opacity`, …)                            |
| exclusive channels | the owner's value replaces the captured value while owned                                                             |

Writes use the captured priority, so an inline `!important` declaration keeps its priority.

## §4 Restoration

When the last claim of a property is released (effect destroyed, controller completed/cancelled/
interrupted, channel lost, React unmount), the ledger restores the captured value **and priority**
exactly, or removes the property if nothing was captured. Restoration happens in the next write phase,
or synchronously when the host is disposed.

## §5 External modifications during animation

Before each write the ledger compares the current inline value with the last value it wrote. If they
differ, another writer changed the property:

1. the new value becomes the **captured baseline** (it will be restored, never lost);
2. for `transform`/`opacity`/`will-change` it is combined as in §3 from the next frame;
3. a development warning names the element and property once;
4. exclusive owners keep writing; the external value returns at release.

## §6 No duplicate writes

Each property is written at most once per frame, in the scheduler's write phase, and only when the
computed value differs from the last written value.

## §7 Limits (cannot be solved without controlling every writer)

- Values set by stylesheets, other libraries' WAAPI animations or `element.animate()` calls are not
  inline styles; the ledger neither sees nor restores them. WAAPI animations override inline styles
  while they run.
- An external inline write and an engine write in the same frame: the engine's comparison happens at
  its next write, so one frame may show the engine value; the external value is still preserved as
  baseline.
- Replacing the whole `style` attribute (e.g. a framework rewriting `style=""`) removes the engine's
  values until the next frame and resets the captured baseline to the new attribute's values.
- React `style` props on an animated element: React re-applies its value on re-render; the ledger
  adopts it as the new baseline (§5). Recommended: animate a wrapper, or keep animated properties out
  of the `style` prop.
