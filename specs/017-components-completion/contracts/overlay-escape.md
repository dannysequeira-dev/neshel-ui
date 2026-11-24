# Contract — Escape ownership across nested Neshel layers (K-15)

Applies to the Neshel layers built on Radix DismissableLayer whose roots Neshel owns: `Dialog`, `Sheet` (and
`MobileMenu`, built on Sheet), `AlertDialog`, `Popover`. Implementation: `packages/components/src/internal/layer.tsx`
(`useLayerOpenState`, `useEscapeLayer`, `EscapeLayerProvider`).

## Guarantees

1. **One layer per Escape.** An Escape keydown dismisses at most one Neshel layer: the _topmost_ open one.
2. **Topmost** = among the open Neshel layers, those with no open descendant layer (React tree, through portals),
   the most recently opened. A layer is therefore never ranked above its own nested layers, even when both open
   in the same commit (`defaultOpen` on both; layout effects run child-first).
3. **Consumer handlers.** The topmost layer's `onEscapeKeyDown` runs exactly once per Escape; other layers'
   handlers do not run. `event.preventDefault()` in it keeps every layer open (unchanged Radix contract).
4. **Selection popups.** An Escape whose target is inside an open Select/MultiSelect/Combobox popup (or an
   expanded combobox input) belongs to that control: no layer closes (unchanged `guardEscape` contract).
5. **No owner window.** If a Neshel layer is open and no Radix layer listener handled an Escape (the interval
   after a nested layer unmounts and before Radix re-registers the parent), a document listener routes it to the
   topmost layer. It ignores events already handled or `defaultPrevented`, IME composition and selection Escape.
6. **Focus.** Focus returns to the trigger of the layer that closed (Radix FocusScope + `useFocusReturn`).
7. **Open state.** Roots keep the Radix contract: `open`/`defaultOpen`/`onOpenChange`; `onOpenChange` fires only
   on a real change; a controlled root that ignores `onOpenChange(false)` stays open.
8. **Lifecycle.** Registration happens in layout effects while the layer is open and is removed on close or
   unmount (StrictMode-safe). The document listener exists only while at least one Neshel layer is open.

## Out of scope

- Layers not owned by Neshel roots (a consumer's own Radix popover inside a Neshel dialog): unchanged Radix
  behaviour. Neshel `DropdownMenu`, `Tooltip` and `NavigationMenu` keep Radix behaviour; when they are the real
  topmost Radix layer they handle Escape themselves (Radix marks the event `defaultPrevented`).

## Cause (why the registry exists)

Radix DismissableLayer 1.2.1 attaches its document `keydown` listener only on the layer whose render-time
`index === layers.length - 1`. A new layer is added to the shared set in a passive effect, followed by a
`dismissableLayer.update` event whose `force({})` re-renders every layer later (default priority). Until that
render commits, the **outer** layer still owns the listener while the nested layer already has focus; its
dismissal unmounts the nested dialog too. Trace (Chromium, `components-plain`, before the fix):

```
420.4 focus=nested-trigger   422.6 layer-update   423.6 focus=nested-close   423.8 dialogs=2
429.3 keydown=Escape          430.9 listener swap (outer out, nested in)    432.5 dialogs=0   434.9 focus=dialog-trigger
```

In passing runs the swap happened 4–7 ms after the update; on loaded macOS runners it exceeded the test's
100 ms grace delay.
