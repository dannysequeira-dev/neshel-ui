"use client";
import "@neshel-ui/animations/hover.css";
import { borderSweep, Hover } from "@neshel-ui/animations/hover";

export default function H06Example() {
  return (
    <Hover preset={borderSweep} options={{ width: 2, duration: 2400 }} asChild>
      <a
        href="#h06"
        className="rounded-xl border border-neshel-border bg-neshel-surface p-6 text-neshel-surface-foreground inline-block"
      >
        A gradient runs along the border
      </a>
    </Hover>
  );
}
