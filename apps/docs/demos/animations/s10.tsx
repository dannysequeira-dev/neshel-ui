"use client";
import "@neshel-ui/animations/svg.css";
import { SuccessCheck } from "@neshel-ui/animations/svg";
import { Button } from "@neshel-ui/components";
import { useState } from "react";

export default function S10Example() {
  const [run, setRun] = useState(0);
  return (
    <div className="grid justify-items-start gap-3">
      <div className="flex items-center gap-2">
        <SuccessCheck key={run} trigger="mount" />
        <span role="status">Payment received</span>
      </div>
      <Button variant="outline" onClick={() => setRun(run + 1)}>
        Replay
      </Button>
    </div>
  );
}
