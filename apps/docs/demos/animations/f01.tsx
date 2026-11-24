"use client";
import "@neshel-ui/animations/feedback.css";
import { Spinner } from "@neshel-ui/animations/feedback";

export default function F01Example() {
  return (
    <p role="status" className="flex items-center gap-2">
      <Spinner decorative /> Loading results…
    </p>
  );
}
