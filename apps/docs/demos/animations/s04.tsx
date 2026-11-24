"use client";
import "@neshel-ui/animations/svg.css";
import { MorphIcon, menuCloseShapes } from "@neshel-ui/animations/svg";
import { useState } from "react";

export default function S04Example() {
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      aria-label="Menu"
      aria-expanded={open}
      onClick={() => setOpen(!open)}
      className="grid size-12 place-items-center rounded-lg border border-neshel-border"
    >
      <MorphIcon shapes={menuCloseShapes} state={open ? "close" : "menu"} />
    </button>
  );
}
