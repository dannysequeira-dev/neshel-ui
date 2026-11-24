"use client";
import "@neshel-ui/animations/advanced.css";
import { TiltShift } from "@neshel-ui/animations/advanced";
import { useState } from "react";

export default function D11Example() {
  const [focus, setFocus] = useState(50);
  return (
    <div className="grid max-w-md gap-3">
      <TiltShift focus={focus / 100} className="rounded-xl">
        <div className="grid grid-cols-4 gap-2 bg-neshel-muted p-2">
          {Array.from({ length: 16 }, (_, index) => (
            <span
              key={index}
              className="rounded bg-neshel-primary p-3 text-neshel-primary-foreground"
            >
              {index + 1}
            </span>
          ))}
        </div>
      </TiltShift>
      <label className="grid gap-1">
        Focus
        <input
          type="range"
          min={10}
          max={90}
          value={focus}
          onChange={(event) => setFocus(Number(event.currentTarget.value))}
        />
      </label>
    </div>
  );
}
