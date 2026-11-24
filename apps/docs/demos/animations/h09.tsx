"use client";
import { Hover, parallax } from "@neshel-ui/animations/hover";

export default function H09Example() {
  return (
    <Hover
      preset={parallax}
      options={{ strength: 24 }}
      className="relative grid h-48 max-w-md place-items-center overflow-hidden rounded-xl bg-neshel-muted"
    >
      <div
        data-neshel-depth="-1"
        className="absolute size-32 rounded-full bg-neshel-accent"
        aria-hidden="true"
      />
      <p
        data-neshel-depth="1"
        className="rounded-xl border border-neshel-border bg-neshel-surface p-6 text-neshel-surface-foreground relative"
      >
        Two layers, two depths
      </p>
    </Hover>
  );
}
