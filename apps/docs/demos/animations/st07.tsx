"use client";
import { ScrollEffect, type StuckStateOptions, stuckState } from "@neshel-ui/animations/scroll";
import { useState } from "react";

export default function ST07Example() {
  const [stuck, setStuck] = useState(false);
  return (
    <div className="h-96">
      <ScrollEffect
        preset={stuckState}
        options={{ onChange: setStuck } satisfies StuckStateOptions}
        className="rounded-xl border border-neshel-border bg-neshel-surface p-6 text-neshel-surface-foreground sticky top-20"
      >
        {stuck ? "Stuck to the top" : "In normal flow"}
      </ScrollEffect>
    </div>
  );
}
