"use client";
import { useInView } from "@neshel-ui/animations/scroll";
import { useRef } from "react";

export default function ST04Example() {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, "half");
  return (
    <div
      ref={ref}
      className="rounded-xl border border-neshel-border bg-neshel-surface p-6 text-neshel-surface-foreground"
    >
      {visible ? "At least half visible" : "Less than half visible"}
    </div>
  );
}
