"use client";
import {
  type ScrollColorShiftOptions,
  ScrollEffect,
  scrollColorShift,
} from "@neshel-ui/animations/scroll";

export default function SP08Example() {
  return (
    <ScrollEffect
      preset={scrollColorShift}
      options={{ stops: ["#193767", "#7c2d12"] } satisfies ScrollColorShiftOptions}
      className="rounded-xl p-8 text-white"
      style={{ background: "var(--neshel-scroll-color, #193767)" }}
    >
      The background follows the scroll position
    </ScrollEffect>
  );
}
