"use client";
import "@neshel-ui/animations/feedback.css";
import { PendingText } from "@neshel-ui/animations/feedback";
import { Button } from "@neshel-ui/components";
import { useState } from "react";

export default function F10Example() {
  const [pending, setPending] = useState(true);
  return (
    <div className="flex items-center gap-4">
      <PendingText pending={pending}>Saving your changes</PendingText>
      <Button variant="outline" onClick={() => setPending(!pending)}>
        Toggle
      </Button>
    </div>
  );
}
