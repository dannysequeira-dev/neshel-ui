"use client";
import { fadeUp } from "@neshel-ui/animations/entrance";
import { RevealOnScroll } from "@neshel-ui/animations/scroll";

export default function ST01Example() {
  return (
    <RevealOnScroll
      preset={fadeUp}
      trigger="half"
      className="rounded-xl border border-neshel-border bg-neshel-surface p-6 text-neshel-surface-foreground"
    >
      Plays when half of it is visible
    </RevealOnScroll>
  );
}
