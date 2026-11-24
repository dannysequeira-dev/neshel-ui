"use client";
import "@neshel-ui/animations/svg.css";
import { useTurbulence } from "@neshel-ui/animations/svg";
import { Button } from "@neshel-ui/components";
import { useRef } from "react";

export default function S07Example() {
  const badge = useRef<SVGGElement>(null);
  const wobble = useTurbulence(badge, { amplitude: 8, trigger: "manual" });
  return (
    <div className="grid justify-items-start gap-3">
      <svg viewBox="0 0 100 50" width={240} aria-hidden="true">
        <g ref={badge}>
          <rect x="20" y="10" width="60" height="30" rx="6" fill="currentColor" />
        </g>
      </svg>
      <Button
        variant="outline"
        onClick={() => {
          wobble.current?.stop();
          wobble.current?.play();
        }}
      >
        Wobble
      </Button>
    </div>
  );
}
