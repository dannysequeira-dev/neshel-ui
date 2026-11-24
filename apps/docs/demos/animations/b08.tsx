"use client";
import "@neshel-ui/animations/ambient.css";
import { FloatingShapes } from "@neshel-ui/animations/ambient";

export default function B08Example() {
  return (
    <FloatingShapes
      amplitude={16}
      rotate={8}
      className="flex gap-6 rounded-xl bg-neshel-muted p-12"
    >
      <div className="size-12 rounded-lg bg-neshel-primary" />
      <div className="size-12 rounded-full bg-neshel-accent" />
    </FloatingShapes>
  );
}
