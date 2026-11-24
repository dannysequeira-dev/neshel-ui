"use client";
import "@neshel-ui/animations/ambient.css";
import { Particles } from "@neshel-ui/animations/ambient";

export default function B04Example() {
  return (
    <Particles
      density={14}
      links
      seed={7}
      color="#cbd5ff"
      className="rounded-xl bg-[#0b1020] text-white"
    >
      <div className="p-12">Seeded, capped and paused off screen</div>
    </Particles>
  );
}
