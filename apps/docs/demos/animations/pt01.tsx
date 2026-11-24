"use client";
import "@neshel-ui/animations/page-transitions.css";
import { startPageTransition } from "@neshel-ui/animations/page-transitions";
import { Button } from "@neshel-ui/components";
import { useRef, useState } from "react";
import { flushSync } from "react-dom";

export default function PT01Example() {
  const ref = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  return (
    <div className="grid justify-items-start gap-3">
      <div
        ref={ref}
        className="rounded-xl border border-neshel-border bg-neshel-surface p-6 text-neshel-surface-foreground"
      >
        Page {page}
      </div>
      <Button
        onClick={() =>
          startPageTransition(() => flushSync(() => setPage(page + 1)), {
            effect: "fade",
            scope: ref.current ?? undefined,
          })
        }
      >
        Next page
      </Button>
    </div>
  );
}
