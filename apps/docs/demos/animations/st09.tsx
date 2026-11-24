"use client";
import { tilt3D } from "@neshel-ui/animations/hover";
import { type LazyEffectOptions, lazyEffect, ScrollEffect } from "@neshel-ui/animations/scroll";

export default function ST09Example() {
  return (
    <ScrollEffect
      preset={lazyEffect}
      options={{ preset: tilt3D, trigger: "lazy" } satisfies LazyEffectOptions}
      className="rounded-xl border border-neshel-border bg-neshel-surface p-6 text-neshel-surface-foreground w-64"
    >
      The tilt is attached only near the viewport and destroyed far from it.
    </ScrollEffect>
  );
}
