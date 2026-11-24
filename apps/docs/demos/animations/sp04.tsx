"use client";
import "@neshel-ui/animations/scroll.css";
import { HorizontalScroll } from "@neshel-ui/animations/scroll";

export default function SP04Example() {
  return (
    <HorizontalScroll label="Milestones" layout="scroll">
      {["Idea", "Prototype", "Beta", "Launch", "Growth"].map((item) => (
        <a
          key={item}
          href="#sp04"
          className="rounded-xl border border-neshel-border bg-neshel-surface p-6 text-neshel-surface-foreground w-64"
        >
          {item}
        </a>
      ))}
    </HorizontalScroll>
  );
}
