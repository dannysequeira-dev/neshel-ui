"use client";
import "@neshel-ui/animations/hover.css";
import { Tilt3D } from "@neshel-ui/animations/hover";

export default function H03Example() {
  return (
    <Tilt3D maxTilt={12} scale={1.03} asChild>
      <a
        href="#h03"
        className="rounded-xl border border-neshel-border bg-neshel-surface p-6 text-neshel-surface-foreground inline-block w-64"
      >
        The pressed corner goes inwards; reverse inverts it.
      </a>
    </Tilt3D>
  );
}
