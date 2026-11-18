# Contract — effect catalogue (planned)

**Status: partially implemented.** Implemented (private package): `H03 Tilt3D` (008.0, on the
engine since 009), the 30 Phase 010 entries **E01–E11, H01, H02, H04–H10, P01–P10** (marked
**✓ 010** below; ids, options, drivers and reduced behaviour in
[specs/010 contracts/effects-010.md](../../010-animation-effects/contracts/effects-010.md)) and the 21
Phase 011 entries **ST01–ST10, SP01–SP11** (marked **✓ 011**; API, drivers and reduced behaviour in
[specs/011 contracts/api-011.md](../../011-scroll-parallax/contracts/api-011.md) — the scroll driver
rule of ADR 0026 replaces the SDA column for anything that moves the consumer's element) and the 23
Phase 012 entries **G01–G11, L01–L10, H11, P11** (marked **✓ 012**; API, drivers and reduced behaviour
in [specs/012 contracts/api-012.md](../../012-physics-gestures-layout/contracts/api-012.md) — FLIP
entries animate the consumer's element through the motion host instead of WAAPI, ADR 0027). Phase 010
changed the driver of most CSS rows: the consumer's element is animated only by the motion host (rule
R-1, ADR 0025) and CSS renders package-owned layers; the Driver column below keeps the original plan
and the 010 contract records each change. `D05 CornerRecede` exists as a
playground prototype; the 008.0 ScrollScene prototype became SP05/SP01/SP10 in Phase 011. Every other row is a plan: names, drivers and phases may change through the spec
of the phase that implements them. Ids are stable references for specs and tests, not public API.

157 entries in 15 families. Variants (direction, distance, duration, easing, stagger) are options of
an entry, not separate entries; presets are named option sets registered for an entry.

## Legend

**Driver** — the cheapest driver that produces the effect correctly (ADR 0018 §3, driver ladder):
`CSS` transitions/keyframes on compositor-friendly properties · `SDA` CSS scroll-driven animations
with a `JS` fallback · `VT` View Transitions API with a non-animated fallback · `WAAPI` Web
Animations API (programmatic control of CSS-like animations) · `JS` core scheduler + springs ·
`GPU` canvas/WebGL in the optional graphics entry.

**Structure** — what the effect needs beyond the element (ADR 0019 §4): `—` single element
(`asChild`-able) · `W` wrapper element (hit area, perspective, clipping or overflow) · `L`
duplicated inert layer(s) of the content · `S` split DOM (characters/words/lines) with the original
text kept accessible · `C` canvas/WebGL surface (decorative; accessible content stays in the DOM) ·
`G` group (applies to children).

**Reduced motion** (contracts/accessibility.md): `off` no motion, final state · `fade` opacity
only · `instant` jump to end state · `static` decorative motion removed, content shown ·
`reduced` lower amplitude kept (only when the motion conveys state and is non-vestibular).

**Phase** — proposed implementing phase (plan.md, roadmap).

## 1 · Entrance & Reveal (E)

| Id  | Effect                            | Driver | Structure | Reduced motion | Phase |
| --- | --------------------------------- | ------ | --------- | -------------- | ----- |
| E01 | Fade in                           | CSS    | —         | instant        | ✓ 010 |
| E02 | Fade + slide (up/down/left/right) | CSS    | —         | fade           | ✓ 010 |
| E03 | Scale in                          | CSS    | —         | fade           | ✓ 010 |
| E04 | Zoom out → in                     | CSS    | —         | fade           | ✓ 010 |
| E05 | Blur in                           | CSS    | —         | fade           | ✓ 010 |
| E06 | Clip reveal (inset / circle)      | CSS    | —         | instant        | ✓ 010 |
| E07 | Gradient-mask wipe                | CSS    | —         | instant        | ✓ 010 |
| E08 | Rotate in                         | CSS    | —         | fade           | ✓ 010 |
| E09 | Flip in (X/Y)                     | CSS    | W         | fade           | ✓ 010 |
| E10 | Staggered children                | CSS    | G         | fade           | ✓ 010 |
| E11 | Spring entrance (overshoot)       | CSS¹   | —         | fade           | ✓ 010 |

¹ Spring curves pre-computed into CSS `linear()` easing (research R4); JS only for interruption.

## 2 · Hover & Pointer (H)

| Id  | Effect                              | Driver | Structure | Reduced motion | Phase |
| --- | ----------------------------------- | ------ | --------- | -------------- | ----- |
| H01 | Lift (translate + shadow)           | CSS    | —         | static         | ✓ 010 |
| H02 | Glow / ring                         | CSS    | —         | static         | ✓ 010 |
| H03 | **Tilt3D** (implemented, 008.0)     | JS     | —         | off            | 008.0 |
| H04 | Magnetic pull                       | JS     | —         | off            | ✓ 010 |
| H05 | Spotlight (pointer-follow gradient) | JS     | —         | static         | ✓ 010 |
| H06 | Border gradient sweep               | CSS    | —         | static         | ✓ 010 |
| H07 | Underline grow                      | CSS    | —         | instant        | ✓ 010 |
| H08 | Media zoom inside frame             | CSS    | W         | static         | ✓ 010 |
| H09 | Pointer parallax layers             | JS     | G         | off            | ✓ 010 |
| H10 | Shine / glare sweep                 | CSS    | L²        | static         | ✓ 010 |
| H11 | Cursor follower (decorative)        | JS     | W         | off            | ✓ 012 |

² A decorative pseudo-element where possible; an extra element only when the host forbids it.

## 3 · Press & Microinteractions (P)

| Id  | Effect                        | Driver | Structure | Reduced motion | Phase |
| --- | ----------------------------- | ------ | --------- | -------------- | ----- |
| P01 | Press scale                   | CSS    | —         | reduced        | ✓ 010 |
| P02 | Ripple                        | WAAPI  | W         | fade           | ✓ 010 |
| P03 | Tap bounce (spring)           | JS     | —         | off            | ✓ 010 |
| P04 | Toggle thumb morph            | CSS    | —         | instant        | ✓ 010 |
| P05 | Checkbox draw                 | CSS    | —         | instant        | ✓ 010 |
| P06 | Burst (like / celebrate)      | WAAPI  | L         | static         | ✓ 010 |
| P07 | Shake (error)                 | CSS    | —         | reduced³       | ✓ 010 |
| P08 | Nudge / attention jiggle      | CSS    | —         | off            | ✓ 010 |
| P09 | Number tick (counter)         | JS     | —         | instant        | ✓ 010 |
| P10 | Content swap confirm (copy ✓) | CSS    | G         | fade           | ✓ 010 |
| P11 | Long-press progress           | WAAPI  | W         | reduced        | ✓ 012 |

³ The error must also be conveyed by text/ARIA; the shake is never the only signal.

## 4 · Physics & Gestures (G)

| Id  | Effect                              | Driver | Structure | Reduced motion | Phase |
| --- | ----------------------------------- | ------ | --------- | -------------- | ----- |
| G01 | Drag with inertia                   | JS     | —         | instant        | ✓ 012 |
| G02 | Drag constraints + snap points      | JS     | W         | instant        | ✓ 012 |
| G03 | Swipe to dismiss                    | JS     | —         | instant        | ✓ 012 |
| G04 | Pull-to-refresh indicator           | JS     | W         | reduced        | ✓ 012 |
| G05 | Spring follow (value chasing)       | JS     | —         | instant        | ✓ 012 |
| G06 | Elastic edge (visual overscroll)    | JS     | W         | off            | ✓ 012 |
| G07 | Throw / fling with decay            | JS     | —         | instant        | ✓ 012 |
| G08 | Pinch-zoom media                    | JS     | W         | instant        | ✓ 012 |
| G09 | Rotate gesture                      | JS     | —         | instant        | ✓ 012 |
| G10 | Drag-to-reorder (with keyboard alt) | JS     | G         | instant        | ✓ 012 |
| G11 | Velocity squash & stretch           | JS     | —         | off            | ✓ 012 |

Every gesture has a keyboard and single-pointer alternative (WCAG 2.5.1, 2.5.7) or is decorative.

## 5 · Scroll Triggers (ST)

| Id   | Effect                                    | Driver   | Structure | Reduced motion | Phase |
| ---- | ----------------------------------------- | -------- | --------- | -------------- | ----- |
| ST01 | Reveal on enter (IntersectionObserver)    | CSS + JS | —         | instant        | ✓ 011 |
| ST02 | Stagger on enter                          | CSS + JS | G         | instant        | ✓ 011 |
| ST03 | Once / repeat / reverse on leave          | JS       | —         | instant        | ✓ 011 |
| ST04 | Enter / leave callbacks                   | JS       | —         | n/a            | ✓ 011 |
| ST05 | In-view progress variable                 | SDA      | —         | static         | ✓ 011 |
| ST06 | Direction-aware header (hide / show)      | JS       | —         | instant        | ✓ 011 |
| ST07 | Stuck-state detection (sticky)            | JS       | —         | n/a            | ✓ 011 |
| ST08 | Section spy (table-of-contents highlight) | JS       | —         | n/a            | ✓ 011 |
| ST09 | Lazy activation of heavy effects          | JS       | —         | n/a            | ✓ 011 |
| ST10 | Threshold / root-margin presets           | JS       | —         | n/a            | ✓ 011 |

## 6 · Scroll & Parallax (SP)

| Id   | Effect                                   | Driver | Structure | Reduced motion | Phase |
| ---- | ---------------------------------------- | ------ | --------- | -------------- | ----- |
| SP01 | Depth-layer parallax (prototype, 008.0)  | SDA/JS | G         | static         | ✓ 011 |
| SP02 | Scrubbed transform (progress → property) | SDA/JS | —         | static         | ✓ 011 |
| SP03 | Scroll progress bar                      | SDA    | —         | reduced        | ✓ 011 |
| SP04 | Horizontal scroll section (pinned)       | JS     | W         | static⁴        | ✓ 011 |
| SP05 | Pinned scene (prototype, 008.0)          | CSS⁵   | W         | static         | ✓ 011 |
| SP06 | Image parallax inside frame              | SDA    | W         | static         | ✓ 011 |
| SP07 | Zoom on scroll                           | SDA    | —         | static         | ✓ 011 |
| SP08 | Scroll-linked theme/colour shift         | SDA/JS | —         | instant        | ✓ 011 |
| SP09 | Sticky stacking cards                    | CSS    | G         | static         | ✓ 011 |
| SP10 | Smooth scrub (spring, prototype, 008.0)  | JS     | —         | off            | ✓ 011 |
| SP11 | Scroll-velocity skew                     | JS     | —         | off            | ✓ 011 |

⁴ Reduced motion turns the pinned horizontal track into normal vertical content.
⁵ Pinning is `position: sticky`; no JavaScript pin spacer (research R8).

## 7 · Cinematic & Scenes (C)

| Id  | Effect                                        | Driver   | Structure | Reduced motion | Phase |
| --- | --------------------------------------------- | -------- | --------- | -------------- | ----- |
| C01 | Timeline sequencer (labels, overlaps)         | JS/WAAPI | G         | instant        | 013   |
| C02 | Scene chapters (pin + segments)               | SDA/JS   | W         | static         | 013   |
| C03 | Camera pan/zoom over a large canvas           | JS       | W         | static         | 013   |
| C04 | Split-screen reveal                           | CSS      | L         | instant        | 013   |
| C05 | Curtain / shutter open                        | CSS      | L         | instant        | 013   |
| C06 | Title sequence (staggered text + background)  | WAAPI    | S         | fade           | 013   |
| C07 | Spotlight / vignette focus                    | CSS      | W         | static         | 013   |
| C08 | Depth-of-field blur sequence                  | CSS      | G         | static         | 013   |
| C09 | Autoplay storyboard with pause/stop controls⁶ | JS       | G         | off            | 013   |
| C10 | Letterbox transition                          | CSS      | W         | instant        | 013   |

⁶ Anything moving for more than 5 s needs pause/stop/hide (WCAG 2.2.2).

## 8 · Page Transitions (PT)

| Id   | Effect                                      | Driver | Structure | Reduced motion | Phase |
| ---- | ------------------------------------------- | ------ | --------- | -------------- | ----- |
| PT01 | Cross-fade                                  | VT     | —         | instant        | 013   |
| PT02 | Shared-element morph                        | VT     | —         | instant        | 013   |
| PT03 | Slide / push                                | VT     | —         | fade           | 013   |
| PT04 | Direction by navigation (forward/back)      | VT     | —         | fade           | 013   |
| PT05 | Scale-through                               | VT     | —         | fade           | 013   |
| PT06 | Curtain wipe                                | VT     | —         | instant        | 013   |
| PT07 | Route progress bar                          | CSS    | W         | reduced        | 013   |
| PT08 | Persistent element across routes            | VT     | —         | instant        | 013   |
| PT09 | Cross-document (MPA) view transitions       | VT     | —         | instant        | 013   |
| PT10 | Router adapters (Next.js App Router, React) | VT     | —         | n/a            | 013   |

## 9 · Layout Animations (L)

| Id  | Effect                                  | Driver | Structure | Reduced motion | Phase |
| --- | --------------------------------------- | ------ | --------- | -------------- | ----- |
| L01 | FLIP move / reorder                     | WAAPI  | G         | instant        | ✓ 012 |
| L02 | Auto-height expand / collapse           | WAAPI⁷ | —         | instant        | ✓ 012 |
| L03 | List enter / exit                       | WAAPI  | G         | fade           | ✓ 012 |
| L04 | Shared layout (same item, new position) | WAAPI  | —         | instant        | ✓ 012 |
| L05 | Grid reflow                             | WAAPI  | G         | instant        | ✓ 012 |
| L06 | Accordion height                        | CSS⁷   | —         | instant        | ✓ 012 |
| L07 | Tab indicator slide                     | CSS    | W         | instant        | ✓ 012 |
| L08 | Presence (exit before unmount)          | WAAPI  | —         | instant        | ✓ 012 |
| L09 | Content cross-fade swap                 | CSS    | G         | instant        | ✓ 012 |
| L10 | Masonry reflow                          | WAAPI  | G         | instant        | ✓ 012 |

⁷ `interpolate-size` / `calc-size()` where supported; measured WAAPI fallback otherwise.

## 10 · Typography & Text (T)

| Id  | Effect                               | Driver | Structure | Reduced motion | Phase |
| --- | ------------------------------------ | ------ | --------- | -------------- | ----- |
| T01 | Split reveal (chars / words / lines) | CSS    | S         | instant        | 014   |
| T02 | Typewriter                           | JS     | S         | instant        | 014   |
| T03 | Scramble / decode                    | JS     | S         | instant        | 014   |
| T04 | Gradient sweep text                  | CSS    | —         | static         | 014   |
| T05 | Number roll                          | CSS    | S         | instant        | 014   |
| T06 | Rotating words                       | CSS    | S         | static         | 014   |
| T07 | Kinetic wave                         | CSS    | S         | off            | 014   |
| T08 | Highlighter draw                     | CSS    | —         | instant        | 014   |
| T09 | Text mask reveal                     | CSS    | —         | instant        | 014   |
| T10 | Variable-font axis animation         | CSS    | —         | static         | 014   |
| T11 | Line-by-line reveal on scroll        | SDA    | S         | instant        | 014   |

Split text keeps one accessible copy (`aria-label` on the container or a visually hidden original)
and must respect Capsize trimming from `@neshel-ui/typography` (ADR 0011).

## 11 · SVG & Paths (S)

| Id  | Effect                              | Driver | Structure | Reduced motion | Phase |
| --- | ----------------------------------- | ------ | --------- | -------------- | ----- |
| S01 | Path draw (stroke-dashoffset)       | CSS    | —         | instant        | 014   |
| S02 | Path morph (compatible commands)    | WAAPI  | —         | instant        | 014   |
| S03 | Motion along a path (`offset-path`) | CSS    | —         | static         | 014   |
| S04 | Icon morph (menu ↔ close)           | CSS    | —         | instant        | 014   |
| S05 | Animated gradient stops             | CSS    | —         | static         | 014   |
| S06 | Line-chart draw-in                  | CSS    | —         | instant        | 014   |
| S07 | Turbulence wobble (SVG filter)      | JS     | —         | off            | 014   |
| S08 | Logo reveal mask                    | CSS    | —         | instant        | 014   |
| S09 | Dash flow (marching ants)           | CSS    | —         | static         | 014   |
| S10 | Success checkmark draw              | CSS    | —         | instant        | 014   |

## 12 · Images & Media (M)

| Id  | Effect                              | Driver | Structure | Reduced motion | Phase |
| --- | ----------------------------------- | ------ | --------- | -------------- | ----- |
| M01 | Ken Burns                           | CSS    | W         | static         | 015   |
| M02 | Blur-up progressive load            | CSS    | L         | instant        | 015   |
| M03 | Reveal mask on load                 | CSS    | —         | instant        | 015   |
| M04 | Before / after comparison slider    | JS     | L         | n/a            | 015   |
| M05 | Duotone transition                  | CSS    | —         | instant        | 015   |
| M06 | Video scroll scrub (`currentTime`)  | JS     | W         | static         | 015   |
| M07 | Lightbox zoom from thumbnail (FLIP) | WAAPI  | L         | fade           | 015   |
| M08 | Gallery cross-fade                  | CSS    | L         | fade           | 015   |
| M09 | Pixel / dissolve transition         | GPU    | C         | fade           | 015   |
| M10 | Hover pan inside frame              | JS     | W         | static         | 015   |

## 13 · Background & Ambient (B)

| Id  | Effect                | Driver  | Structure | Reduced motion | Phase |
| --- | --------------------- | ------- | --------- | -------------- | ----- |
| B01 | Gradient shift        | CSS     | —         | static         | 015   |
| B02 | Aurora blobs          | CSS     | W         | static         | 015   |
| B03 | Grain / noise overlay | CSS     | W         | static         | 015   |
| B04 | Particles             | GPU     | C         | static         | 015   |
| B05 | Starfield             | GPU     | C         | static         | 015   |
| B06 | Animated grid / dots  | CSS     | W         | static         | 015   |
| B07 | Mesh gradient         | CSS/GPU | W/C       | static         | 015   |
| B08 | Floating shapes       | CSS     | G         | static         | 015   |
| B09 | Pointer-reactive glow | JS      | W         | static         | 015   |
| B10 | Waves (SVG)           | CSS     | W         | static         | 015   |

Ambient effects pause when off-screen or when the page is hidden (contracts/accessibility.md §4).

## 14 · Loading & Feedback (F)

| Id  | Effect                        | Driver | Structure | Reduced motion | Phase |
| --- | ----------------------------- | ------ | --------- | -------------- | ----- |
| F01 | Spinner                       | CSS    | —         | reduced⁸       | 015   |
| F02 | Skeleton shimmer              | CSS    | —         | static         | 015   |
| F03 | Indeterminate progress bar    | CSS    | —         | reduced⁸       | 015   |
| F04 | Dots pulse                    | CSS    | G         | reduced⁸       | 015   |
| F05 | Success check                 | CSS    | —         | instant        | 015   |
| F06 | Toast enter / exit            | CSS    | —         | fade           | 015   |
| F07 | Button loading morph          | CSS    | —         | instant        | 015   |
| F08 | Optimistic pulse              | CSS    | —         | static         | 015   |
| F09 | Progress ring                 | CSS    | —         | instant        | 015   |
| F10 | Pending state shimmer on text | CSS    | —         | static         | 015   |

⁸ Loading indicators keep a slow, non-vestibular signal so users still perceive progress; the
`components` Skeleton and Button spinner already follow this rule (feature 005).

## 15 · Advanced 3D & Distortion (D)

| Id  | Effect                          | Driver | Structure | Reduced motion | Phase |
| --- | ------------------------------- | ------ | --------- | -------------- | ----- |
| D01 | Card flip                       | CSS    | W + L     | fade           | 016   |
| D02 | Cube rotation                   | CSS    | W + L     | fade           | 016   |
| D03 | 3D ring carousel                | CSS/JS | W         | static         | 016   |
| D04 | Page curl                       | GPU    | C         | instant        | 016   |
| D05 | CornerRecede (prototype, 008.0) | CSS⁹   | L         | instant        | 016   |
| D06 | Liquid / ripple distortion      | GPU    | C         | off            | 016   |
| D07 | RGB split / glitch              | CSS    | L         | off            | 016   |
| D08 | Displacement-map hover (media)  | GPU    | C         | static         | 016   |
| D09 | Perspective grid floor          | CSS    | W         | static         | 016   |
| D10 | Depth-map parallax (2.5D image) | GPU    | C         | static         | 016   |
| D11 | Tilt-shift blur                 | CSS    | L         | static         | 016   |

⁹ Hinged fold (two layers) is the recommended technique for live content; a WebGL mesh is the only
real deformation and only for raster content (research R7).

## Shared primitives by family

| Primitive (core unless noted)        | Families          | Status               |
| ------------------------------------ | ----------------- | -------------------- |
| Frame scheduler (read/update/write)  | all JS effects    | implemented (008.0)  |
| Spring integrator                    | H, P, G, SP, L, C | implemented (008.0)  |
| Transform composer                   | H, P, G, SP, D    | implemented (008.0)  |
| Reduced-motion policy                | all               | implemented (008.0)  |
| Spring → CSS `linear()` easing       | E, H, P, L, F     | implemented (009)    |
| Interpolation / easing / clamp       | all               | implemented (009)    |
| Effect registry + channel metadata   | all               | implemented (009)    |
| Pointer tracker (box-based hit area) | H, B, G           | implemented (010)    |
| Intersection / visibility observer   | ST, SP, B, M      | implemented (011)    |
| Scroll progress (cached geometry)    | ST, SP, C, M, T   | spike in ScrollScene |
| Timeline (labels, overlaps, scrub)   | C, PT, T, S       | planned (013)        |
| Presence / exit orchestration        | L, PT, F          | implemented (012)    |
| FLIP measurer                        | L, M              | implemented (012)    |
| Gesture recogniser (drag, pinch)     | G, M              | implemented (012)    |
| Text splitter (accessible)           | T, C              | planned (014)        |
| Path utilities (length, morph)       | S                 | planned (014)        |
| GPU surface manager (optional entry) | D, M, B           | planned (016)        |
