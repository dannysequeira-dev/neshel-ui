"use client";
import "@neshel-ui/animations/press.css";
import { CheckboxDraw } from "@neshel-ui/animations/press";
import { useState } from "react";

export default function P05Example() {
  const [done, setDone] = useState(false);
  return (
    <label className="flex w-fit items-center gap-2 rounded p-1 has-focus-visible:outline-2">
      <input
        type="checkbox"
        className="sr-only"
        checked={done}
        onChange={(event) => setDone(event.currentTarget.checked)}
      />
      <CheckboxDraw checked={done} /> Send me the summary
    </label>
  );
}
