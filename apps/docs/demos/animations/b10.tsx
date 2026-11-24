"use client";
import "@neshel-ui/animations/ambient.css";
import { AmbientMotionToggle, Waves } from "@neshel-ui/animations/ambient";

export default function B10Example() {
  return (
    <div className="grid justify-items-start gap-3">
      <Waves
        layers={3}
        amplitude={18}
        colors={["#1e3a8a", "#1d4ed8", "#0369a1"]}
        className="h-48 w-full rounded-xl bg-[#0b1020] p-8 text-white"
      >
        Waves at the bottom edge
      </Waves>
      <AmbientMotionToggle />
    </div>
  );
}
