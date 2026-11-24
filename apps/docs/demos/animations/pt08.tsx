"use client";
import "@neshel-ui/animations/page-transitions.css";
import { PersistentElement, startPageTransition } from "@neshel-ui/animations/page-transitions";
import { Button } from "@neshel-ui/components";
import { useState } from "react";
import { flushSync } from "react-dom";

export default function PT08Example() {
  const [page, setPage] = useState(1);
  return (
    <div className="grid justify-items-start gap-3">
      <PersistentElement name="docs-player" asChild>
        <div className="rounded-lg bg-neshel-primary p-3 text-neshel-primary-foreground">
          Player: keeps its DOM and its state
        </div>
      </PersistentElement>
      <p className="rounded-xl border border-neshel-border bg-neshel-surface p-6 text-neshel-surface-foreground">
        Page {page}
      </p>
      <Button
        onClick={() =>
          startPageTransition(() => flushSync(() => setPage(page + 1)), { effect: "fade" })
        }
      >
        Change the page
      </Button>
    </div>
  );
}
