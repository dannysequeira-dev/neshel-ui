"use client";
import {
  ScrollEffect,
  type ScrubTransformOptions,
  scrubTransform,
} from "@neshel-ui/animations/scroll";

export default function SP02Example() {
  return (
    <ScrollEffect
      preset={scrubTransform}
      options={
        {
          from: { translateX: -120, rotateZ: -8, opacity: 0.3 },
          to: { translateX: 0, rotateZ: 0, opacity: 1 },
        } satisfies ScrubTransformOptions
      }
      className="rounded-xl border border-neshel-border bg-neshel-surface p-6 text-neshel-surface-foreground"
    >
      Scroll moves me; scrolling back reverses me.
    </ScrollEffect>
  );
}
