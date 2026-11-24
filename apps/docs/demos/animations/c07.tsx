"use client";
import "@neshel-ui/animations/cinematic.css";
import { Spotlight } from "@neshel-ui/animations/cinematic";
import { Button } from "@neshel-ui/components";
import { useRef, useState } from "react";

export default function C07Example() {
  const steps = useRef<Array<HTMLLIElement | null>>([]);
  const [lit, setLit] = useState<number | null>(null);
  return (
    <div className="grid gap-3">
      <Spotlight
        target={lit === null ? null : steps.current[lit]}
        radius={60}
        className="rounded-xl border border-neshel-border bg-neshel-surface p-6 text-neshel-surface-foreground"
      >
        <ul className="flex gap-12">
          {["Plan", "Build", "Ship"].map((step, index) => (
            <li
              key={step}
              ref={(node) => {
                steps.current[index] = node;
              }}
            >
              {step}
            </li>
          ))}
        </ul>
      </Spotlight>
      <div className="flex gap-2">
        {[0, 1, 2].map((index) => (
          <Button key={index} variant="outline" onClick={() => setLit(index)}>
            Light {index + 1}
          </Button>
        ))}
        <Button variant="outline" onClick={() => setLit(null)}>
          Clear
        </Button>
      </div>
    </div>
  );
}
