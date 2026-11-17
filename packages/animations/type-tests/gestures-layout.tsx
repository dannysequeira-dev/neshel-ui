// Type fixtures for Phase 012 (pnpm typecheck): valid usage compiles; each `@ts-expect-error` must be needed.
import { attachEffect, definePreset, motionValue } from "../src/core/index.js";
import { fadeSlide } from "../src/entrance/index.js";
import {
  createGesture,
  createGestureControls,
  drag,
  dragSnap,
  Gesture,
  PinchZoom,
  pinchZoom,
  Reorder,
  ReorderHandle,
  ReorderItem,
  rotateGesture,
  SwipeDismiss,
  springFollow,
  squashStretch,
  useReorderItem,
} from "../src/gestures/index.js";
import { CursorFollower, cursorFollower } from "../src/hover/index.js";
import {
  AnimatedList,
  Collapse,
  CrossFade,
  createLayoutGroup,
  createPresence,
  flipMove,
  LayoutGroup,
  LayoutItem,
  Masonry,
  Presence,
  sharedLayout,
  TabIndicator,
  usePresence,
} from "../src/layout/index.js";
import { LongPress, longPress } from "../src/press/index.js";

declare const element: HTMLElement;

const controls = createGestureControls();
attachEffect(element, drag, {
  axis: "x",
  constraints: "parent",
  controls,
  onEnd: ({ x, y }) => void (x + y),
});
attachEffect(element, dragSnap, {
  snap: { grid: { x: 50 } },
  onSnap: (point, index) => void (point.x + index),
});
attachEffect(element, pinchZoom, { maxScale: 6, onZoomChange: (scale: number) => void scale });
attachEffect(element, rotateGesture, { step: 15 });
attachEffect(element, springFollow, { x: motionValue(0), spring: "gentle" });
attachEffect(element, squashStretch, { intensity: 0.5 });
attachEffect(element, cursorFollower, { size: 24, pointerTypes: ["mouse"] });
attachEffect(element, longPress, {
  duration: 800,
  keyboard: "press",
  onLongPress: (source) => void source,
});
const gesture = createGesture(element, { pointers: 2, onMove: (state) => void state.scale });
gesture.destroy();
controls.zoomBy(2);

const group = createLayoutGroup();
attachEffect(element, flipMove, {
  group,
  layout: "both",
  transition: { type: "tween", duration: 200 },
});
attachEffect(element, sharedLayout, { group, layoutId: "hero" });
const presence = createPresence<string>();
presence.update([{ key: "a", value: "A" }]);
const fadeUp = definePreset("fade-up", fadeSlide, { direction: "up" });

function Item() {
  const [isPresent, safeToRemove] = usePresence();
  const { moveUp, isFirst } = useReorderItem();
  void moveUp;
  void isFirst;
  if (!isPresent) safeToRemove();
  return null;
}

export const ok = (
  <>
    <Gesture preset={[drag, squashStretch]} />
    <Gesture preset={drag} options={{ axis: "y", inertia: false }} />
    <SwipeDismiss onDismiss={(direction) => void direction} dismissLabel="Close" />
    <PinchZoom label="Map">
      <img alt="" src="" />
    </PinchZoom>
    <Reorder onReorder={(from, to) => void (from + to)}>
      <ReorderItem index={0} label="A">
        <ReorderHandle />
        <Item />
      </ReorderItem>
    </Reorder>
    <LayoutGroup>
      <LayoutItem layoutId="hero" layout="position" />
    </LayoutGroup>
    <AnimatedList as="ol">
      <li key="a">A</li>
    </AnimatedList>
    <Presence enter={fadeUp} exit={fadeUp}>
      <div key="x" />
    </Presence>
    <Collapse open driver="js" />
    <TabIndicator active={0} orientation="vertical" />
    <CrossFade swapKey="1">content</CrossFade>
    <Masonry minColumnWidth={180} gap={12} />
    <CursorFollower size={20} />
    <LongPress asChild onLongPress={() => {}}>
      <button type="button">Hold</button>
    </LongPress>
  </>
);

// @ts-expect-error axis is x, y or both
attachEffect(element, drag, { axis: "z" });
// @ts-expect-error a cursor follower has no touch input
attachEffect(element, cursorFollower, { pointerTypes: ["touch"] });
// @ts-expect-error the layout mode is a closed list
attachEffect(element, flipMove, { layout: "everything" });
// Family membership of `<Gesture preset>` is checked at render (NeshelAnimationsError, like <Hover>/<Press>).
// @ts-expect-error swipe directions are a closed list
export const wrongSwipe = <SwipeDismiss direction="diagonal" />;
