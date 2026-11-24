"use client";
import "@neshel-ui/animations/cinematic.css";
import { CurtainReveal } from "@neshel-ui/animations/cinematic";
import { Button } from "@neshel-ui/components";
import { useState } from "react";

export default function C05Example() {
  const [open, setOpen] = useState(true);
  return (
    <div className="grid justify-items-start gap-3">
      <CurtainReveal
        open={open}
        pattern="curtain"
        className="rounded-xl border border-neshel-border bg-neshel-surface p-6 text-neshel-surface-foreground"
      >
        Curtain
      </CurtainReveal>
      <CurtainReveal
        open={open}
        pattern="shutter"
        slats={8}
        className="rounded-xl border border-neshel-border bg-neshel-surface p-6 text-neshel-surface-foreground"
      >
        Shutter with eight slats
      </CurtainReveal>
      <Button variant="outline" onClick={() => setOpen(!open)}>
        {open ? "Close" : "Open"}
      </Button>
    </div>
  );
}
