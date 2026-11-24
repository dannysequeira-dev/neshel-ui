"use client";
import "@neshel-ui/animations/ambient.css";
import { Starfield } from "@neshel-ui/animations/ambient";

export default function B05Example() {
  return (
    <Starfield mode="drift" twinkle={0.4} className="rounded-xl bg-[#020617] text-white">
      <div className="p-12">Depth layers on one canvas</div>
    </Starfield>
  );
}
