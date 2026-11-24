"use client";
import "@neshel-ui/animations/ambient.css";
import { Aurora } from "@neshel-ui/animations/ambient";

export default function B02Example() {
  return (
    <Aurora blobs={3} intensity={0.6} className="rounded-xl bg-[#0b1020] p-12 text-white">
      Soft gradients, no blur filter
    </Aurora>
  );
}
