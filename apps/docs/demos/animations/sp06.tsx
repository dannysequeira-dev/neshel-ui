"use client";
import "@neshel-ui/animations/scroll.css";
import { ParallaxImage } from "@neshel-ui/animations/scroll";
import { picture } from "./picture";

export default function SP06Example() {
  return (
    <ParallaxImage amount={40} className="h-56 max-w-md rounded-xl">
      <img
        src={picture("Parallax", 20, 330)}
        alt="Warm gradient"
        width={640}
        height={400}
        className="h-full w-full object-cover"
      />
    </ParallaxImage>
  );
}
