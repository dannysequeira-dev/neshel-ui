"use client";
import "@neshel-ui/animations/advanced.css";
import { CardFlip } from "@neshel-ui/animations/advanced";

const face =
  "grid h-full w-full content-between rounded-xl bg-neshel-primary p-4 text-neshel-primary-foreground";

export default function D01Example() {
  return (
    <CardFlip
      className="h-40 w-64"
      front={
        <div className={face}>
          <strong>Front</strong>
          <button type="button" data-neshel-flip-toggle>
            Show details
          </button>
        </div>
      }
      back={
        <div className={face}>
          <strong>Details</strong>
          <button type="button" data-neshel-flip-toggle>
            Back
          </button>
        </div>
      }
    />
  );
}
