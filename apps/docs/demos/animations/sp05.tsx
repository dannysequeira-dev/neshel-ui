"use client";
import "@neshel-ui/animations/scroll.css";
import { ScrollScene } from "@neshel-ui/animations/scroll";

export default function SP05Example() {
  return (
    <ScrollScene length={2} stageClassName="grid place-items-center rounded-xl bg-neshel-muted">
      <div className="rounded-xl border border-neshel-border bg-neshel-surface p-6 text-neshel-surface-foreground">
        <p>Pinned by CSS sticky while the page scrolls</p>
        <span
          aria-hidden="true"
          className="mt-3 block h-2 origin-left bg-neshel-primary"
          style={{ transform: "scaleX(var(--neshel-scene-progress, 0))" }}
        />
      </div>
    </ScrollScene>
  );
}
