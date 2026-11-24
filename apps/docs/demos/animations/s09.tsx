"use client";
import { useDashFlow } from "@neshel-ui/animations/svg";
import { Button } from "@neshel-ui/components";
import { useRef } from "react";

export default function S09Example() {
  const path = useRef<SVGPathElement>(null);
  const flow = useDashFlow(path, { trigger: "manual" });
  return (
    <div className="grid justify-items-start gap-3">
      <svg viewBox="0 0 120 40" width={260} aria-hidden="true">
        <path
          ref={path}
          d="M5 20H115"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeDasharray="6 4"
        />
      </svg>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => flow.current?.play()}>
          Flow
        </Button>
        <Button variant="outline" onClick={() => flow.current?.pause()}>
          Pause
        </Button>
      </div>
    </div>
  );
}
