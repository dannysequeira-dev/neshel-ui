"use client";
import "@neshel-ui/animations/gpu.css";
import { DisplacementHover } from "@neshel-ui/animations/gpu";
import { picture } from "./picture";

export default function D08Example() {
  return (
    <DisplacementHover className="w-80 max-w-full rounded-xl">
      <img src={picture("Displace", 20, 330)} alt="Warm gradient" width={640} height={400} />
    </DisplacementHover>
  );
}
