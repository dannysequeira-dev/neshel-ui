"use client";
import "@neshel-ui/animations/feedback.css";
import { DotsPulse } from "@neshel-ui/animations/feedback";

export default function F04Example() {
  return (
    <p className="flex items-center gap-2">
      Connecting <DotsPulse label="Connecting" />
    </p>
  );
}
