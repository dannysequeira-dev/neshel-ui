"use client";
import { fling, Gesture, useGestureControls } from "@neshel-ui/animations/gestures";
import { Button } from "@neshel-ui/components";

export default function G07Example() {
  const controls = useGestureControls();
  return (
    <div className="grid gap-3">
      <div className="relative h-44 rounded-xl bg-neshel-muted">
        <Gesture
          preset={fling}
          options={{ bounce: 0.6, controls }}
          tabIndex={0}
          role="group"
          aria-roledescription="draggable"
          aria-label="Puck"
          className="size-14 cursor-grab rounded-full bg-neshel-primary"
        />
      </div>
      <Button variant="outline" onClick={() => controls.reset()}>
        Bring it back
      </Button>
    </div>
  );
}
