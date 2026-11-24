"use client";
import { useGradientStops } from "@neshel-ui/animations/svg";
import { Button } from "@neshel-ui/components";
import { useRef } from "react";

export default function S05Example() {
  const gradient = useRef<SVGLinearGradientElement>(null);
  const stops = useGradientStops(gradient, {
    stops: [{ color: ["#193767", "#7c2d12"] }, { color: ["#b45309", "#0f766e"] }],
    repeat: 1,
  });
  return (
    <div className="grid justify-items-start gap-3">
      <svg viewBox="0 0 100 30" width={260} aria-hidden="true">
        <defs>
          <linearGradient id="docs-s05" ref={gradient}>
            <stop offset="0" stopColor="#193767" />
            <stop offset="1" stopColor="#b45309" />
          </linearGradient>
        </defs>
        <rect width="100" height="30" rx="6" fill="url(#docs-s05)" />
      </svg>
      <Button
        variant="outline"
        onClick={() => {
          stops.current?.stop();
          stops.current?.play();
        }}
      >
        Play
      </Button>
    </div>
  );
}
