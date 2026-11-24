"use client";
import { drag, Gesture, useGestureControls } from "@neshel-ui/animations/gestures";
import { Button } from "@neshel-ui/components";

export default function G01Example() {
  const controls = useGestureControls();
  return (
    <div className="grid gap-3">
      <div className="relative h-44 rounded-xl bg-neshel-muted">
        <Gesture
          preset={drag}
          options={{ constraints: "parent", controls }}
          tabIndex={0}
          role="group"
          aria-roledescription="draggable"
          aria-label="Draggable card"
          className="size-16 cursor-grab rounded-xl bg-neshel-primary"
        />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => controls.moveBy(48, 0)}>
          Move right
        </Button>
        <Button variant="outline" onClick={() => controls.reset()}>
          Reset
        </Button>
      </div>
    </div>
  );
}
