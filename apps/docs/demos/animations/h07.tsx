"use client";
import "@neshel-ui/animations/hover.css";
import { Hover, underline } from "@neshel-ui/animations/hover";

export default function H07Example() {
  return (
    <Hover preset={underline} options={{ thickness: 2, origin: "left" }} asChild>
      <a href="#h07" className="inline-block pb-1">
        Read the case study
      </a>
    </Hover>
  );
}
