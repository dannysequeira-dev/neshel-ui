"use client";
import { ScrollEffect, type ZoomOnScrollOptions, zoomOnScroll } from "@neshel-ui/animations/scroll";

export default function SP07Example() {
  return (
    <ScrollEffect
      preset={zoomOnScroll}
      options={{ from: 0.8, to: 1 } satisfies ZoomOnScrollOptions}
      className="rounded-xl border border-neshel-border bg-neshel-surface p-6 text-neshel-surface-foreground"
    >
      Grows with the scroll position
    </ScrollEffect>
  );
}
