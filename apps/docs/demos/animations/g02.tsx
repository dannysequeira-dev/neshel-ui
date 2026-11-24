"use client";
import { dragSnap, Gesture, useGestureControls } from "@neshel-ui/animations/gestures";
import { Button } from "@neshel-ui/components";

const stops = [{ x: 0 }, { x: 110 }, { x: 220 }];

export default function G02Example() {
  const controls = useGestureControls();
  return (
    <div className="grid gap-3">
      <div className="relative h-20 w-72 rounded-xl bg-neshel-muted">
        <Gesture
          preset={dragSnap}
          options={{ axis: "x", snap: stops, controls }}
          tabIndex={0}
          role="group"
          aria-roledescription="draggable"
          aria-label="Three-position card"
          className="size-16 cursor-grab rounded-xl bg-neshel-primary"
        />
      </div>
      <div className="flex gap-2">
        {["Low", "Medium", "High"].map((label, index) => (
          <Button key={label} variant="outline" onClick={() => controls.snapTo(index)}>
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}
