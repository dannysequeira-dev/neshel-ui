"use client";
import "@neshel-ui/animations/hover.css";
import { Hover, spotlight } from "@neshel-ui/animations/hover";

export default function H05Example() {
  return (
    <Hover preset={spotlight} options={{ size: 200, intensity: 0.35 }} asChild>
      <a
        href="#h05"
        className="rounded-xl border border-neshel-border bg-neshel-surface p-6 text-neshel-surface-foreground block max-w-sm py-12"
      >
        A light follows the pointer
      </a>
    </Hover>
  );
}
