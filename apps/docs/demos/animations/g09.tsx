"use client";
import { Gesture, rotateGesture, useGestureControls } from "@neshel-ui/animations/gestures";
import { Button } from "@neshel-ui/components";

export default function G09Example() {
  const controls = useGestureControls();
  return (
    <div className="grid justify-items-start gap-4">
      <Gesture
        preset={rotateGesture}
        options={{ step: 15, controls }}
        tabIndex={0}
        role="group"
        aria-label="Rotatable card, use the bracket keys"
        className="rounded-xl border border-neshel-border bg-neshel-surface p-6 text-neshel-surface-foreground m-6"
      >
        Rotate with two fingers, [ and ]
      </Gesture>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => controls.rotateBy(-15)}>
          −15°
        </Button>
        <Button variant="outline" onClick={() => controls.rotateBy(15)}>
          +15°
        </Button>
      </div>
    </div>
  );
}
