"use client";
import "@neshel-ui/animations/press.css";
import { ToggleMorph } from "@neshel-ui/animations/press";
import { useState } from "react";

export default function P04Example() {
  const [on, setOn] = useState(false);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label="Notifications"
      onClick={() => setOn(!on)}
      className="rounded-full p-1"
    >
      <ToggleMorph checked={on} />
    </button>
  );
}
