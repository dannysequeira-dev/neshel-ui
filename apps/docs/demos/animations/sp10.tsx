"use client";
import { ScrollScene } from "@neshel-ui/animations/scroll";

export default function SP10Example() {
  return (
    <ScrollScene
      length={2}
      smooth
      stageClassName="grid place-items-center rounded-xl bg-neshel-muted"
    >
      <div className="rounded-xl border border-neshel-border bg-neshel-surface p-6 text-neshel-surface-foreground">
        <p>The same progress through a spring</p>
        <span
          aria-hidden="true"
          className="mt-3 block h-2 origin-left bg-neshel-primary"
          style={{ transform: "scaleX(var(--neshel-scene-progress, 0))" }}
        />
      </div>
    </ScrollScene>
  );
}
