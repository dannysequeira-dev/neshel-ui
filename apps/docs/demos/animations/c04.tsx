"use client";
import "@neshel-ui/animations/cinematic.css";
import { SplitReveal } from "@neshel-ui/animations/cinematic";
import { Button } from "@neshel-ui/components";
import { useState } from "react";

export default function C04Example() {
  const [open, setOpen] = useState(true);
  return (
    <div className="grid justify-items-start gap-3">
      <SplitReveal
        open={open}
        direction="x"
        className="rounded-xl border border-neshel-border bg-neshel-surface p-6 text-neshel-surface-foreground"
      >
        The cover opens in two halves
      </SplitReveal>
      <Button variant="outline" onClick={() => setOpen(!open)}>
        {open ? "Cover" : "Open"}
      </Button>
    </div>
  );
}
