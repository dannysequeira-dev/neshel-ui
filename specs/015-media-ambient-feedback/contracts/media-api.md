# Contract — Images & Media API (`@neshel-ui/animations/media`, M01–M10)

Family `media`; opt-in stylesheet `@neshel-ui/animations/media.css`. Engines are framework-free functions over
elements you render; React hooks/components are client modules (`"use client"`) that attach after hydration.
Every engine is idempotently destroyable, restores every inline style it touched (Motion Host ledger) and
removes every package node it added. Native media attributes (`src`, `srcset`, `sizes`, `alt`, `loading`,
`decoding`, `width`, `height`, `poster`, `muted`, `controls`) are **never written** unless an option says so.

## §1 Foundations

### Load watcher (internal `src/core/media-load.ts`; exported as `watchImage`)

```ts
type ImageLoadState = "loading" | "loaded" | "error";
watchImage(img: HTMLImageElement, onChange: (state: ImageLoadState) => void, options?: { decode?: boolean }): () => void
```

- Synchronous first report: `loaded` (`complete && naturalWidth > 0`), `error` (`complete && naturalWidth === 0`
  with a source), else `loading`. `load` → (`decode()` when `decode !== false`, rejection tolerated) →
  `loaded`; `error` → `error`. A `MutationObserver` on `src`/`srcset`/`sizes` re-evaluates; results of an older
  generation are dropped. Returns the unsubscribe (removes listeners and the observer).

### Seek coalescer (internal, used by M06) — research R5

At most one seek in flight; the newest target replaces any pending one; issued on `seeked` (and after the next
presented frame when `requestVideoFrameCallback` exists); clamped to `seekable`; deferred until
`loadedmetadata`; `fastSeek` only with `precision: "fast"`. Counters: `seeksRequested`, `seeksIssued`,
`seeksCoalesced`.

## §2 Effects

Common options: `reducedMotion?: "user" | "always" | "never"`. Progress-based entries (M01, M05) also take
`duration`, `easing`, `trigger?: "visible" | "mount" | "manual"`, `progress?: ProgressSource` and return a
`ProgressControl` (`play/pause/reverse/finish/cancel/seek/track/drive/destroy`, 014 contract).

| Id  | Engine                              | Key options (defaults)                                                                                                                              | Returns                                                                      |
| --- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| M01 | `createKenBurns(media, o)`          | `from`/`to`: `{ scale 1–2, x −1…1, y −1…1 }` (`{1.05,0,0}` → `{1.18,0.4,−0.3}`), `duration` 9000 (≤ 60000), `repeat` 0 (0–1000/∞), `yoyo` true      | `ProgressControl`                                                            |
| M02 | `createBlurUp(frame, o)`            | `image` (first `img` in frame), `placeholder` (CSS image/colour), `blur` 0–40 px (16), `duration` 400, `replay` false, `revealTimeout` 8000         | `MediaRevealControl` (`state`, `reveal()`, `destroy()`)                      |
| M03 | `createLoadReveal(img, o)`          | `shape: "inset" \| "circle" \| "wipe"` (`inset`), `direction` (`up`), `duration` 600, `easing`, `replay` false, `revealTimeout` 8000                | `MediaRevealControl`                                                         |
| M04 | `createCompareSlider(root, o)`      | `value` 0–100 (50), `orientation` (`horizontal`), `step` 1, `onValueChange`; root contains `[data-neshel-compare-after]` and an `input[type=range]` | `CompareControl` (`value`, `set(v)`, `destroy()`)                            |
| M05 | `createDuotone(el, o)`              | `shadow` (`#1b1f3a`), `highlight` (`#f2c14e`), `amount` 0–1 (1), `duration` 600                                                                     | `ProgressControl` (progress = amount of duotone)                             |
| M06 | `createVideoScrub(video, o)`        | `progress` (required source), `range` `[start, end]` s (whole), `precision: "exact" \| "fast"`, `tolerance` 1/60 s, `restTime`, `restore` false     | `VideoScrubControl` (`state`, `target`, `drive(src)`, `destroy()`, counters) |
| M07 | `createLightboxZoom(o)`             | `dialog`, `image` (large), `getThumbnail()`, `duration` 380, `spring`, `onClose`                                                                    | `LightboxControl` (`open()`, `close()`, `state`, `destroy()`)                |
| M08 | `createCrossfade(container, o)`     | `index` 0, `duration` 500, `easing`, `interval` (none; ms ≥ 2000, pauses on hover/focus/hidden)                                                     | `CrossfadeControl` (`index`, `show(i)`, `next()`, `prev()`, `destroy()`)     |
| M09 | `createPixelDissolve(container, o)` | `cell` 4–64 px (16), `seed` 1, `duration` 900, `easing`, `maxCells` 4096, `maxDpr` 2                                                                | `DissolveControl` (`show(i)`, `mode: "dissolve" \| "fade"`, `destroy()`)     |
| M10 | `createHoverPan(frame, o)`          | `media` (first child), `scale` 1.05–3 (1.4), `spring`, `pointerTypes` (`mouse`,`pen`), `keyboard` false (`step` 0.1)                                | `{ destroy() }` (+ `reset()`)                                                |

### React

`KenBurns` (wrapper `div.neshel-kenburns` around one media child; props = M01 options + `controlRef`),
`useKenBurns(ref, o)`, `BlurUpImage` (`<img>` props + `placeholder`, `blur`; renders `span.neshel-blurup` +
the native `img` + an `aria-hidden` placeholder layer), `LoadReveal` (Slot around one `img`), `CompareSlider`
(`before`, `after` elements, `label` required, `valueText?(v)`, `jumps?`, `orientation`, `defaultValue`,
`value`/`onValueChange`), `Duotone` (Slot), `useVideoScrub(ref, o)`, `Lightbox` (`thumbnail` element, `children`
= large content, `label` required, `closeLabel` ("Close")), `Crossfade` (`index`, children slides, `interval`),
`PixelDissolve` (`index`, `img` children), `HoverPan` (wrapper around one media child; `label` when
`keyboard`).

## §3 Behaviour rules

- **Never invisible (M02/M03/M07):** only an image still `loading` at attach time is hidden; `error`, timeout,
  reduced motion and destroy reveal it; an already-loaded image is shown at once (`replay: true` opts into the
  animation). No-JS/SSR markup shows the image.
- **Bounds (M01/M10):** R2; no distortion (uniform `scale`), frame clips.
- **M04:** pointer press positions, captured drag follows, `touch-action` keeps native scroll on the other axis;
  keyboard via the native range; value text announced by the input (no live region).
- **M06:** never `play()`; seeks coalesced; metadata awaited; reduced → `restTime` frame, source ignored.
- **M07:** native `<dialog>`; close button focused first; Escape, backdrop click and close button close;
  focus restored to the opener; scroll lock reference-counted; background inert by the UA; reduced → fade.
- **M08/M09:** interruptible from the current state; inactive slides `inert` + `aria-hidden`, never unmounted;
  M09 canvas `aria-hidden`, `pointer-events: none`, released after each transition.
- **Continuous (M01 with repeats):** paused off-screen and on hidden pages; finite default.
