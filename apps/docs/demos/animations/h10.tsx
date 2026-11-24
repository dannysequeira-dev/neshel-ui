"use client";
import "@neshel-ui/animations/hover.css";
import { Hover, shine } from "@neshel-ui/animations/hover";

export default function H10Example() {
  return (
    <Hover preset={shine} options={{ angle: 110, duration: 800 }} asChild>
      <a
        href="#h10"
        className="rounded-xl border border-neshel-border bg-neshel-surface p-6 text-neshel-surface-foreground inline-block"
      >
        A glare crosses the card
      </a>
    </Hover>
  );
}
