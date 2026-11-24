"use client";
import { drag, Gesture, squashStretch } from "@neshel-ui/animations/gestures";

export default function G11Example() {
  return (
    <div className="relative h-44 rounded-xl bg-neshel-muted">
      <Gesture
        preset={[drag, squashStretch]}
        tabIndex={0}
        role="group"
        aria-roledescription="draggable"
        aria-label="Elastic ball"
        className="size-16 cursor-grab rounded-full bg-neshel-primary"
      />
    </div>
  );
}
