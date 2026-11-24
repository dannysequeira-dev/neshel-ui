"use client";
import "@neshel-ui/animations/feedback.css";
import { SuccessMark } from "@neshel-ui/animations/feedback";
import { Button } from "@neshel-ui/components";
import { useState } from "react";

export default function F05Example() {
  const [saved, setSaved] = useState(false);
  return (
    <div className="flex items-center gap-3">
      <SuccessMark show={saved} />
      <span role="status">{saved ? "Saved" : ""}</span>
      <Button variant="outline" onClick={() => setSaved(!saved)}>
        {saved ? "Reset" : "Save"}
      </Button>
    </div>
  );
}
