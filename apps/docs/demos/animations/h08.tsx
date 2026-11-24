"use client";
import "@neshel-ui/animations/hover.css";
import { Hover, mediaZoom } from "@neshel-ui/animations/hover";
import { picture } from "./picture";

export default function H08Example() {
  return (
    <Hover
      preset={mediaZoom}
      options={{ scale: 1.15 }}
      className="w-80 max-w-full overflow-hidden rounded-xl"
    >
      <img src={picture("Zoom", 210, 260)} alt="Blue gradient" width={640} height={400} />
    </Hover>
  );
}
