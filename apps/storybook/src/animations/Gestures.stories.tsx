import "@neshel-ui/animations/gestures.css";
import { motionValue } from "@neshel-ui/animations/core";
import {
  drag,
  dragSnap,
  ElasticScroll,
  fling,
  Gesture,
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
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type CSSProperties, useMemo, useState } from "react";

interface Args {
  reducedMotion: "user" | "always" | "never";
}

const meta = {
  title: "Animations (experimental)/Physics & Gestures",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Phase 012, private package (`@neshel-ui/animations/gestures` + `gestures.css`). Every functional gesture has a keyboard path and a single-pointer, non-drag alternative (buttons or `useGestureControls()`); `touch-action` is set only on the interaction area (one-finger scrolling stays available where a gesture does not need it). Reorder changes YOUR order through `onReorder(from, to)`; the package never reorders the DOM. Decorative effects (elastic edge, squash & stretch) turn off for reduced motion.",
      },
    },
  },
  args: { reducedMotion: "user" },
  argTypes: { reducedMotion: { control: "inline-radio", options: ["user", "always", "never"] } },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

const arena: CSSProperties = {
  position: "relative",
  height: 180,
  border: "1px dashed var(--neshel-border, #ccc)",
  borderRadius: 12,
  overflow: "hidden",
};
const puck: CSSProperties = {
  width: 56,
  height: 56,
  borderRadius: 12,
  background: "var(--neshel-primary, #4f46e5)",
  cursor: "grab",
};
const grid: CSSProperties = {
  display: "grid",
  gap: 24,
  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
};

function DragAndThrowDemo({ reducedMotion }: Args) {
  const controls = useGestureControls();
  return (
    <div style={grid}>
      <figure style={{ margin: 0 }}>
        <figcaption>G01 drag with inertia (focus + arrows, or the buttons)</figcaption>
        <div style={arena}>
          <Gesture
            preset={drag}
            options={{ constraints: "parent", controls, reducedMotion }}
            style={puck}
            tabIndex={0}
            role="group"
            aria-roledescription="draggable"
            aria-label="Draggable card"
          />
        </div>
        <button type="button" onClick={() => controls.moveBy(40, 0)}>
          Move right
        </button>{" "}
        <button type="button" onClick={() => controls.reset()}>
          Reset
        </button>
      </figure>
      <figure style={{ margin: 0 }}>
        <figcaption>G02 constraints + snap points</figcaption>
        <div style={{ ...arena, height: 80 }}>
          <Gesture
            preset={dragSnap}
            options={{ axis: "x", snap: [{ x: 0 }, { x: 80 }, { x: 160 }], reducedMotion }}
            style={puck}
            tabIndex={0}
            role="group"
            aria-roledescription="draggable"
            aria-label="Snapping card"
          />
        </div>
      </figure>
      <figure style={{ margin: 0 }}>
        <figcaption>G07 throw / fling (bounces)</figcaption>
        <div style={arena}>
          <Gesture preset={fling} options={{ bounce: 0.6, reducedMotion }} style={puck} />
        </div>
      </figure>
      <figure style={{ margin: 0 }}>
        <figcaption>G11 velocity squash &amp; stretch (decorative)</figcaption>
        <div style={arena}>
          <Gesture preset={[drag, squashStretch]} style={{ ...puck, borderRadius: "50%" }} />
        </div>
      </figure>
    </div>
  );
}

function SwipeAndPullDemo({ reducedMotion }: Args) {
  const [notes, setNotes] = useState(["Build passed", "New comment", "Deploy ready"]);
  const [count, setCount] = useState(0);
  return (
    <div style={grid}>
      <div style={{ display: "grid", gap: 8 }}>
        {notes.map((note) => (
          <SwipeDismiss
            key={note}
            reducedMotion={reducedMotion}
            onDismiss={() => setNotes((all) => all.filter((n) => n !== note))}
            style={{
              padding: "12px 40px 12px 12px",
              borderRadius: 8,
              background: "var(--neshel-muted, #f1f5f9)",
            }}
          >
            {note}
          </SwipeDismiss>
        ))}
        <button
          type="button"
          onClick={() => setNotes(["Build passed", "New comment", "Deploy ready"])}
        >
          Restore
        </button>
      </div>
      <PullToRefresh
        reducedMotion={reducedMotion}
        scrollerLabel="Feed"
        style={{ height: 220 }}
        onRefresh={() =>
          new Promise<void>((resolve) =>
            setTimeout(() => {
              setCount((n) => n + 1);
              resolve();
            }, 400),
          )
        }
      >
        <p>Refreshed {count}×. Pull down at the top (touch or mouse), or use the button.</p>
        {Array.from({ length: 10 }, (_, i) => (
          <p key={i}>Item {i + 1}</p>
        ))}
      </PullToRefresh>
      <ElasticScroll
        label="Elastic rows"
        reducedMotion={reducedMotion}
        style={{ height: 200, border: "1px solid #ccc" }}
      >
        {Array.from({ length: 12 }, (_, i) => (
          <p key={i} style={{ padding: "0 12px" }}>
            Row {i + 1}
          </p>
        ))}
      </ElasticScroll>
    </div>
  );
}

function FollowZoomRotateDemo({ reducedMotion }: Args) {
  const target = useMemo(() => motionValue(0), []);
  const rotate = useGestureControls();
  return (
    <div style={grid}>
      <div>
        <label>
          Target{" "}
          <input
            type="range"
            min={0}
            max={200}
            defaultValue={0}
            onChange={(e) => target.set(Number(e.currentTarget.value))}
          />
        </label>
        <Gesture
          preset={springFollow}
          options={{ x: target, reducedMotion }}
          style={{ ...puck, width: 32, height: 32 }}
        />
      </div>
      <PinchZoom label="Gradient" reducedMotion={reducedMotion}>
        <img
          alt="Gradient"
          width={320}
          height={200}
          src="data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='200'%3E%3Cdefs%3E%3ClinearGradient id='g'%3E%3Cstop offset='0' stop-color='%234f46e5'/%3E%3Cstop offset='1' stop-color='%23db2777'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='320' height='200' fill='url(%23g)'/%3E%3C/svg%3E"
        />
      </PinchZoom>
      <div>
        <Gesture
          preset={rotateGesture}
          options={{ controls: rotate, reducedMotion }}
          tabIndex={0}
          role="group"
          aria-roledescription="rotatable"
          aria-label="Dial"
          style={{
            width: 96,
            height: 96,
            borderRadius: "50%",
            background: "conic-gradient(#4f46e5 0 25%, #db2777 0 50%, #f59e0b 0 75%, #10b981 0)",
          }}
        />
        <button type="button" onClick={() => rotate.rotateBy(-15)}>
          Rotate left
        </button>{" "}
        <button type="button" onClick={() => rotate.rotateBy(15)}>
          Rotate right
        </button>
      </div>
    </div>
  );
}

function DragToReorderDemo({ reducedMotion }: Args) {
  const [items, setItems] = useState(["Apple", "Banana", "Cherry", "Damson"]);
  return (
    <Reorder
      reducedMotion={reducedMotion}
      style={{ display: "grid", gap: 6, padding: 0, listStyle: "none", maxWidth: 420 }}
      onReorder={(from, to) =>
        setItems((all) => {
          const next = [...all];
          const [moved] = next.splice(from, 1);
          next.splice(to, 0, moved as string);
          return next;
        })
      }
    >
      {items.map((item, index) => (
        <ReorderItem
          key={item}
          index={index}
          label={item}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: 6,
            borderRadius: 8,
            background: "var(--neshel-muted, #f1f5f9)",
          }}
        >
          <ReorderHandle />
          <span style={{ flex: 1 }}>{item}</span>
          <MoveButtons />
        </ReorderItem>
      ))}
    </Reorder>
  );
}

export const DragAndThrow: Story = {
  name: "G01 drag · G02 snap · G07 fling · G11 squash",
  render: (args) => <DragAndThrowDemo {...args} />,
};

export const SwipeAndPull: Story = {
  name: "G03 swipe to dismiss · G04 pull to refresh · G06 elastic edge",
  render: (args) => <SwipeAndPullDemo {...args} />,
};

export const FollowZoomRotate: Story = {
  name: "G05 spring follow · G08 pinch zoom · G09 rotate",
  render: (args) => <FollowZoomRotateDemo {...args} />,
};

function MoveButtons() {
  const { moveUp, moveDown, isFirst, isLast } = useReorderItem();
  return (
    <span style={{ display: "inline-flex", gap: 4 }}>
      <button type="button" onClick={moveUp} disabled={isFirst}>
        Move up
      </button>
      <button type="button" onClick={moveDown} disabled={isLast}>
        Move down
      </button>
    </span>
  );
}

export const DragToReorder: Story = {
  name: "G10 drag to reorder (keyboard + buttons)",
  render: (args) => <DragToReorderDemo {...args} />,
};
