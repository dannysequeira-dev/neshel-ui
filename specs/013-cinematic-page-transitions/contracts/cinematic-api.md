# Contract — Cinematic & Scenes API (C02–C10)

**Status: implemented and verified ([evidence](../evidence.md)); CI results recorded in PR #13.** Subpath
`@neshel-ui/animations/cinematic` (family `cinematic`), opt-in stylesheet
`@neshel-ui/animations/cinematic.css` for package-rendered parts. Every effect: framework-free engine
function + React component (`"use client"`), server markup equal to the visible content, nothing hidden
without JavaScript, release of every listener/observer/task/style on destroy or unmount.

Common rules: package-rendered layers (`aria-hidden="true"`, `inert`, `pointer-events: none`) carry the
visuals; the consumer's element is written only through its Motion Host; rule R-1 holds (no CSS
transition/animation on consumer elements); every effect exposes `track(...)` builders so it can be
sequenced inside a C01 timeline.

| Id  | Engine (no React)                                  | React                                      | Structure | Reduced motion                                    |
| --- | -------------------------------------------------- | ------------------------------------------ | --------- | ------------------------------------------------- |
| C01 | `createTimeline`                                   | `useTimeline`                              | G         | instant (finish)                                  |
| C02 | `createSceneChapters`                              | `SceneChapters`, `Chapter`, `SceneSegment` | W         | static: every segment at its end state, no scrub  |
| C03 | `createCamera`                                     | `CameraStage`, `useCamera`                 | W         | static: camera jumps to poses                     |
| C04 | `createCover({ pattern: "split-x" \| "split-y" })` | `SplitReveal`                              | L         | instant: cover removed                            |
| C05 | `createCover({ pattern: "curtain" \| "shutter" })` | `CurtainReveal`                            | L         | instant                                           |
| C06 | `titleSequence(timeline, …)`                       | `TitleSequence`                            | G (+ bg)  | fade (opacity only, no travel)                    |
| C07 | `createSpotlight`                                  | `Spotlight`                                | W         | static: lens placed without motion                |
| C08 | `createDepthOfField`                               | `DepthOfField`                             | G         | static: no blur at all                            |
| C09 | `createStoryboard`                                 | `Storyboard`, `StoryboardFrame`            | G         | off: no autoplay, no travel; manual controls stay |
| C10 | `createLetterbox`                                  | `Letterbox`                                | W         | instant: bars appear/disappear without travel     |

## C02 — Scene chapters

`createSceneChapters({ chapters: [{ id, weight? }], build?(timeline, chapter) , onChapterChange? })` →
`{ timeline, chapters, active, chapterAt(progress), drive(source), seekChapter(id), destroy() }`.
Chapters are laid out serially by weight (labels `chapter:<id>` and `chapter:<id>:end`); segments are
tracks added inside a chapter's span. `drive(source)` accepts any `{ get(): number; subscribe(fn) }`
progress source — the 011 `ScrollProgress` (`useScrollScene()` inside `<ScrollScene>`) is one — and seeks
the timeline on every source update (scrub, no clock); without a source the timeline plays on its own
clock. Pinning is `<ScrollScene>`'s CSS sticky stage; no wheel/touch/key interception, no scroll writes.
React: `<SceneChapters source? progress? onChapterChange?>` with `<Chapter id weight?>` (renders a
`div[data-neshel-chapter]`, `data-active` written by the engine) and `<SceneSegment effect|to from? span?
asChild?>` (a track inside its chapter, span as `[start, end]` fractions of the chapter).

## C03 — Camera

`createCamera(stage, canvas, { minZoom = 0.5, maxZoom = 4, bounds = "contain", padding = 24,
reducedMotion })` → `{ pose (x, y, zoom motion values), to(target, transition?), jump(target),
track(target, options) → TrackInput[], refresh(), destroy() }`, where `target` is `{ x, y, zoom }` (canvas
coordinates of the stage centre) or `{ focus: Element, padding? }`. The canvas transform is one host layer
(`translate` + `scale`, origin 0 0), clamped so canvas edges never leave the stage when `bounds:
"contain"`. Geometry is read in the read phase on creation, on `refresh()` and from one `ResizeObserver`
(stage + canvas), never per frame. Keyboard: focus moving inside the canvas pans the camera to the
focused element (`followFocus`, default true). Without JavaScript the stage is a scrollable region
(`overflow: auto`, `tabindex="0"`, labelled).

## C04 / C05 — Covers (split, curtain, shutter)

`createCover(container, { pattern, slats = 6, color })` inserts package-rendered panels (one per half,
or `slats` for shutter) in a `div.neshel-cover-layers[aria-hidden][inert]` and returns `{ progress (motion
value 0 covered → 1 open), open(transition?), close(transition?), track(options), destroy() }`. Panels
move only by their own host transform layers (split: translate out; curtain: scaleX from the centre;
shutter: scaleY per slat with a stagger). The consumer's content element receives no writes. React
`<SplitReveal direction="x"|"y">` / `<CurtainReveal pattern="curtain"|"shutter">` render panels with the
`hidden` attribute on the server (content visible without JS); `open` (boolean, controlled) or `trigger`
(`"mount"` client-only mounts, default `"manual"`).

## C06 — Title sequence

`titleSequence(timeline, { lines: Element[], effect (Entrance definition or preset, triggered), interval =
120, background?: Element, backgroundPose?, at? })` adds one effect track per line (offset `interval`)
and one background pose track (default: opacity 0 → 1 and scale 1.08 → 1) to a C01 timeline. React
`<TitleSequence effect interval background? play?>` staggers its element children (lines supplied by the
consumer, e.g. a heading and paragraphs) — no text splitting (Phase 014). Reduced motion: lines fade
without travel (the entrance's declared `fade` behaviour), background opacity only.

## C07 — Spotlight / vignette

`createSpotlight(stage, { radius = 120, dim = 0.6, feather = 48 })` renders an oversized lens
(`div.neshel-spotlight` inside the stage) with a fixed radial hole and moves/scales it with one host
layer: `focus(target | { x, y, radius }, transition?)`, `clear(transition?)`, `track(target, options)`.
The stage gets `overflow: clip` from the stylesheet; the dimmed content stays in the accessibility tree
and interactive. Geometry: one read per `focus()` (read phase), no per-frame reads.

## C08 — Depth of field

`createDepthOfField(container, { maxBlur = 8 (≤ 12), falloff = 4, scale = 0.02 })` treats the element
children (≤ 6) as layers; `focus(index, transition?)`, `track(index, options)` animate each layer's blur
`|i − focus| × falloff` (capped) through its host `filter` channel and a small scale, restored exactly on
destroy. Reduced motion: no blur, no scale.

## C09 — Storyboard

`createStoryboard(root, { frames: Element[], interval = 5000, autoplay = false, loop = true, transition
= "fade" | "slide", onChange })` → `{ index, playing, play(), pause(), stop(), next(), previous(),
goTo(i), destroy() }`. Frame changes are C01 timelines (pose tracks on the outgoing/incoming frames).
Autoplay policy (research R9): opt-in; never with reduced motion; runs only while ≥ 50 % visible
(IntersectionObserver) and the page is visible; pauses on hover and focus within; a user Pause is sticky
until Play. React `<Storyboard label autoplay interval>` with `<StoryboardFrame label?>` children renders
the APG carousel semantics and the controls (rotation Play/Pause first, Previous, Next, Stop).

## C10 — Letterbox

`createLetterbox(frame, { ratio = 2.39, size?, color })` inserts two package-rendered bars inside a
positioned frame element (`aria-hidden`, absolutely positioned; `<Letterbox>` renders that frame — structure W) and returns `{ show(transition?), hide(transition?),
track(show: boolean, options), destroy() }`. Bars move by host transform layers; the frame's and the content's
inline styles and attributes are byte-identical after `hide()` + `destroy()` (contract test). React
`<Letterbox active ratio?>`.
