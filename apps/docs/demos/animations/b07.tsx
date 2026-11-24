"use client";
import "@neshel-ui/animations/ambient.css";
import { MeshGradient } from "@neshel-ui/animations/ambient";

export default function B07Example() {
  return (
    <MeshGradient
      colors={["#0f172a", "#1e3a8a", "#4c1d95", "#134e4a"]}
      className="rounded-xl p-12 text-white"
    >
      Radial points on a base colour
    </MeshGradient>
  );
}
