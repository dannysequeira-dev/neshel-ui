"use client";
import "@neshel-ui/animations/hover.css";
import { CursorFollower } from "@neshel-ui/animations/hover";

export default function H11Example() {
  return (
    <CursorFollower
      size={48}
      className="grid h-40 max-w-md place-items-center rounded-xl bg-neshel-muted"
    >
      Move a mouse or pen here
    </CursorFollower>
  );
}
