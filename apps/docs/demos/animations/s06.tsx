"use client";
import { useChartDraw } from "@neshel-ui/animations/svg";
import { Button } from "@neshel-ui/components";
import { useRef } from "react";

const data = [
  [5, 50],
  [30, 30],
  [55, 38],
  [80, 12],
  [95, 18],
] as const;

export default function S06Example() {
  const chart = useRef<SVGSVGElement>(null);
  const draw = useChartDraw(chart, { lines: "path", points: "circle", trigger: "mount" });
  return (
    <div className="grid justify-items-start gap-3">
      <svg
        ref={chart}
        viewBox="0 0 100 60"
        width={260}
        role="img"
        aria-label="Sales rise from 10 to 42 in five weeks"
      >
        <path
          d={`M${data.map((point) => point.join(" ")).join("L")}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        />
        {data.map(([x, y]) => (
          <circle key={x} cx={x} cy={y} r={2.5} fill="currentColor" />
        ))}
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
