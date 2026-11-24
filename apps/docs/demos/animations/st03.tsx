"use client";
import { fadeUp } from "@neshel-ui/animations/entrance";
import { RevealOnScroll } from "@neshel-ui/animations/scroll";

const modes = ["once", "repeat", "reverse"] as const;

export default function ST03Example() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {modes.map((mode) => (
        <RevealOnScroll
          key={mode}
          preset={fadeUp}
          mode={mode}
          className="rounded-xl border border-neshel-border bg-neshel-surface p-6 text-neshel-surface-foreground"
        >
          mode: {mode}
        </RevealOnScroll>
      ))}
    </div>
  );
}
