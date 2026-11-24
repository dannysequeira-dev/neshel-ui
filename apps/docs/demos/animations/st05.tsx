"use client";
import "@neshel-ui/animations/scroll.css";
import { inViewProgress, ScrollEffect } from "@neshel-ui/animations/scroll";

export default function ST05Example() {
  return (
    <ScrollEffect
      preset={inViewProgress}
      className="rounded-xl border border-neshel-border bg-neshel-surface p-6 text-neshel-surface-foreground"
    >
      Scroll the page: the bar is this card’s way through the viewport.
      <span
        aria-hidden="true"
        className="mt-4 block h-2 origin-left bg-neshel-primary"
        style={{ transform: "scaleX(var(--neshel-view-progress, 1))" }}
      />
    </ScrollEffect>
  );
}
