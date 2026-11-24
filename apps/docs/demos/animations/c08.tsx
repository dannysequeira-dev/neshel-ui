"use client";
import "@neshel-ui/animations/cinematic.css";
import { DepthOfField } from "@neshel-ui/animations/cinematic";
import { Button } from "@neshel-ui/components";
import { useState } from "react";

export default function C08Example() {
  const [focus, setFocus] = useState(-1);
  return (
    <div className="grid gap-3">
      <DepthOfField focus={focus} className="grid gap-2">
        {["Foreground", "Subject", "Background"].map((layer) => (
          <div
            key={layer}
            className="rounded-xl border border-neshel-border bg-neshel-surface p-6 text-neshel-surface-foreground"
          >
            {layer}
          </div>
        ))}
      </DepthOfField>
      <div className="flex flex-wrap gap-2">
        {["Foreground", "Subject", "Background"].map((layer, index) => (
          <Button key={layer} variant="outline" onClick={() => setFocus(index)}>
            {layer}
          </Button>
        ))}
        <Button variant="outline" onClick={() => setFocus(-1)}>
          All sharp
        </Button>
      </div>
    </div>
  );
}
