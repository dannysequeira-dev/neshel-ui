"use client";
import "@neshel-ui/animations/ambient.css";
import { GradientShift } from "@neshel-ui/animations/ambient";

export default function B01Example() {
  return (
    <GradientShift
      colors={["#193767", "#4c1d95", "#7c2d12"]}
      className="rounded-xl p-12 text-white"
    >
      Content stays above the decoration
    </GradientShift>
  );
}
