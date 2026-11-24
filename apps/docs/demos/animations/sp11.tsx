"use client";
import { ScrollEffect, type VelocitySkewOptions, velocitySkew } from "@neshel-ui/animations/scroll";

export default function SP11Example() {
  return (
    <ScrollEffect
      preset={velocitySkew}
      options={{ max: 8 } satisfies VelocitySkewOptions}
      className="rounded-xl border border-neshel-border bg-neshel-surface p-6 text-neshel-surface-foreground"
    >
      Scroll fast: I lean with the velocity and spring back.
    </ScrollEffect>
  );
}
