"use client";
import { fadeUp, type StaggerOptions, stagger } from "@neshel-ui/animations/entrance";
import { StaggerOnScroll } from "@neshel-ui/animations/scroll";

export default function ST02Example() {
  return (
    <StaggerOnScroll
      preset={stagger}
      options={{ preset: fadeUp, interval: 90 } satisfies StaggerOptions}
      className="flex flex-wrap gap-3"
    >
      {["One", "Two", "Three", "Four"].map((item) => (
        <div
          key={item}
          className="rounded-xl border border-neshel-border bg-neshel-surface p-6 text-neshel-surface-foreground"
        >
          {item}
        </div>
      ))}
    </StaggerOnScroll>
  );
}
