// Phase 012 gallery: the 23 Physics & Gestures (G01–G11), Layout Animations (L01–L10), H11 and P11 effects
// rendered with the real package exports (no local re-implementations), with their non-gesture alternatives
// and compositions. `gestures-suite.ts` checks it in real engines (CDP Chrome and Playwright).
import { definePreset, motionValue } from "@neshel-ui/animations/core";
import { fadeSlide } from "@neshel-ui/animations/entrance";
import {
  drag,
  dragSnap,
  ElasticScroll,
  fling,
  Gesture,
  getGestureDebugInfo,
  PinchZoom,
  PullToRefresh,
  Reorder,
  ReorderHandle,
  ReorderItem,
  rotateGesture,
  SwipeDismiss,
  springFollow,
  squashStretch,
  useGestureControls,
  useReorderItem,
} from "@neshel-ui/animations/gestures";
import { CursorFollower, Hover, lift, tilt3D } from "@neshel-ui/animations/hover";
import {
  AnimatedList,
  AutoHeight,
  Collapse,
  CrossFade,
  getLayoutDebugInfo,
  LayoutGroup,
  LayoutItem,
  Masonry,
  Presence,
  Reflow,
  TabIndicator,
} from "@neshel-ui/animations/layout";
import { LongPress, Press, pressScale } from "@neshel-ui/animations/press";
import { useEffect, useMemo, useState } from "react";
import { gesturesReducedFacts, runGesturesSuite } from "./gestures-suite";
import { labState } from "./lab-state";

const exitPreset = definePreset("gallery-exit", fadeSlide, { direction: "up", duration: 220 });

const MEDIA = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="300" viewBox="0 0 480 300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4f46e5"/><stop offset="1" stop-color="#db2777"/></linearGradient></defs><rect width="480" height="300" fill="url(#g)"/><g fill="#fff" opacity=".85">' +
    Array.from(
      { length: 12 },
      (_, i) =>
        `<circle cx="${40 + i * 36}" cy="${150 + Math.sin(i) * 80}" r="${6 + (i % 4) * 3}"/>`,
    ).join("") +
    '</g><text x="24" y="40" font-family="sans-serif" font-size="22" fill="#fff">Pinch, double-tap or use the buttons</text></svg>',
)}`;

function FruitControls() {
  const { moveUp, moveDown, isFirst, isLast } = useReorderItem();
  return (
    <span className="g-row-buttons">
      <button type="button" className="gallery-button" onClick={moveUp} disabled={isFirst}>
        Move up
      </button>
      <button type="button" className="gallery-button" onClick={moveDown} disabled={isLast}>
        Move down
      </button>
    </span>
  );
}

function shuffle<T>(items: readonly T[]): T[] {
  const next = [...items];
  // Deterministic rotation + swap (the suite expects every item to move).
  next.push(next.shift() as T);
  if (next.length > 3) [next[1], next[2]] = [next[2] as T, next[1] as T];
  return next;
}

export function GesturesGallery() {
  // G03
  const [notes, setNotes] = useState(["Build passed", "New comment", "Deploy ready"]);
  // G04
  const [refreshes, setRefreshes] = useState(0);
  // G05
  const follow = useMemo(() => motionValue(0), []);
  // G09
  const rotateControls = useGestureControls();
  // G10
  const [fruits, setFruits] = useState(["Apple", "Banana", "Cherry", "Damson"]);
  // P11
  const [held, setHeld] = useState(0);
  const [clicked, setClicked] = useState(0);
  // L01 / L04
  const [order, setOrder] = useState(["A", "B", "C", "D"]);
  const [selected, setSelected] = useState(0);
  // L02
  const [lines, setLines] = useState(1);
  // L03
  const [listItems, setListItems] = useState(["One", "Two", "Three"]);
  const [nextItem, setNextItem] = useState(4);
  // L05 / L10
  const [wide, setWide] = useState(true);
  // L06
  const [open, setOpen] = useState<number | null>(null);
  const [openJs, setOpenJs] = useState(false);
  // L07
  const [tab, setTab] = useState(0);
  // L08
  const [shown, setShown] = useState(true);
  // L09
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    labState().gestures = {
      runGesturesSuite,
      reducedFacts: gesturesReducedFacts,
      debug: () => ({ gestures: getGestureDebugInfo(), layout: getLayoutDebugInfo() }),
    };
  }, []);

  const tabs = ["Overview", "Specifications", "Reviews"];
  const slides = [
    "Short slide.",
    "A longer slide with two sentences. The height follows the content.",
    "Third.",
  ];

  return (
    <section className="lab-section gallery" aria-labelledby="gestures-title">
      <h2 id="gestures-title">Physics, gestures &amp; layout (Phase 012)</h2>
      <p>
        The 23 Phase 012 effects with real input. Every functional gesture has a keyboard path and a
        button; toggle <em>Reduce motion</em> in the operating system to see the reduced behaviour.
      </p>

      <h3 id="g-physics">Physics &amp; gestures</h3>
      <div className="gallery-grid g-grid">
        <figure className="gallery-tile">
          <figcaption>G01 Drag with inertia (arrows when focused)</figcaption>
          <div className="g-arena" id="g01-arena">
            <Gesture
              preset={drag}
              options={{ constraints: "parent" }}
              id="g01-drag"
              className="g-puck"
              tabIndex={0}
              role="group"
              aria-roledescription="draggable"
              aria-label="Draggable puck"
            />
          </div>
        </figure>
        <figure className="gallery-tile">
          <figcaption>G02 Constraints + snap points</figcaption>
          <div className="g-arena g-track" id="g02-arena">
            <Gesture
              preset={dragSnap}
              options={{ axis: "x", snap: [{ x: 0 }, { x: 70 }, { x: 140 }] }}
              id="g02-snap"
              className="g-puck"
              tabIndex={0}
              role="group"
              aria-roledescription="draggable"
              aria-label="Snapping puck"
            />
          </div>
        </figure>
        <figure className="gallery-tile">
          <figcaption>G03 Swipe to dismiss (or the × button, or Delete)</figcaption>
          <div id="g03-list" className="g-notes">
            {notes.map((note) => (
              <SwipeDismiss
                key={note}
                className="g-note"
                data-note={note}
                tabIndex={0}
                onDismiss={() => setNotes((current) => current.filter((item) => item !== note))}
              >
                {note}
              </SwipeDismiss>
            ))}
            {notes.length < 3 ? (
              <button
                type="button"
                className="gallery-button"
                id="g03-reset"
                onClick={() => setNotes(["Build passed", "New comment", "Deploy ready"])}
              >
                Restore notes
              </button>
            ) : null}
          </div>
        </figure>
        <figure className="gallery-tile">
          <figcaption>
            G04 Pull to refresh (refreshed <span id="g04-count">{refreshes}</span>×)
          </figcaption>
          <PullToRefresh
            id="g04-pull"
            className="g-pull"
            threshold={56}
            scrollerLabel="Feed"
            onRefresh={() =>
              new Promise<void>((resolve) =>
                setTimeout(() => {
                  setRefreshes((n) => n + 1);
                  resolve();
                }, 250),
              )
            }
          >
            {Array.from({ length: 12 }, (_, i) => (
              <p key={i}>Feed item {i + 1}</p>
            ))}
          </PullToRefresh>
        </figure>
        <figure className="gallery-tile">
          <figcaption>G05 Spring follow</figcaption>
          <label className="g-label">
            Target{" "}
            <input
              id="g05-input"
              type="range"
              min={0}
              max={200}
              defaultValue={0}
              onChange={(event) => follow.set(Number(event.currentTarget.value))}
            />
          </label>
          <Gesture
            preset={springFollow}
            options={{ x: follow }}
            id="g05-follow"
            className="g-puck g-small"
          />
        </figure>
        <figure className="gallery-tile">
          <figcaption>G06 Elastic edge (scroll past the ends)</figcaption>
          <ElasticScroll id="g06-elastic" className="g-scroller" label="Elastic rows">
            {Array.from({ length: 10 }, (_, i) => (
              <p key={i}>Row {i + 1}</p>
            ))}
          </ElasticScroll>
        </figure>
        <figure className="gallery-tile">
          <figcaption>G07 Throw / fling</figcaption>
          <div className="g-arena" id="g07-arena">
            <Gesture
              preset={fling}
              options={{ bounce: 0.6 }}
              id="g07-fling"
              className="g-puck"
              tabIndex={0}
              role="group"
              aria-roledescription="draggable"
              aria-label="Throwable puck"
            />
          </div>
        </figure>
        <figure className="gallery-tile">
          <figcaption>G08 Pinch-zoom media</figcaption>
          <PinchZoom id="g08-zoom" label="Gradient artwork" doubleTapScale={2} wheel>
            <img src={MEDIA} alt="Abstract gradient artwork" width={480} height={300} />
          </PinchZoom>
        </figure>
        <figure className="gallery-tile">
          <figcaption>G09 Rotate (two fingers, [ ] keys or buttons)</figcaption>
          <Gesture
            preset={rotateGesture}
            options={{ controls: rotateControls }}
            id="g09-rotate"
            className="g-rotor"
            tabIndex={0}
            role="group"
            aria-roledescription="rotatable"
            aria-label="Rotatable dial"
          />
          <span className="g-row-buttons">
            <button
              type="button"
              className="gallery-button"
              id="g09-left"
              onClick={() => rotateControls.rotateBy(-15)}
            >
              Rotate left
            </button>
            <button
              type="button"
              className="gallery-button"
              id="g09-right"
              onClick={() => rotateControls.rotateBy(15)}
            >
              Rotate right
            </button>
            <button type="button" className="gallery-button" onClick={() => rotateControls.reset()}>
              Reset
            </button>
          </span>
        </figure>
        <figure className="gallery-tile">
          <figcaption>G10 Drag to reorder (handle, keyboard or buttons)</figcaption>
          <Reorder
            id="g10-list"
            className="g-reorder"
            onReorder={(from, to) =>
              setFruits((current) => {
                const next = [...current];
                const [moved] = next.splice(from, 1);
                next.splice(to, 0, moved as string);
                return next;
              })
            }
          >
            {fruits.map((fruit, index) => (
              <ReorderItem key={fruit} index={index} label={fruit} className="g-fruit">
                <ReorderHandle />
                <span className="g-fruit-name">{fruit}</span>
                <FruitControls />
              </ReorderItem>
            ))}
          </Reorder>
        </figure>
        <figure className="gallery-tile">
          <figcaption>G11 Velocity squash &amp; stretch (decorative)</figcaption>
          <div className="g-arena" id="g11-arena">
            <Gesture preset={[drag, squashStretch]} id="g11-squash" className="g-puck g-round" />
          </div>
        </figure>
      </div>

      <h3 id="g-hover-press">Hover &amp; press</h3>
      <div className="gallery-grid g-grid">
        <figure className="gallery-tile">
          <figcaption>H11 Cursor follower (decorative, mouse/pen)</figcaption>
          <CursorFollower id="h11-area" className="g-area" size={22}>
            <button type="button" className="gallery-button" id="h11-button">
              Still clickable
            </button>
          </CursorFollower>
        </figure>
        <figure className="gallery-tile">
          <figcaption>
            P11 Long press (held <span id="p11-count">{held}</span>×, clicked{" "}
            <span id="p11-clicks">{clicked}</span>×)
          </figcaption>
          <LongPress asChild duration={600} onLongPress={() => setHeld((n) => n + 1)}>
            <button
              type="button"
              id="p11-button"
              className="gallery-button g-hold"
              onClick={() => setClicked((n) => n + 1)}
            >
              Hold to archive
            </button>
          </LongPress>
        </figure>
      </div>

      <h3 id="g-layout">Layout animations</h3>
      <div className="gallery-grid g-grid">
        <figure className="gallery-tile">
          <figcaption>L01 FLIP move / reorder</figcaption>
          <button
            type="button"
            className="gallery-button"
            id="l01-shuffle"
            onClick={() => setOrder((current) => shuffle(current))}
          >
            Shuffle
          </button>
          <LayoutGroup>
            <ul className="g-flip" id="l01">
              {order.map((item) => (
                <LayoutItem asChild key={item}>
                  <li data-item={item}>{item}</li>
                </LayoutItem>
              ))}
            </ul>
          </LayoutGroup>
        </figure>
        <figure className="gallery-tile">
          <figcaption>L02 Auto-height</figcaption>
          <button
            type="button"
            className="gallery-button"
            id="l02-add"
            onClick={() => setLines((n) => (n >= 4 ? 1 : n + 1))}
          >
            {lines >= 4 ? "Reset" : "Add a line"}
          </button>
          <AutoHeight id="l02" className="g-box">
            {Array.from({ length: lines }, (_, i) => (
              <p key={i}>Line {i + 1} of content that grows.</p>
            ))}
          </AutoHeight>
        </figure>
        <figure className="gallery-tile">
          <figcaption>L03 List enter / exit</figcaption>
          <span className="g-row-buttons">
            <button
              type="button"
              className="gallery-button"
              id="l03-add"
              onClick={() => {
                setListItems((current) => [`Item ${nextItem}`, ...current]);
                setNextItem((n) => n + 1);
              }}
            >
              Add
            </button>
            <button
              type="button"
              className="gallery-button"
              id="l03-remove"
              onClick={() => setListItems((current) => current.slice(0, -1))}
            >
              Remove last
            </button>
          </span>
          <AnimatedList id="l03" className="g-flip">
            {listItems.map((item) => (
              <li key={item} data-item={item}>
                {item}
              </li>
            ))}
          </AnimatedList>
        </figure>
        <figure className="gallery-tile">
          <figcaption>L04 Shared layout (selection highlight)</figcaption>
          <LayoutGroup>
            <fieldset className="g-segments" id="l04">
              <legend className="neshel-sr-only">Plan</legend>
              {["Free", "Pro", "Team"].map((plan, index) => (
                <button
                  key={plan}
                  type="button"
                  aria-pressed={selected === index}
                  className="g-segment"
                  data-plan={plan}
                  onClick={() => setSelected(index)}
                >
                  {selected === index ? (
                    <LayoutItem layoutId="l04-highlight" className="g-highlight" />
                  ) : null}
                  <span className="g-segment-label">{plan}</span>
                </button>
              ))}
            </fieldset>
          </LayoutGroup>
        </figure>
        <figure className="gallery-tile">
          <figcaption>L05 Grid reflow (no React render per frame)</figcaption>
          <button
            type="button"
            className="gallery-button"
            id="l05-toggle"
            onClick={() => setWide((w) => !w)}
          >
            Toggle width
          </button>
          <Reflow id="l05" className={wide ? "g-reflow" : "g-reflow g-narrow"}>
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="g-cell">
                {i + 1}
              </div>
            ))}
          </Reflow>
        </figure>
        <figure className="gallery-tile">
          <figcaption>L06 Accordion height (auto driver; JS driver below)</figcaption>
          <div id="l06-auto" className="g-accordion">
            {["Shipping", "Returns"].map((title, index) => (
              <div key={title}>
                <h4 className="g-acc-heading">
                  <button
                    type="button"
                    id={`l06-trigger-${index}`}
                    aria-expanded={open === index}
                    aria-controls={`l06-panel-${index}`}
                    onClick={() => setOpen(open === index ? null : index)}
                  >
                    {title}
                  </button>
                </h4>
                <Collapse
                  open={open === index}
                  id={`l06-panel-${index}`}
                  onRequestOpen={() => setOpen(index)}
                >
                  <p className="g-acc-body">
                    {title} details. Long enough to show the height animating from zero to its
                    content height and back.
                  </p>
                </Collapse>
              </div>
            ))}
          </div>
          <div id="l06-js" className="g-accordion">
            <h4 className="g-acc-heading">
              <button
                type="button"
                id="l06-js-trigger"
                aria-expanded={openJs}
                aria-controls="l06-js-panel"
                onClick={() => setOpenJs((o) => !o)}
              >
                Measured fallback (driver: js)
              </button>
            </h4>
            <Collapse open={openJs} id="l06-js-panel" driver="js">
              <p className="g-acc-body">
                Animated with a measured, transient WAAPI height animation.
              </p>
            </Collapse>
          </div>
        </figure>
        <figure className="gallery-tile">
          <figcaption>L07 Tab indicator slide</figcaption>
          <TabIndicator asChild active={tab}>
            <div role="tablist" aria-label="Product" id="l07" className="g-tabs">
              {tabs.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  role="tab"
                  aria-selected={tab === index}
                  tabIndex={tab === index ? 0 : -1}
                  onClick={() => setTab(index)}
                  className="g-tab"
                >
                  {label}
                </button>
              ))}
            </div>
          </TabIndicator>
        </figure>
        <figure className="gallery-tile">
          <figcaption>L08 Presence (exit before unmount)</figcaption>
          <button
            type="button"
            className="gallery-button"
            id="l08-toggle"
            aria-pressed={shown}
            onClick={() => setShown((s) => !s)}
          >
            {shown ? "Hide card" : "Show card"}
          </button>
          <div className="g-presence">
            <Presence enter={exitPreset} exit={exitPreset}>
              {shown ? (
                <div key="card" id="l08-card" className="g-card">
                  A card that animates out before it unmounts.
                </div>
              ) : null}
            </Presence>
          </div>
        </figure>
        <figure className="gallery-tile">
          <figcaption>L09 Content cross-fade swap</figcaption>
          <button
            type="button"
            className="gallery-button"
            id="l09-next"
            onClick={() => setSlide((s) => (s + 1) % slides.length)}
          >
            Next
          </button>
          <CrossFade swapKey={slide} id="l09" className="g-box" aria-live="polite">
            <p>{slides[slide]}</p>
          </CrossFade>
        </figure>
        <figure className="gallery-tile g-wide">
          <figcaption>L10 Masonry reflow</figcaption>
          <Masonry id="l10" className="g-masonry" minColumnWidth={wide ? 140 : 200} gap={10}>
            {[60, 110, 80, 140, 70, 100, 90, 130, 75, 120, 65, 95].map((height, i) => (
              <div key={i} className="g-brick" style={{ height }}>
                {i + 1}
              </div>
            ))}
          </Masonry>
        </figure>
      </div>

      <h3 id="g-compose">Composition</h3>
      <div className="gallery-grid g-grid">
        <figure className="gallery-tile">
          <figcaption>Drag + Tilt3D</figcaption>
          <div className="g-arena" id="c1-arena">
            <Hover preset={tilt3D} asChild>
              <Gesture preset={drag} id="c-drag-tilt" className="g-puck" />
            </Hover>
          </div>
        </figure>
        <figure className="gallery-tile">
          <figcaption>Drag + hover lift + press scale</figcaption>
          <div className="g-arena" id="c2-arena">
            <Hover preset={lift} asChild>
              <Press preset={pressScale} asChild>
                <Gesture preset={drag} id="c-drag-hover-press" className="g-puck" />
              </Press>
            </Hover>
          </div>
        </figure>
      </div>
    </section>
  );
}
