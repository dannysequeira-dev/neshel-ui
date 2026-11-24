"use client";
import { inViewPresets, useInView } from "@neshel-ui/animations/scroll";
import { useRef } from "react";

export default function ST10Example() {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, inViewPresets.full);
  return (
    <div
      ref={ref}
      className="rounded-xl border border-neshel-border bg-neshel-surface p-6 text-neshel-surface-foreground"
    >
      {visible ? "Fully visible" : "Partly visible"} — {Object.keys(inViewPresets).join(", ")}
    </div>
  );
}
