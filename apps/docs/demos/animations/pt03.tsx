"use client";
import "@neshel-ui/animations/page-transitions.css";
import { startPageTransition } from "@neshel-ui/animations/page-transitions";
import { Button } from "@neshel-ui/components";
import { useRef, useState } from "react";
import { flushSync } from "react-dom";

export default function PT03Example() {
  const ref = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const go = (step: 1 | -1) =>
    startPageTransition(() => flushSync(() => setPage(page + step)), {
      effect: "slide",
      direction: step === 1 ? "forward" : "back",
      scope: ref.current ?? undefined,
    });
  return (
    <div className="grid justify-items-start gap-3">
      <div
        ref={ref}
        className="rounded-xl border border-neshel-border bg-neshel-surface p-6 text-neshel-surface-foreground"
      >
        Page {page}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => go(-1)}>
          Previous
        </Button>
        <Button onClick={() => go(1)}>Next</Button>
      </div>
    </div>
  );
}
