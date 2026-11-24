"use client";
import { usePathMorph } from "@neshel-ui/animations/svg";
import { Button } from "@neshel-ui/components";
import { useRef, useState } from "react";

const shapes = ["M10 50 C30 10 70 10 90 50", "M10 50 C30 90 70 90 90 50"];

export default function S02Example() {
  const path = useRef<SVGPathElement>(null);
  const morph = usePathMorph(path, { shapes });
  const [index, setIndex] = useState(0);
  return (
    <div className="grid justify-items-start gap-3">
      <svg viewBox="0 0 100 100" width={180} aria-hidden="true">
        <path
          ref={path}
          d="M10 50 C30 10 70 10 90 50"
          fill="none"
          stroke="currentColor"
          strokeWidth={4}
        />
      </svg>
      <Button
        variant="outline"
        onClick={() => {
          setIndex(1 - index);
          void morph.current?.to(1 - index);
        }}
      >
        Morph
      </Button>
    </div>
  );
}
