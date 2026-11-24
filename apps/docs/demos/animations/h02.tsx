"use client";
import "@neshel-ui/animations/hover.css";
import { glow, Hover } from "@neshel-ui/animations/hover";

export default function H02Example() {
  return (
    <Hover preset={glow} options={{ size: 4, blur: 24 }} asChild>
      <a
        href="#h02"
        className="rounded-xl border border-neshel-border bg-neshel-surface p-6 text-neshel-surface-foreground inline-block"
      >
        Hover or focus me
      </a>
    </Hover>
  );
}
