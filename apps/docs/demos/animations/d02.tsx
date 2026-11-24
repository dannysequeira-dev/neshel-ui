"use client";
import "@neshel-ui/animations/advanced.css";
import { type CubeControl, CubeRotate } from "@neshel-ui/animations/advanced";
import { Button } from "@neshel-ui/components";
import { useRef } from "react";

export default function D02Example() {
  const cube = useRef<CubeControl | null>(null);
  return (
    <div className="grid justify-items-start gap-3">
      <CubeRotate controlRef={cube} className="h-36 w-56">
        {["One", "Two", "Three"].map((panel) => (
          <section
            key={panel}
            aria-label={`Panel ${panel}`}
            className="h-full w-full rounded-xl bg-neshel-primary p-4 text-neshel-primary-foreground"
          >
            Panel {panel}
          </section>
        ))}
      </CubeRotate>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => cube.current?.previous()}>
          Previous
        </Button>
        <Button variant="outline" onClick={() => cube.current?.next()}>
          Next
        </Button>
      </div>
    </div>
  );
}
