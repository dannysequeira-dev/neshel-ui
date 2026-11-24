"use client";
import "@neshel-ui/animations/layout.css";
import { Collapse } from "@neshel-ui/animations/layout";
import { useState } from "react";

export default function L06Example() {
  const [open, setOpen] = useState(false);
  return (
    <div className="max-w-sm rounded-xl border border-neshel-border">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="docs-l06"
        onClick={() => setOpen(!open)}
        className="w-full p-4 text-start"
      >
        Shipping
      </button>
      <Collapse open={open} id="docs-l06">
        <p className="px-4 pb-4">Orders leave the warehouse in one working day.</p>
      </Collapse>
    </div>
  );
}
