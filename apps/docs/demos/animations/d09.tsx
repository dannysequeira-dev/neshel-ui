"use client";
import "@neshel-ui/animations/advanced.css";
import { type GridControl, PerspectiveGrid } from "@neshel-ui/animations/advanced";
import { Button } from "@neshel-ui/components";
import { useRef } from "react";

export default function D09Example() {
  const grid = useRef<GridControl | null>(null);
  return (
    <div className="grid justify-items-start gap-3">
      <PerspectiveGrid
        controlRef={grid}
        color="#a855f7"
        className="h-56 w-full rounded-xl bg-[#0b1020] p-6 text-white"
      >
        Horizon
      </PerspectiveGrid>
      <Button variant="outline" onClick={() => grid.current?.play()}>
        Run again
      </Button>
    </div>
  );
}
