"use client";
import { fadeUp } from "@neshel-ui/animations/entrance";
import { Presence } from "@neshel-ui/animations/layout";
import { Button } from "@neshel-ui/components";
import { useState } from "react";

export default function L08Example() {
  const [shown, setShown] = useState(true);
  return (
    <div className="grid min-h-36 content-start justify-items-start gap-3">
      <Button variant="outline" aria-pressed={shown} onClick={() => setShown(!shown)}>
        {shown ? "Remove" : "Add"}
      </Button>
      <Presence enter={fadeUp} exit={fadeUp}>
        {shown ? (
          <div
            key="card"
            className="rounded-xl border border-neshel-border bg-neshel-surface p-6 text-neshel-surface-foreground"
          >
            The exit runs before unmounting
          </div>
        ) : null}
      </Presence>
    </div>
  );
}
