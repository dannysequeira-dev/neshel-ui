"use client";
import { usePathDraw } from "@neshel-ui/animations/svg";
import { Button } from "@neshel-ui/components";
import { useRef } from "react";

export default function S01Example() {
  const path = useRef<SVGPathElement>(null);
  const draw = usePathDraw(path, { trigger: "mount" });
  return (
    <div className="grid justify-items-start gap-3">
      <svg viewBox="0 0 100 60" width={240} aria-hidden="true">
        <path
          ref={path}
          d="M5 50 Q25 0 50 30 T95 10"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
        />
      </svg>
      <Button
        variant="outline"
        onClick={() => {
          draw.current?.seek(0);
          draw.current?.play();
        }}
      >
        Draw again
      </Button>
    </div>
  );
}
