"use client";
import "@neshel-ui/animations/feedback.css";
import { ProgressBar } from "@neshel-ui/animations/feedback";
import { Button } from "@neshel-ui/components";
import { useState } from "react";

export default function F03Example() {
  const [value, setValue] = useState(30);
  return (
    <div className="grid max-w-sm gap-4">
      <ProgressBar label="Preparing the export" />
      <ProgressBar label="Uploading files" value={value} valueText={`${value} of 100 files`} />
      <Button variant="outline" onClick={() => setValue(Math.min(100, value + 10))}>
        More progress
      </Button>
    </div>
  );
}
