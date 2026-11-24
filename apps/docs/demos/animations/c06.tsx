"use client";
import "@neshel-ui/animations/cinematic.css";
import { TitleSequence } from "@neshel-ui/animations/cinematic";
import { fadeUp } from "@neshel-ui/animations/entrance";
import { Button } from "@neshel-ui/components";
import { useState } from "react";

export default function C06Example() {
  const [run, setRun] = useState(0);
  return (
    <div className="grid justify-items-start gap-3">
      <TitleSequence effect={fadeUp} interval={180} replay={run} className="p-4">
        <p className="text-2xl font-semibold">Rooted in faith</p>
        <p>Built with hope</p>
      </TitleSequence>
      <Button variant="outline" onClick={() => setRun(run + 1)}>
        Replay
      </Button>
    </div>
  );
}
