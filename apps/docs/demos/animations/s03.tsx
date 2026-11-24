"use client";
import { useMotionPath } from "@neshel-ui/animations/svg";
import { Button } from "@neshel-ui/components";
import { useRef } from "react";

export default function S03Example() {
  const dot = useRef<HTMLDivElement>(null);
  const motion = useMotionPath(dot, { path: "M0 0 C80 -60 160 60 240 0", trigger: "manual" });
  return (
    <div className="grid justify-items-start gap-3">
      <div className="relative h-24 w-72">
        <div ref={dot} className="absolute left-2 top-12 size-4 rounded-full bg-neshel-primary" />
      </div>
      <Button
        variant="outline"
        onClick={() => {
          motion.current?.seek(0);
          motion.current?.play();
        }}
      >
        Travel
      </Button>
    </div>
  );
}
