"use client";
import "@neshel-ui/animations/ambient.css";
import { PointerGlow } from "@neshel-ui/animations/ambient";

export default function B09Example() {
  return (
    <PointerGlow
      size={260}
      intensity={0.5}
      color="#38bdf8"
      className="rounded-xl bg-[#0b1020] p-12 text-white"
    >
      Move the pointer here
    </PointerGlow>
  );
}
