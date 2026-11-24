"use client";
import "@neshel-ui/animations/hover.css";
import { Hover, lift } from "@neshel-ui/animations/hover";

export default function H01Example() {
  return (
    <Hover preset={lift} options={{ distance: 8, scale: 1.02 }} asChild>
      <a
        href="#h01"
        className="rounded-xl border border-neshel-border bg-neshel-surface p-6 text-neshel-surface-foreground inline-block"
      >
        Hover or focus me
      </a>
    </Hover>
  );
}
