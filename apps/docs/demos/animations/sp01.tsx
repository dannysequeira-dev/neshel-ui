"use client";
import "@neshel-ui/animations/scroll.css";
import { ScrollLayer, ScrollScene } from "@neshel-ui/animations/scroll";

export default function SP01Example() {
  return (
    <ScrollScene length={2} stageClassName="rounded-xl bg-neshel-muted">
      <ScrollLayer
        depth={0.4}
        distance={300}
        className="absolute left-[10%] top-[45%] size-24 rounded-xl bg-neshel-accent"
        aria-hidden="true"
      />
      <ScrollLayer
        depth={1.4}
        distance={300}
        className="rounded-xl border border-neshel-border bg-neshel-surface p-6 text-neshel-surface-foreground absolute left-[45%] top-[45%]"
      >
        Foreground layer
      </ScrollLayer>
    </ScrollScene>
  );
}
